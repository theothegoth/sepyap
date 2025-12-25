// This script is injected into the SepYap website to prove extension is installed
// It sets a global variable that the website can check

(function () {
  'use strict';

  // Set a proof that the extension is installed
  // Use a unique identifier that's hard to fake
  const PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';
  const PROOF_VALUE = {
    installed: true,
    version: '1.0.0',
    timestamp: Date.now(),
    signature: 'grocery-matcher-extension-v1'
  };

  // Function to inject proof
  function injectProof() {
    try {
      // Set the proof in window object (main world)
      // Use Object.defineProperty to ensure it's not configurable and persists
      try {
        Object.defineProperty(window, PROOF_KEY, {
          value: PROOF_VALUE,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // Fallback to direct assignment
        window[PROOF_KEY] = PROOF_VALUE;
      }

      // Also set it on document for early access
      if (typeof document !== 'undefined') {
        try {
          Object.defineProperty(document, PROOF_KEY, {
            value: PROOF_VALUE,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          document[PROOF_KEY] = PROOF_VALUE;
        }
      }

      // Also set it in the page's actual window (not isolated world)
      // This is a workaround for content script isolation
      // Use a more CSP-friendly approach: set properties directly instead of inline script
      try {
        // Try to access the page's window object directly
        const pageWindow = window;
        if (pageWindow) {
          try {
            Object.defineProperty(pageWindow, PROOF_KEY, {
              value: PROOF_VALUE,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e) {
            pageWindow[PROOF_KEY] = PROOF_VALUE;
          }
        }
      } catch (e) {
        // Fallback: Use script injection only if direct access fails
        // This will still trigger CSP warnings but is a last resort
        try {
          const script = document.createElement('script');
          script.textContent = `
            (function() {
              try {
                window['${PROOF_KEY}'] = ${JSON.stringify(PROOF_VALUE)};
                document['${PROOF_KEY}'] = ${JSON.stringify(PROOF_VALUE)};
              } catch(e) {
              }
            })();
          `;
          (document.head || document.documentElement).appendChild(script);
          script.remove();
        } catch (scriptError) {
        }
      }

      // Dispatch a custom event for the website to listen to
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('groceryMatcherExtensionInstalled', {
          detail: PROOF_VALUE,
          bubbles: true,
          cancelable: true
        }));
      }

      // Also dispatch on document
      if (typeof document !== 'undefined' && document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent('groceryMatcherExtensionInstalled', {
          detail: PROOF_VALUE,
          bubbles: true,
          cancelable: true
        }));
      }

      // Mark as injected to avoid duplicate injection
      if (!window.__GROCERY_MATCHER_EXTENSION_PROOF_INJECTED__) {
        window.__GROCERY_MATCHER_EXTENSION_PROOF_INJECTED__ = true;
      }

      // Add a listener for the website to ask if the extension is there
      window.addEventListener('groceryMatcherPing', () => {
        window.dispatchEvent(new CustomEvent('groceryMatcherExtensionInstalled', {
          detail: PROOF_VALUE,
          bubbles: true,
          cancelable: true
        }));
      });
    } catch (e) {
    }
  }

  // Inject immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectProof);
  } else {
    injectProof();
  }

  // Also inject on window load as backup
  if (typeof window !== 'undefined') {
    window.addEventListener('load', injectProof);
  }

  // Inject immediately (for document_start)
  injectProof();
})();

