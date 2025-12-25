// popup.js - Extension popup UI and consent management

// Initialize consent toggle
async function initConsentToggle() {
  const toggle = document.getElementById('consentToggle');
  const scanBtn = document.getElementById('scanBtn');

  // Check current consent status
  try {
    const consent = await chrome.storage.local.get('dataCollectionConsent');
    const hasConsent = consent.dataCollectionConsent === true;

    // Update toggle UI
    if (hasConsent) {
      toggle.classList.add('active');
      scanBtn.disabled = false;
    } else {
      toggle.classList.remove('active');
      scanBtn.disabled = true;
    }

    // Toggle click handler
    toggle.addEventListener('click', async () => {
      const newConsent = !hasConsent;

      try {
        await chrome.storage.local.set({
          dataCollectionConsent: newConsent,
          consentVersion: 1,
          consentDate: new Date().toISOString()
        });

        // Update UI
        if (newConsent) {
          toggle.classList.add('active');
          scanBtn.disabled = false;
          updateStatus('Data collection enabled. Prices will be tracked.', 'success');
        } else {
          toggle.classList.remove('active');
          scanBtn.disabled = true;
          updateStatus('Data collection disabled.', 'error');
        }
      } catch (error) {
        console.error('Error updating consent:', error);
        updateStatus('Error updating consent.', 'error');
      }
    });
  } catch (error) {
    console.error('Error checking consent:', error);
    updateStatus('Error loading consent status.', 'error');
  }
}

// Update status message
function updateStatus(message, type = '') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = type ? `status-${type}` : '';
}

// Manual scan button
document.getElementById('scanBtn').addEventListener('click', async () => {
  // Check consent first
  try {
    const consent = await chrome.storage.local.get('dataCollectionConsent');
    if (!consent.dataCollectionConsent) {
      updateStatus('Please enable data collection first.', 'error');
      return;
    }
  } catch (error) {
    updateStatus('Error checking consent.', 'error');
    return;
  }

  updateStatus('Scanning product page...', '');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to trigger scan
    chrome.tabs.sendMessage(tab.id, { action: 'captureProducts' }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (response && response.status === 'success') {
        updateStatus(`✓ Scanned ${response.productCount} product(s)`, 'success');
      } else if (response && response.status === 'error') {
        updateStatus('Error: ' + (response.message || 'Unknown error'), 'error');
      } else {
        updateStatus('No product found on this page.', 'error');
      }
    });
  } catch (error) {
    console.error('Error scanning:', error);
    updateStatus('Error scanning page.', 'error');
  }
});

// Privacy policy link
document.getElementById('privacyLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://sepyap.com/privacy' });
});

// Get current page product info
async function loadCurrentProduct() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to get current product
    chrome.tabs.sendMessage(tab.id, { action: 'getCurrentProduct' }, (response) => {
      if (chrome.runtime.lastError) {
        // Not a supported page or content script not ready
        document.getElementById('productInfo').style.display = 'none';
        return;
      }

      if (response && response.product) {
        const product = response.product;
        const productInfo = document.getElementById('productInfo');
        const productTitle = document.getElementById('productTitle');
        const productPrice = document.getElementById('productPrice');

        productTitle.textContent = product.title || 'Product';
        productPrice.textContent = product.price ? `${product.price} TL` : '';

        productInfo.style.display = 'block';

        // Store product info for buttons
        window.currentProduct = product;
      } else {
        document.getElementById('productInfo').style.display = 'none';
      }
    });
  } catch (error) {
    console.error('Error loading current product:', error);
  }
}

// Compare prices button
document.getElementById('compareBtn').addEventListener('click', async () => {
  if (!window.currentProduct) return;

  // Open web app search page
  const searchUrl = 'https://sepyap.com/search?q=' + encodeURIComponent(window.currentProduct.title);
  chrome.tabs.create({ url: searchUrl });
});

// Watch button
document.getElementById('watchBtn').addEventListener('click', async () => {
  if (!window.currentProduct) return;

  // For now, just open watchlist page
  // In future, could directly add to watchlist via API
  chrome.tabs.create({ url: 'https://sepyap.com/watchlist' });
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initConsentToggle();
  loadCurrentProduct();
});

// Also initialize immediately (in case DOMContentLoaded already fired)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initConsentToggle();
    loadCurrentProduct();
  });
} else {
  initConsentToggle();
  loadCurrentProduct();
}
