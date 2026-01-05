import { useState, useEffect, useRef } from 'react';

const PROOF_KEY = '__SEPYAP_EXTENSION_PROOF__';
const LEGACY_PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';
const STORAGE_KEY = '__SEPYAP_EXTENSION_DETECTED__';
const CONSENT_STORAGE_KEY = '__SEPYAP_EXTENSION_CONSENT__';

export function useExtensionCheck() {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null);
  const [isDataCollectionEnabled, setIsDataCollectionEnabled] = useState<boolean | null>(null);
  const extensionDetectedRef = useRef<boolean>(false);
  const hasEverDetectedRef = useRef<boolean>(false);

  const checkExtension = (): boolean => {
    // During SSR, window doesn't exist, so return false
    if (typeof window === 'undefined') {
      return false;
    }

    // Check window object (both new and legacy)
    const proof = (window as any)[PROOF_KEY];
    const legacyProof = (window as any)[LEGACY_PROOF_KEY];

    // Also check document object as fallback
    const docProof = typeof document !== 'undefined' ? (document as any)[PROOF_KEY] : null;
    const legacyDocProof = typeof document !== 'undefined' ? (document as any)[LEGACY_PROOF_KEY] : null;

    const finalProof = proof || docProof || legacyProof || legacyDocProof;
    const hasExtension = finalProof && finalProof.installed === true &&
      (finalProof.signature === 'sepyap-extension-v1' || finalProof.signature === 'grocery-matcher-extension-v1');

    if (hasExtension) {
      extensionDetectedRef.current = true;
      hasEverDetectedRef.current = true;
      setIsExtensionInstalled(true);

      // Only set consent status if the extension supports reporting it
      if (finalProof.supportsConsentReporting !== undefined) {
        const isEnabled = finalProof.dataCollectionEnabled === true;
        setIsDataCollectionEnabled(isEnabled);

        // Store consent in sessionStorage
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(CONSENT_STORAGE_KEY, isEnabled ? 'true' : 'false');
          }
        } catch (e) { }
      } else {
        setIsDataCollectionEnabled(null);
      }

      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch (e) { }
    } else {
      // If we've already detected it in this session/mount, don't flip back to false easily
      // because polling 'window' is unreliable due to isolation
      if (!hasEverDetectedRef.current) {
        // We only set to false if we haven't found it yet
        // This will be overridden by the event listener if the extension responds
      }
    }

    return hasExtension || extensionDetectedRef.current;
  };

  useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    // Check sessionStorage on mount
    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored === 'true') {
          extensionDetectedRef.current = true;
          hasEverDetectedRef.current = true;
          setIsExtensionInstalled(true);
        }

        const storedConsent = sessionStorage.getItem(CONSENT_STORAGE_KEY);
        if (storedConsent !== null) {
          setIsDataCollectionEnabled(storedConsent === 'true');
        }
      }
    } catch (e) { }

    // Listen for extension installation event (both new and legacy)
    const handleExtensionInstalled = (event: any) => {
      if (event.detail && event.detail.installed === true) {
        extensionDetectedRef.current = true;
        hasEverDetectedRef.current = true;
        setIsExtensionInstalled(true);

        const isEnabled = event.detail.dataCollectionEnabled === true;
        if (event.detail.supportsConsentReporting !== undefined) {
          setIsDataCollectionEnabled(isEnabled);
          try {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(CONSENT_STORAGE_KEY, isEnabled ? 'true' : 'false');
            }
          } catch (e) { }
        } else {
          setIsDataCollectionEnabled(null);
        }

        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, 'true');
          }
        } catch (e) { }
      }
    };

    window.addEventListener('sepyapExtensionInstalled', handleExtensionInstalled);
    window.addEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);

    // Initial check
    checkExtension();

    // Send a silent ping to ask if the extension is there
    const sendPing = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sepyapPing'));
        window.dispatchEvent(new CustomEvent('groceryMatcherPing'));
      }
    };

    // Send initial ping
    sendPing();

    // FAIL-SAFE: If after 2 seconds we still have no detection, set to false
    // to prevent pages from being stuck in "Loading" state
    const failSafeTimeout = setTimeout(() => {
      if (!hasEverDetectedRef.current) {
        setIsExtensionInstalled(false);
      }
    }, 2000);

    // Periodic check and ping (very quiet)
    const interval = setInterval(() => {
      checkExtension();
      sendPing();
    }, 5000);

    return () => {
      clearTimeout(failSafeTimeout);
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('sepyapExtensionInstalled', handleExtensionInstalled);
        window.removeEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);
      }
    };
  }, []);

  return { isExtensionInstalled, isDataCollectionEnabled, checkExtension };
}
