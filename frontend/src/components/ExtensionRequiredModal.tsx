'use client';

interface ExtensionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtensionRequiredModal({ isOpen, onClose }: ExtensionRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full card p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Uzantı Gerekli
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Lütfen SepYap Chrome uzantısını yükleyin.
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Kurulum Adımları:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li>Chrome Web Mağazası'ndan SepYap uzantısını yükleyin</li>
            <li>Sayfayı yenileyin (F5 veya Ctrl+R)</li>
            <li>Uzantı yüklendikten sonra site otomatik olarak açılacak</li>
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full btn-primary mb-2"
        >
          Kapat
        </button>

        <button
          onClick={() => window.open('chrome://extensions/', '_blank')}
          className="w-full btn-secondary text-sm"
        >
          Open Extensions Page
        </button>
      </div>
    </div>
  );
}
