// This script is injected into the SepYap website to prove extension is installed
// It sets a global variable that the website can check

(function () {
  'use strict';

  // Set a proof that the extension is installed
  const PROOF_KEY = '__SEPYAP_EXTENSION_PROOF__';
  const LEGACY_PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';

  // Shared state that is updated by injectProof and read by ping listeners
  let CUSTOM_PROOF_VALUE = {
    installed: true,
    version: '1.2.0',
    timestamp: Date.now(),
    signature: 'sepyap-extension-v1',
    dataCollectionEnabled: false,
    supportsConsentReporting: true
  };

  let CUSTOM_LEGACY_PROOF_VALUE = {
    ...CUSTOM_PROOF_VALUE,
    signature: 'grocery-matcher-extension-v1'
  };

  // Function to inject proof
  async function injectProof() {
    try {
      // Get consent from storage
      let dataCollectionEnabled = false;
      try {
        const result = await chrome.storage.local.get('dataCollectionConsent');
        dataCollectionEnabled = !!result.dataCollectionConsent;
      } catch (e) { }

      // Update shared state
      CUSTOM_PROOF_VALUE = {
        installed: true,
        version: '1.2.0',
        timestamp: Date.now(),
        signature: 'sepyap-extension-v1',
        dataCollectionEnabled: dataCollectionEnabled,
        supportsConsentReporting: true
      };

      CUSTOM_LEGACY_PROOF_VALUE = {
        ...CUSTOM_PROOF_VALUE,
        signature: 'grocery-matcher-extension-v1'
      };

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

      setProof(window, PROOF_KEY, CUSTOM_PROOF_VALUE);
      setProof(window, LEGACY_PROOF_KEY, CUSTOM_LEGACY_PROOF_VALUE);

      if (typeof document !== 'undefined') {
        setProof(document, PROOF_KEY, CUSTOM_PROOF_VALUE);
        setProof(document, LEGACY_PROOF_KEY, CUSTOM_LEGACY_PROOF_VALUE);
      }

      // CSP-friendly script injection fallback
      try {
        const scriptId = 'sepyap-extension-proof-script';
        let script = document.getElementById(scriptId);
        if (script) script.remove();

        script = document.createElement('script');
        script.id = scriptId;
        script.textContent = `
          (function() {
            try {
              const val = ${JSON.stringify(CUSTOM_PROOF_VALUE)};
              const legacyVal = ${JSON.stringify(CUSTOM_LEGACY_PROOF_VALUE)};
              window['${PROOF_KEY}'] = val;
              window['${LEGACY_PROOF_KEY}'] = legacyVal;
              document['${PROOF_KEY}'] = val;
              document['${LEGACY_PROOF_KEY}'] = legacyVal;
            } catch(e) {}
          })();
        `;
        (document.head || document.documentElement).appendChild(script);
        setTimeout(() => script.remove(), 100);
      } catch (e) { }

      // Dispatch custom events
      const dispatch = (name) => {
        const event = new CustomEvent(name, { detail: CUSTOM_PROOF_VALUE });
        window.dispatchEvent(event);
        document.dispatchEvent(event);
      };

      dispatch('sepyapExtensionInstalled');
      dispatch('groceryMatcherExtensionInstalled');
    } catch (e) {
      // Silence error
    }
  }

  // Listen for storage changes to update proof in real-time
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && (changes.dataCollectionConsent)) {
        injectProof();
      }
    });
  } catch (e) { }

  // Inject immediately
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
