'use client';

import { useState, useEffect, useRef } from 'react';

const PROOF_KEY = '__SEPYAP_EXTENSION_PROOF__';
const LEGACY_PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';
const STORAGE_KEY = '__SEPYAP_EXTENSION_DETECTED__';

export function useExtensionCheck() {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null);
  const [isDataCollectionEnabled, setIsDataCollectionEnabled] = useState<boolean | null>(null);
  const extensionDetectedRef = useRef<boolean>(false);

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

      // Only set consent status if the extension supports reporting it
      // This prevents false positives on old versions of the extension
      if (finalProof.supportsConsentReporting !== undefined) {
        setIsDataCollectionEnabled(finalProof.dataCollectionEnabled === true);
      } else {
        // Old extension version found, don't show the reminder as we can't be sure
        setIsDataCollectionEnabled(null);
      }

      // Store in sessionStorage for persistence
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch (e) {
        // Ignore storage errors
      }
    }

    setIsExtensionInstalled(hasExtension);

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
          setIsExtensionInstalled(true);
        }
      }
    } catch (e) {
      // Ignore
    }

    // Initial check
    checkExtension();

    // Listen for extension installation event (both new and legacy)
    const handleExtensionInstalled = (event: any) => {
      if (event.detail && event.detail.installed === true) {
        extensionDetectedRef.current = true;
        setIsExtensionInstalled(true);

        if (event.detail.supportsConsentReporting !== undefined) {
          setIsDataCollectionEnabled(event.detail.dataCollectionEnabled === true);
        } else {
          setIsDataCollectionEnabled(null);
        }

        // Store in sessionStorage
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, 'true');
          }
        } catch (e) {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener('sepyapExtensionInstalled', handleExtensionInstalled);
    window.addEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);

    // Send a ping to ask if the extension is there
    const sendPing = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sepyapPing'));
        window.dispatchEvent(new CustomEvent('groceryMatcherPing'));
      }
    };

    // Send initial ping
    sendPing();

    // More frequent checks initially, then less frequent
    let checkCount = 0;
    let slowInterval: NodeJS.Timeout | null = null;
    const interval = setInterval(() => {
      checkExtension();
      sendPing();

      checkCount++;
      // After 10 seconds, reduce frequency to every 3 seconds
      if (checkCount > 10 && !slowInterval) {
        clearInterval(interval);
        slowInterval = setInterval(() => {
          checkExtension();
          sendPing();
        }, 3000);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (slowInterval) {
        clearInterval(slowInterval);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('sepyapExtensionInstalled', handleExtensionInstalled);
        window.removeEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);
      }
    };
  }, []);

  return { isExtensionInstalled, isDataCollectionEnabled, checkExtension };
}

