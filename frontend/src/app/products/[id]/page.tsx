'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, PriceComparison } from '../../../lib/api';
import Link from 'next/link';
import PriceHistoryChart from '../../../components/PriceHistoryChart';
import StructuredData from '../../../components/StructuredData';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);

  const [comparison, setComparison] = useState<PriceComparison | null>(null);
  const [priceHistory, setPriceHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [userId] = useState(() => {
    // Simple user ID - in production, use authentication
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
    loadData();
  }, [productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load comparison
      const compResponse = await api.compareProduct(productId);
      setComparison(compResponse.data);

      // Load price history
      try {
        const historyResponse = await api.getPriceHistory(productId, 30);
        setPriceHistory(historyResponse.data);
      } catch (error) {
        console.error('Price history error:', error);
      }

      // Check if in watchlist
      try {
        const watchlistResponse = await api.getWatchlist(userId);
        const watchlist = watchlistResponse.data || [];
        setIsWatched(watchlist.some((w: any) => w.product_id === productId));
      } catch (error) {
        console.error('Watchlist check error:', error);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      await api.addToWatchlist(userId, productId);
      setIsWatched(true);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist');
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      await api.removeFromWatchlist(userId, productId);
      setIsWatched(false);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      alert('Failed to remove from watchlist');
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!comparison) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/search" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-flex items-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Aramaya Dön
          </Link>
          <div className="card p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Ürün bulunamadı</p>
          </div>
        </div>
      </main>
    );
  }

  const cheapestMarket = comparison.cheapest;

  // Generate structured data for product
  const productStructuredData = comparison ? {
    name: comparison.productTitle,
    description: `Price comparison for ${comparison.productTitle} across ${comparison.markets.length} markets`,
    image: comparison.markets.find(m => m.imageUrl)?.imageUrl,
    lowPrice: cheapestMarket?.price || comparison.markets[0]?.price,
    highPrice: Math.max(...comparison.markets.map(m => m.price)),
    offerCount: comparison.markets.length,
    brand: 'Various',
  } : null;

  return (
    <>
      {productStructuredData && (
        <StructuredData type="Product" data={productStructuredData} />
      )}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{comparison.productTitle}</h1>
              {cheapestMarket && (
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  En ucuz <span className="font-semibold text-green-600 dark:text-green-400">{cheapestMarket.marketName}</span> için{' '}
                  <span className="font-bold text-green-600 dark:text-green-400">{cheapestMarket.price.toFixed(2)} TL</span>
                </p>
              )}
            </div>
            <div>
              {isWatched ? (
                <button
                  onClick={handleRemoveFromWatchlist}
                  disabled={watchlistLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  {watchlistLoading ? '...' : '✓ Watched'}
                </button>
              ) : (
                <button
                  onClick={handleAddToWatchlist}
                  disabled={watchlistLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {watchlistLoading ? '...' : '+ İzleme Listesine Ekle'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Price Comparison Table */}
        <section className="card mb-6 overflow-hidden" aria-label="Fiyatları Karşılaştır">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Fiyatları Karşılaştır</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Fiyatları Karşılaştır</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Market</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Özellik</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fiyat</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {comparison.markets.map((market, index) => (
                  <tr
                    key={index}
                    className={`transition-colors ${
                      market.marketName === cheapestMarket?.marketName 
                        ? 'bg-green-50 dark:bg-green-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{market.marketName}</span>
                      {market.marketName === cheapestMarket?.marketName && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">En Ucuz</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{market.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {market.property ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{market.property}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div>
                        {market.priceCard && market.priceCard < market.price ? (
                          <div>
                            <span className="font-bold text-green-600 dark:text-green-400">{market.priceCard.toFixed(2)} TL</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 line-through ml-2">{market.price.toFixed(2)} TL</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(Card)</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{market.price.toFixed(2)} TL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {market.url ? (
                        <a
                          href={market.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                          Görüntüle →
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Price History Chart */}
        {priceHistory && priceHistory.markets && priceHistory.markets.length > 0 && (
          <section className="card mb-6" aria-label="Fiyat Geçmişi">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Fiyat Geçmişi</h2>
            <PriceHistoryChart data={priceHistory} />
          </section>
        )}

        {/* Add to Basket */}
        <section className="card" aria-label="Add to Basket">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Sepete Ekle</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Bu ürünü alışveriş sepetinize ekleyerek birden fazla ürünü optimize edin.
          </p>
          <Link
            href={`/cart?addProduct=${productId}`}
            className="inline-block px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium transition-colors"
          >
            Sepete Ekle →
          </Link>
        </section>
      </div>
    </main>
    </>
  );
}

