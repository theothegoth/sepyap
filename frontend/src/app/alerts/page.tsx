'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';
import { useExtensionCheck } from '../../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../../components/ExtensionRequiredModal';

function AlertsContent() {
  const { checkExtension } = useExtensionCheck();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFilter = searchParams.get('productId');

  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
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
    loadAlerts();
    loadStats();
  }, [unreadOnly]);

  const loadAlerts = async () => {
    // Check extension again before API call
    if (!checkExtension()) {
      setShowExtensionModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getAlerts(userId, unreadOnly);
      let alertsData = response.data || [];
      
      // Filter by product if specified
      if (productIdFilter) {
        alertsData = alertsData.filter((alert: any) => 
          alert.watchlist?.product_id === parseInt(productIdFilter)
        );
      }
      
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getAlertStats(userId);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await api.markAlertAsRead(alertId, userId);
      loadAlerts();
      loadStats();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      await api.dismissAlert(alertId, userId);
      loadAlerts();
      loadStats();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Fiyat Düşüş Uyarıları</h1>
              <p className="text-gray-600 dark:text-gray-400">İzlediğiniz ürünlerdeki fiyat düşüşlerini görün</p>
            </div>
            <Link
              href="/watchlist"
              className="btn-primary"
            >
              İzleme Listesi
            </Link>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Toplam</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unread}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Okunmamış</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.dismissed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Kapatılan</div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Okunmamış</span>
            </label>
          </div>
        </header>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Uyarı yok.
            </p>
            <Link
              href="/search"
              className="btn-primary inline-block"
            >
              İzleme Listesine Ekle
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`card ${
                  !alert.is_read ? 'border-l-4 border-blue-500 dark:border-blue-400' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {alert.watchlist?.product?.canonical_title || 'Unknown Product'}
                      </h3>
                      {!alert.is_read && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                          Yeni
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Fiyat <span className="font-semibold">{alert.marketProduct?.market?.name || 'Bilinmeyen Market'}</span> marketinde düştü
                    </p>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Eski Fiyat: </span>
                        <span className="line-through text-gray-700 dark:text-gray-300">{alert.old_price.toFixed(2)} TL</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Yeni Fiyat: </span>
                        <span className="font-bold text-green-600 dark:text-green-400 text-lg">{alert.new_price.toFixed(2)} TL</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tasarruf: </span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {alert.price_change.toFixed(2)} TL ({alert.price_change_percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(alert.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {alert.marketProduct?.url && (
                      <a
                        href={alert.marketProduct.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm text-center transition-colors"
                      >
                        Şimdi Satın Al →
                      </a>
                    )}
                    {!alert.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(alert.id)}
                        className="btn-secondary text-sm"
                      >
                        Okundu İşaretle
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm transition-colors"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      </main>
    }>
      <AlertsContent />
    </Suspense>
  );
}
