'use client';

import { useState, useEffect } from 'react';

const PROOF_KEY = '__GROCERY_MATCHER_EXTENSION_PROOF__';

export default function ExtensionLock({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check for extension proof
    const checkExtension = () => {
      // Check if proof exists in window object
      const proof = (window as any)[PROOF_KEY];
      
      if (proof && proof.installed === true && proof.signature === 'grocery-matcher-extension-v1') {
        setIsUnlocked(true);
        setChecking(false);
        return;
      }

      // Also listen for the custom event
      const handleExtensionInstalled = (event: any) => {
        if (event.detail && event.detail.installed === true) {
          setIsUnlocked(true);
          setChecking(false);
        }
      };

      window.addEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);

      // Check again after a short delay (extension might inject after page load)
      const timeout = setTimeout(() => {
        const proofAfterDelay = (window as any)[PROOF_KEY];
        if (proofAfterDelay && proofAfterDelay.installed === true) {
          setIsUnlocked(true);
        }
        setChecking(false);
        window.removeEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);
      }, 1000);

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('groceryMatcherExtensionInstalled', handleExtensionInstalled);
      };
    };

    checkExtension();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SepYap Eklentisi Gerekli
            </h1>
            <p className="text-gray-600 mb-6">
              Bu sayfayı kullanmak için SepYap Chrome eklentisini yüklemeniz gerekiyor.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Kurulum Adımları</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Chrome Web Store'dan SepYap eklentisini yükleyin</li>
              <li>Eklentiyi etkinleştirin ve sayfayı yenileyin</li>
              <li>Eklenti yüklendikten sonra bu sayfa otomatik olarak açılacak</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-yellow-900 mb-2 text-sm">🔍 Debug: Check Extension</h3>
            <p className="text-xs text-yellow-800 mb-2">Open browser console (F12) and type:</p>
            <code className="block bg-yellow-100 p-2 rounded text-xs font-mono break-all">
              window.__GROCERY_MATCHER_EXTENSION_PROOF__
            </code>
            <p className="text-xs text-yellow-800 mt-2">
              If you see an object → Extension is working!<br/>
              If you see "undefined" → Extension not detected
            </p>
            <p className="text-xs text-yellow-800 mt-2">
              Also check: chrome://extensions/ - Make sure SepYap is enabled and reloaded
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-2"
          >
            Sayfayı Yenile
          </button>

          <button
            onClick={() => window.open('chrome://extensions/', '_blank')}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
          >
            Eklentiler Sayfasını Aç
          </button>

          <p className="mt-4 text-xs text-gray-500">
            Eklenti yüklendikten sonra sayfayı yenilemeniz gerekebilir.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

