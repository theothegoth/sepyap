'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';
import { useExtensionCheck } from '../../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../../components/ExtensionRequiredModal';

export default function WatchlistPage() {
  const { isExtensionInstalled, checkExtension } = useExtensionCheck();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [targetPercent, setTargetPercent] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let uid = localStorage.getItem('userId');
      if (!uid) {
        uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', uid);
      }
      return uid;
    }
    return 'anonymous';
  });

  useEffect(() => {
    // Check extension before loading
    if (isExtensionInstalled) {
      loadWatchlist();
    } else {
      setShowExtensionModal(true);
      setLoading(false);
    }
  }, [isExtensionInstalled]);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.getWatchlist(userId);
      setWatchlist(response.data || []);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await api.removeFromWatchlist(userId, productId);
      loadWatchlist();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      alert('Failed to remove from watchlist');
    }
  };

  const handleUpdateThresholds = async () => {
    if (!editingItem) return;

    setIsUpdating(true);
    try {
      await api.addToWatchlist(
        userId,
        editingItem.product_id,
        targetPrice ? parseFloat(targetPrice) : undefined,
        targetPercent ? parseFloat(targetPercent) : undefined
      );
      setEditingItem(null);
      loadWatchlist();
    } catch (error) {
      console.error('Error updating thresholds:', error);
      alert('Güncelleme başarısız oldu');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setTargetPrice(item.target_price?.toString() || '');
    setTargetPercent(item.target_percent?.toString() || '');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <ExtensionRequiredModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">İzleme Listesi</h1>
              <p className="text-gray-600 dark:text-gray-400">Fiyat düşüşlerini takip edin</p>
            </div>
            <Link
              href="/search"
              className="btn-primary"
            >
              + Ekle Ürün
            </Link>
          </div>
        </header>

        {/* Watchlist Items */}
        {watchlist.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">İzleme listeniz boş.</p>
            <Link
              href="/search"
              className="btn-primary inline-block"
            >
              Ürün Ara
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="card hover:shadow-lg transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4 flex-1">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                      {item.product?.canonical_title || 'Unknown Product'}
                    </h3>
                    <div className="space-y-1">
                      {item.target_price && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          Hedef Fiyat: <span className="font-bold">{item.target_price.toFixed(2)} TL</span>
                        </p>
                      )}
                      {item.target_percent && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Düşüş Oranı: <span className="font-bold">%{item.target_percent}</span>
                        </p>
                      )}
                      {!item.target_price && !item.target_percent && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Varsayılan uyarı (%5 düşüş)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Kaldır"
                    >
                      <span className="text-xl">✕</span>
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="Ayarları Düzenle"
                    >
                      <span className="text-lg">⚙️</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => router.push(`/products/${item.product_id}`)}
                    className="flex-1 btn-primary text-xs py-2"
                  >
                    Fiyatları Karşılaştır
                  </button>
                  <Link
                    href={`/alerts?productId=${item.product_id}`}
                    className="flex-1 btn-secondary text-xs py-2 text-center"
                  >
                    Uyarılar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Uyarı Ayarları</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hedef Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Örn: 25.50"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="input w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">Bu fiyatın altına düştüğünde uyar</p>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Veya</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Düşüş Yüzdesi (%)
                  </label>
                  <input
                    type="number"
                    placeholder="Örn: 10"
                    value={targetPercent}
                    onChange={(e) => setTargetPercent(e.target.value)}
                    className="input w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">Fiyat bu oranda düştüğünde uyar</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateThresholds}
                  className="flex-1 btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Güncelleniyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
