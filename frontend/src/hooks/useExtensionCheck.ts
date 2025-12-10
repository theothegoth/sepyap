'use client';

import { useState, useEffect, useRef } from 'react';

const PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';
const STORAGE_KEY = '__GROCERY_MATCHER_EXTENSION_DETECTED__';

export function useExtensionCheck() {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null);
  const extensionDetectedRef = useRef<boolean>(false);

  const checkExtension = (): boolean => {
    // If we've already detected it via event, trust that
    if (extensionDetectedRef.current) {
      return true;
    }

    // Check if we stored the detection in sessionStorage (survives React re-renders)
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        extensionDetectedRef.current = true;
        setIsExtensionInstalled(true);
        return true;
      }
    } catch (e) {
      // sessionStorage might not be available
    }

    // Check window object
    const proof = (window as any)[PROOF_KEY];
    
    // Also check document object as fallback
    const docProof = typeof document !== 'undefined' ? (document as any)[PROOF_KEY] : null;
    
    const finalProof = proof || docProof;
    const hasExtension = finalProof && finalProof.installed === true && finalProof.signature === 'grocery-matcher-extension-v1';
    
    if (hasExtension) {
      extensionDetectedRef.current = true;
      // Store in sessionStorage for persistence
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    setIsExtensionInstalled(hasExtension);
    
    
    return hasExtension || extensionDetectedRef.current;
  };

  useEffect(() => {
    // Check sessionStorage on mount
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        extensionDetectedRef.current = true;
        setIsExtensionInstalled(true);
      }
    } catch (e) {
      // Ignore
    }

    // Initial check
    checkExtension();

    // Listen for extension installation event
    const handleExtensionInstalled = (event: any) => {
      if (event.detail && event.detail.installed === true) {
        extensionDetectedRef.current = true;
        setIsExtensionInstalled(true);
        // Store in sessionStorage
        try {
          sessionStorage.setItem(STORAGE_KEY, 'true');
        } catch (e) {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);

    // More frequent checks initially, then less frequent
    let checkCount = 0;
    let slowInterval: NodeJS.Timeout | null = null;
    const interval = setInterval(() => {
      // Only check if we haven't detected it yet
      if (!extensionDetectedRef.current) {
        checkExtension();
      }
      checkCount++;
      // After 10 seconds, reduce frequency to every 3 seconds
      if (checkCount > 10 && !slowInterval) {
        clearInterval(interval);
        slowInterval = setInterval(() => {
          if (!extensionDetectedRef.current) {
            checkExtension();
          }
        }, 3000);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (slowInterval) {
        clearInterval(slowInterval);
      }
      window.removeEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);
    };
  }, []);

  return { isExtensionInstalled, checkExtension };
}

