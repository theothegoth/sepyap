// This script is injected into the SepYap website to prove extension is installed
// It sets a global variable that the website can check

(function () {
  'use strict';

  // Set a proof that the extension is installed
  const PROOF_KEY = '__SEPYAP_EXTENSION_PROOF__';
  const LEGACY_PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';
  const PROOF_VALUE = {
    installed: true,
    version: '1.2.0',
    timestamp: Date.now(),
    signature: 'sepyap-extension-v1'
  };
  const LEGACY_PROOF_VALUE = {
    ...PROOF_VALUE,
    signature: 'grocery-matcher-extension-v1'
  };

  // Function to inject proof
  function injectProof() {
    try {
      // Set the proof in window object
      const setProof = (obj, key, val) => {
        try {
          Object.defineProperty(obj, key, {
            value: val,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          obj[key] = val;
        }
      };

      setProof(window, PROOF_KEY, PROOF_VALUE);
      setProof(window, LEGACY_PROOF_KEY, LEGACY_PROOF_VALUE);

      if (typeof document !== 'undefined') {
        setProof(document, PROOF_KEY, PROOF_VALUE);
        setProof(document, LEGACY_PROOF_KEY, LEGACY_PROOF_VALUE);
      }

      // CSP-friendly script injection fallback
      try {
        const script = document.createElement('script');
        script.textContent = `
          (function() {
            try {
              window['${PROOF_KEY}'] = ${JSON.stringify(PROOF_VALUE)};
              window['${LEGACY_PROOF_KEY}'] = ${JSON.stringify(LEGACY_PROOF_VALUE)};
              document['${PROOF_KEY}'] = ${JSON.stringify(PROOF_VALUE)};
              document['${LEGACY_PROOF_KEY}'] = ${JSON.stringify(LEGACY_PROOF_VALUE)};
              // Logging the primary name for verification
              console.log('[SepYap] Extension proof injected');
            } catch(e) {}
          })();
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
      } catch (e) { }

      // Dispatch custom events
      const dispatch = (name) => {
        window.dispatchEvent(new CustomEvent(name, { detail: PROOF_VALUE }));
        document.dispatchEvent(new CustomEvent(name, { detail: PROOF_VALUE }));
      };

      dispatch('sepyapExtensionInstalled');
      dispatch('groceryMatcherExtensionInstalled');

      // Listen for pings
      const onPing = () => {
        dispatch('sepyapExtensionInstalled');
        dispatch('groceryMatcherExtensionInstalled');
      };

      window.addEventListener('sepyapPing', onPing);
      window.addEventListener('groceryMatcherPing', onPing);
    } catch (e) { }
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

