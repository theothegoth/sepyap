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
      url.hostname === 'sepyap.com' ||
      url.hostname === 'www.sepyap.com';
    
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
    // Backend supports up to 2000 products per batch
    const BATCH_SIZE = 2000;
    
    // Split products into batches if needed (for very large pages)
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
        // Create AbortController for timeout (5 minutes for large batches)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

        const response = await fetch('http://127.0.0.1:3005/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

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
        if (error.name === 'AbortError') {
          console.error(`Timeout sending batch ${batchIndex + 1} (${batch.length} products)`);
        } else {
          console.error(`Error sending batch ${batchIndex + 1}:`, error);
        }
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
