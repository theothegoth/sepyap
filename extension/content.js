// content.js - Main content script that uses market-specific parsers


const AUTO_SCAN_DELAY = 3000; // Increased delay to reduce load
const SCROLL_SCAN_DELAY = 5000; // Longer delay for scroll-triggered scans
const MIN_SCAN_INTERVAL = 10000; // Minimum time between scans (10 seconds)
let scanTimeout;
let lastScanTime = 0;
let isScanning = false; // Flag to prevent multiple simultaneous scans

/**
 * Extract products from the current page
 * Returns array of products
 */
function extractProducts() {
  const parser = getParser();
  
  if (!parser) {
    
    return [];
  }

  const pageType = parser.detectPageType();
  

  try {
    const cards = parser.getProductCards();
    

    const products = [];
    const seen = new Set();
    let debugStats = { total: 0, success: 0, failed: 0 };

    for (const card of cards) {
      debugStats.total++;
      
      try {
        const product = parser.extractProductData(card);
        
        if (product) {
          // Deduplicate by title + price + URL
          const key = `${product.title}_${product.price}_${product.product_url}`;
          if (!seen.has(key)) {
            seen.add(key);
            products.push(product);
            debugStats.success++;
          } else {
            
          }
        } else {
          debugStats.failed++;
        }
      } catch (error) {
        console.error(`[GroceryMatcher] Error extracting product from card:`, error);
        debugStats.failed++;
      }
    }
    
    // Log extraction stats
    console.log(`[GroceryMatcher] Extraction complete:`, {
      totalCards: cards.length,
      successful: debugStats.success,
      failed: debugStats.failed,
      uniqueProducts: products.length
    });
    
    // Log first few products for debugging (with full structure)
    if (products.length > 0) {
      console.log(`[GroceryMatcher] Sample products:`, products.slice(0, 3).map(p => ({
        title: p.title?.substring(0, 50),
        price: p.price,
        url: p.product_url?.substring(0, 60)
      })));
      // Log full structure of first product for debugging
      console.log(`[GroceryMatcher] Full structure of first product:`, JSON.stringify(products[0], null, 2));
    }

    return products;
  } catch (error) {
    console.error(`[GroceryMatcher] Error during extraction:`, error);
    return [];
  }
}


/**
 * Send product data to backend (with consent check)
 */
async function sendData(products) {
  if (!products || (Array.isArray(products) && products.length === 0)) {
    
    return;
  }

  // Check user consent before sending data
  try {
    const consent = await chrome.storage.local.get('dataCollectionConsent');
    if (!consent.dataCollectionConsent) {
      
      return;
    }
  } catch (error) {
    console.error('[GroceryMatcher] Error checking consent:', error);
    return; // Don't send data if consent check fails
  }

  // Normalize to array if single product
  const productsArray = Array.isArray(products) ? products : [products];
  
  console.log(`[GroceryMatcher] Sending ${productsArray.length} products to backend...`);
  
  // Convert callback to Promise to properly await completion
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'sendProductsToBackend',
      products: productsArray
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[GroceryMatcher] Runtime error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response && response.status === 'success') {
        console.log(`[GroceryMatcher] Successfully sent to backend:`, {
          created: response.data?.created || 0,
          updated: response.data?.updated || 0,
          errors: response.data?.errors || 0,
          batches: response.data?.batches || 1
        });
        resolve(response);
      } else {
        console.error('[GroceryMatcher] Failed to send:', response);
        reject(new Error(response?.message || 'Unknown error'));
      }
    });
  });
}

/**
 * Run scan (checks consent before scanning)
 */
async function runScan() {
  // Prevent multiple simultaneous scans
  if (isScanning) {
    console.log(`[GroceryMatcher] Scan already in progress, skipping...`);
    return;
  }
  
  // Check consent first
  try {
    const consent = await chrome.storage.local.get('dataCollectionConsent');
    if (!consent.dataCollectionConsent) {
      
      return;
    }
  } catch (error) {
    console.error('[GroceryMatcher] Error checking consent:', error);
    return;
  }

  // Rate limiting: Don't scan too frequently
  const now = Date.now();
  const timeSinceLastScan = now - lastScanTime;
  
  if (timeSinceLastScan < MIN_SCAN_INTERVAL) {
    
    return;
  }
  
  lastScanTime = now;
  isScanning = true; // Set flag to prevent concurrent scans
  
  try {
    console.log(`[GroceryMatcher] Starting scan...`);
    
    // Extract products
    const products = extractProducts();
    if (products.length > 0) {
      await sendData(products);
    } else {
      console.log(`[GroceryMatcher] No products found on this page`);
    }
  } finally {
    isScanning = false; // Reset flag when scan completes
  }
}

// Auto-scan on page load
window.addEventListener('load', () => {
  
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(runScan, AUTO_SCAN_DELAY);
});

// Auto-scan on scroll (debounced with longer delay)
let lastScrollTime = 0;
window.addEventListener('scroll', () => {
  const now = Date.now();
  // Only scan on scroll if enough time has passed (reduce load)
  if (now - lastScrollTime > 2000) {
    lastScrollTime = now;
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      
      runScan();
    }, SCROLL_SCAN_DELAY);
  }
});

// Manual capture via popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'captureProducts') {
    
    
    // Check consent
    try {
      const consent = await chrome.storage.local.get('dataCollectionConsent');
      if (!consent.dataCollectionConsent) {
        sendResponse({ status: 'error', message: 'Data collection disabled. Enable in popup.' });
        return;
      }
    } catch (error) {
      sendResponse({ status: 'error', message: 'Error checking consent' });
      return;
    }
    
    // Extract products
    const products = extractProducts();
    if (products.length > 0) {
      await sendData(products);
      sendResponse({ status: 'success', productCount: products.length });
    } else {
      sendResponse({ status: 'error', message: 'No products found on this page' });
    }
  }

  if (request.action === 'getCurrentProduct') {
    // Get first product from current page for popup display
    const parser = getParser();
    if (!parser) {
      sendResponse({ product: null });
      return;
    }

    try {
      const cards = parser.getProductCards();
      if (cards.length > 0) {
        const product = parser.extractProductData(cards[0]);
        sendResponse({ product: product || null });
      } else {
        sendResponse({ product: null });
      }
    } catch (error) {
      console.error('[GroceryMatcher] Error getting current product:', error);
      sendResponse({ product: null });
    }
  }
  
  // Return true to indicate async response
  return true;
});
