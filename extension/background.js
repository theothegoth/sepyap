// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SepYap] Uzantı yüklendi.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendProductsToBackend') {
    console.log(`[SepYap Background] Received ${request.products.length} products to send`);

    const market = request.products[0]?.market || 'Unknown';
    // Backend supports up to 2000 products per batch, but we use smaller batches to avoid timeout
    const BATCH_SIZE = 50; // Even smaller batches to avoid 504 Gateway Timeout

    // Split products into batches if needed (for very large pages)
    const batches = [];
    for (let i = 0; i < request.products.length; i += BATCH_SIZE) {
      batches.push(request.products.slice(i, i + BATCH_SIZE));
    }

    let completedBatches = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Define sendBatch function *inside* this scope to access variables like batches, sendResponse, etc.
    const sendBatch = async (batchIndex, retryCount = 0, backendUrl) => {
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

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds

      try {
        console.log(`[SepYap Background] Sending batch ${batchIndex + 1}/${batches.length} (${batch.length} products) to ${backendUrl}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`);

        // Log first product in batch for debugging
        if (batch.length > 0) {
          console.log(`[SepYap Background] First product in batch:`, JSON.stringify(batch[0], null, 2));
        }

        // Create AbortController for timeout (10 minutes for large batches)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes

        // Log request details before sending
        console.log(`[SepYap Background] Request details:`, {
          url: backendUrl,
          method: 'POST',
          origin: 'chrome-extension://' + chrome.runtime.id,
          payloadSize: JSON.stringify(payload).length,
          productCount: batch.length
        });

        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          // Explicitly set mode to cors (though extensions don't need it)
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Retry on 504 Gateway Timeout or 503 Service Unavailable
          if ((response.status === 504 || response.status === 503) && retryCount < MAX_RETRIES) {
            console.warn(`[SepYap Background] Batch ${batchIndex + 1} failed with ${response.status}, retrying in ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1))); // Exponential backoff
            return sendBatch(batchIndex, retryCount + 1, backendUrl); // Pass backendUrl
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Log full response for debugging
        console.log(`[SepYap Background] Batch ${batchIndex + 1} response:`, JSON.stringify(data, null, 2));

        // Log response structure for debugging
        console.log(`[SepYap Background] Batch ${batchIndex + 1} response structure:`, {
          hasResult: !!data.result,
          hasSuccess: !!data.success,
          resultKeys: data.result ? Object.keys(data.result) : [],
          dataKeys: Object.keys(data)
        });

        if (data.result) {
          // Backend returns createdCount, updatedCount, not created, updated
          const created = data.result.createdCount || data.result.created || 0;
          const updated = data.result.updatedCount || data.result.updated || 0;
          const errors = data.result.errors || 0;

          console.log(`[SepYap Background] Batch ${batchIndex + 1} parsed: created=${created}, updated=${updated}, errors=${errors}`);

          totalCreated += created;
          totalUpdated += updated;
          totalErrors += errors;

          // Log error details if any
          if (errors > 0 && data.result.errorDetails) {
            console.error(`[SepYap Background] Batch ${batchIndex + 1} errors:`, data.result.errorDetails);
          }
        } else if (data.error || data.message) {
          console.error(`[SepYap Background] Batch ${batchIndex + 1} error response:`, data);
          totalErrors += batch.length;
        } else {
          // No result and no error - this shouldn't happen
          console.warn(`[SepYap Background] Batch ${batchIndex + 1} unexpected response format:`, data);
          totalErrors += batch.length;
        }

        completedBatches++;
        // Send next batch after a delay to avoid overwhelming the server and prevent timeout
        // Increased delay to give backend more time to process each batch
        setTimeout(() => sendBatch(batchIndex + 1, 0, backendUrl), 500); // 500ms delay between batches
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Timeout sending batch ${batchIndex + 1} (${batch.length} products)`);
        } else {
          console.error(`Error sending batch ${batchIndex + 1}:`, error);
        }
        totalErrors += batch.length;
        // Continue with next batch even if this one failed
        // Increased delay to give backend more time to recover
        setTimeout(() => sendBatch(batchIndex + 1, 0, backendUrl), 1000); // 1 second delay after error
      }
    };

    // Determine backend URL based on environment
    // 1. Check if we have a saved custom backend URL (learned from visiting the site)
    // 2. Check if we're on localhost
    // 3. Default to production

    chrome.storage.local.get(['customBackendUrl'], (result) => {
      let backendUrl = result.customBackendUrl || 'https://api.sepyap.com/api/ingest';

      // Check if we're on localhost (for development)
      if (sender && sender.tab && sender.tab.url) {
        try {
          const url = new URL(sender.tab.url);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            // For localhost, we might still want to use the specific dev port
            backendUrl = 'http://127.0.0.1:3005/api/ingest';
          }
        } catch (e) { }
      }

      // Ensure /api/ingest suffix
      if (backendUrl && !backendUrl.endsWith('/api/ingest')) {
        backendUrl = backendUrl.replace(/\/$/, '') + '/api/ingest';
      }

      // Start sending batches with the determined backendUrl
      sendBatch(0, 0, backendUrl);
    });

    return true; // Keep the message channel open for async response
  }

  if (request.action === 'setBackendUrl') {
    const { url } = request;
    if (url) {
      console.log(`[SepYap Background] Learning custom backend URL: ${url}`);
      chrome.storage.local.set({ customBackendUrl: url });
      sendResponse({ status: 'success' });
    }
    return true;
  }
});
