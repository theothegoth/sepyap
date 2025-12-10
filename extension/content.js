// content.js - Main content script that uses market-specific parsers


const AUTO_SCAN_DELAY = 3000; // Increased delay to reduce load
const SCROLL_SCAN_DELAY = 5000; // Longer delay for scroll-triggered scans
const MIN_SCAN_INTERVAL = 10000; // Minimum time between scans (10 seconds)
let scanTimeout;
let lastScanTime = 0;

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

    
    
    
    // Log first few products for debugging
    if (products.length > 0) {
      
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
  
  
  
  chrome.runtime.sendMessage({
    action: 'sendProductsToBackend',
    products: productsArray
  }, (response) => {
    if (response && response.status === 'success') {
      
    } else {
      console.error('[GroceryMatcher] Failed to send:', response);
    }
  });
}

/**
 * Run scan (checks consent before scanning)
 */
async function runScan() {
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
  
  // Extract products
  const products = extractProducts();
  if (products.length > 0) {
    await sendData(products);
  } else {
    
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
