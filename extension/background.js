// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  
});

// Inject proof script into SepYap website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = new URL(tab.url);
    const isSepYapSite = 
      (url.hostname === 'localhost' && url.port === '3001') ||
      (url.hostname === '127.0.0.1' && url.port === '3001') ||
      url.hostname === 'grocerymatcher.com' ||
      url.hostname === 'www.grocerymatcher.com';
    
    if (isSepYapSite) {
      // Inject proof script programmatically
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['inject-proof.js']
      }).catch(err => {
        // Ignore errors (might be because page isn't ready yet)
        
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendProductsToBackend') {
    

    const market = request.products[0]?.market || 'Unknown';
    const BATCH_SIZE = 500; // Send 500 products at a time to avoid payload size limits
    
    // Split products into batches
    const batches = [];
    for (let i = 0; i < request.products.length; i += BATCH_SIZE) {
      batches.push(request.products.slice(i, i + BATCH_SIZE));
    }

    

    // Send all batches sequentially
    let completedBatches = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    const sendBatch = async (batchIndex) => {
      if (batchIndex >= batches.length) {
        // All batches sent
        
        sendResponse({ 
          status: 'success', 
          data: { 
            created: totalCreated, 
            updated: totalUpdated, 
            errors: totalErrors,
            batches: batches.length
          } 
        });
        return;
      }

      const batch = batches[batchIndex];
      const payload = {
        market: market,
        items: batch
      };

      try {
        const response = await fetch('http://127.0.0.1:3005/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        
        if (data.result) {
          totalCreated += data.result.created || 0;
          totalUpdated += data.result.updated || 0;
          totalErrors += data.result.errors || 0;
        }

        completedBatches++;
        // Send next batch after a small delay to avoid overwhelming the server
        setTimeout(() => sendBatch(batchIndex + 1), 100);
      } catch (error) {
        console.error(`Error sending batch ${batchIndex + 1}:`, error);
        totalErrors += batch.length;
        // Continue with next batch even if this one failed
        setTimeout(() => sendBatch(batchIndex + 1), 100);
      }
    };

    // Start sending batches
    sendBatch(0);

    return true; // Keep the message channel open for async response
  }
});
