'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { useExtensionCheck } from '../../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../../components/ExtensionRequiredModal';

export default function WatchlistPage() {
  const { t } = useLanguage();
  const { checkExtension } = useExtensionCheck();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!checkExtension()) {
      setShowExtensionModal(true);
      setLoading(false);
      return;
    }
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    // Check extension again before API call
    if (!checkExtension()) {
      setShowExtensionModal(true);
      return;
    }

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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading watchlist...</p>
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
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('watchlist.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('watchlist.subtitle')}</p>
            </div>
            <Link
              href="/search"
              className="btn-primary"
            >
              + {t('common.add')} {t('watchlist.product')}
            </Link>
          </div>
        </header>

        {/* Watchlist Items */}
        {watchlist.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('watchlist.empty')}</p>
            <Link
              href="/search"
              className="btn-primary inline-block"
            >
              {t('nav.search')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="card hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                      {item.product?.canonical_title || 'Unknown Product'}
                    </h3>
                    {item.target_price && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('watchlist.alertWhenPriceDropsBelow')}{' '}
                        <span className="font-semibold">{item.target_price.toFixed(2)} TL</span>
                      </p>
                    )}
                    {item.target_percent && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('watchlist.alertWhenPriceDropsBy')}{' '}
                        <span className="font-semibold">{item.target_percent}%</span>
                      </p>
                    )}
                    {!item.target_price && !item.target_percent && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('watchlist.defaultAlert')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-4 transition-colors"
                    title={t('watchlist.remove')}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/products/${item.product_id}`)}
                    className="flex-1 btn-primary text-sm"
                  >
                    {t('product.comparePrices')}
                  </button>
                  <Link
                    href={`/alerts?productId=${item.product_id}`}
                    className="btn-secondary text-sm"
                  >
                    {t('nav.alerts')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

