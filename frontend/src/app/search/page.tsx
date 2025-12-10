'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { useExtensionCheck } from '../../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../../components/ExtensionRequiredModal';
import BrandPreferencesManager from '../../components/BrandPreferencesManager';
import { useBrandPreferences } from '../../hooks/useBrandPreferences';
import ProductCard from '../../components/ProductCard';
import StructuredData from '../../components/StructuredData';

export default function SearchPage() {
  const { t } = useLanguage();
  const { checkExtension } = useExtensionCheck();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [includeBrandInput, setIncludeBrandInput] = useState('');
  const [excludeBrandInput, setExcludeBrandInput] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);
  const [watchedProductIds, setWatchedProductIds] = useState<Set<number>>(new Set());
  const [watchlistLoading, setWatchlistLoading] = useState<{ [key: number]: boolean }>({});
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentSet, isLoaded: preferencesLoaded } = useBrandPreferences();
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
    // Focus search input on mount
    searchInputRef.current?.focus();
    // Load watchlist to check which products are already watched
    loadWatchlist();
  }, []);

  // Load saved brand preferences when available (only once when loaded)
  useEffect(() => {
    if (preferencesLoaded && currentSet) {
      setSelectedBrands(currentSet.includeBrands);
      setExcludedBrands(currentSet.excludeBrands);
    }
  }, [preferencesLoaded, currentSet]);

  const loadWatchlist = async () => {
    try {
      const response = await api.getWatchlist(userId);
      const watchlist = response.data || [];
      const watchedIds = new Set(watchlist.map((item: any) => item.product_id));
      setWatchedProductIds(watchedIds);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };


  useEffect(() => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Don't search if query is too short
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    // Set new timer for debounced search
    const timer = setTimeout(async () => {
      // Check if extension is installed
      if (!checkExtension()) {
        setShowExtensionModal(true);
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.searchProducts(
          query,
          20,
          selectedBrands.length > 0 ? selectedBrands : undefined,
          excludedBrands.length > 0 ? excludedBrands : undefined
        );
        const productsList = response.data.products || [];
        setProducts(productsList);
      } catch (error) {
        console.error('Search error:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    setDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, selectedBrands, excludedBrands]);

  const handleProductClick = useCallback((productId: number) => {
    router.push(`/products/${productId}`);
  }, [router]);

  const handleAddToWatchlist = useCallback(async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlistLoading((prev) => ({ ...prev, [productId]: true }));
    try {
      await api.addToWatchlist(userId, productId);
      setWatchedProductIds((prev) => new Set([...prev, productId]));
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist');
    } finally {
      setWatchlistLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }, [userId]);

  const handleRemoveFromWatchlist = useCallback(async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlistLoading((prev) => ({ ...prev, [productId]: true }));
    try {
      await api.removeFromWatchlist(userId, productId);
      setWatchedProductIds((prev) => {
        const newWatched = new Set(prev);
        newWatched.delete(productId);
        return newWatched;
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      alert('Failed to remove from watchlist');
    } finally {
      setWatchlistLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }, [userId]);

  return (
    <>
      <StructuredData
        type="WebPage"
        data={{
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/search`,
          name: t('search.title'),
          description: t('search.subtitle'),
        }}
      />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <ExtensionRequiredModal 
          isOpen={showExtensionModal} 
          onClose={() => setShowExtensionModal(false)} 
        />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('search.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('search.subtitle')}</p>
        </header>

        {/* Search Input */}
        <div className="mb-6">
          <label htmlFor="search-input" className="sr-only">
            {t('search.placeholder')}
          </label>
          <div className="relative">
            <input
              id="search-input"
              ref={searchInputRef}
              type="search"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full text-lg"
              aria-label={t('search.placeholder')}
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 dark:border-blue-400"></div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Filters */}
        <div className="mb-6 card">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('home.filterByBrand')}</h3>
          
          {/* Brand Preferences Manager */}
          <BrandPreferencesManager
            selectedBrands={selectedBrands}
            excludedBrands={excludedBrands}
            onLoad={(includeBrands, excludeBrands) => {
              setSelectedBrands(includeBrands);
              setExcludedBrands(excludeBrands);
            }}
          />
          
            {/* Include Brands */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                {t('home.includeBrands')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder={t('home.brandPlaceholder')}
                  value={includeBrandInput}
                  onChange={(e) => setIncludeBrandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && includeBrandInput.trim()) {
                      const brand = includeBrandInput.trim();
                      if (!selectedBrands.includes(brand)) {
                        setSelectedBrands([...selectedBrands, brand]);
                        setExcludedBrands(excludedBrands.filter(b => b !== brand));
                      }
                      setIncludeBrandInput('');
                    }
                  }}
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    if (includeBrandInput.trim()) {
                      const brand = includeBrandInput.trim();
                      if (!selectedBrands.includes(brand)) {
                        setSelectedBrands([...selectedBrands, brand]);
                        setExcludedBrands(excludedBrands.filter(b => b !== brand));
                      }
                      setIncludeBrandInput('');
                    }
                  }}
                  className="btn-primary"
                >
                  {t('common.add')}
                </button>
              </div>
              {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-sm flex items-center gap-2"
                    >
                      {brand}
                      <button
                        onClick={() => setSelectedBrands(selectedBrands.filter(b => b !== brand))}
                        className="hover:text-blue-200 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Exclude Brands */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                {t('home.excludeBrands')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder={t('home.brandPlaceholder')}
                  value={excludeBrandInput}
                  onChange={(e) => setExcludeBrandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && excludeBrandInput.trim()) {
                      const brand = excludeBrandInput.trim();
                      if (!excludedBrands.includes(brand)) {
                        setExcludedBrands([...excludedBrands, brand]);
                        setSelectedBrands(selectedBrands.filter(b => b !== brand));
                      }
                      setExcludeBrandInput('');
                    }
                  }}
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    if (excludeBrandInput.trim()) {
                      const brand = excludeBrandInput.trim();
                      if (!excludedBrands.includes(brand)) {
                        setExcludedBrands([...excludedBrands, brand]);
                        setSelectedBrands(selectedBrands.filter(b => b !== brand));
                      }
                      setExcludeBrandInput('');
                    }
                  }}
                  className="btn-danger"
                >
                  {t('common.add')}
                </button>
              </div>
              {excludedBrands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {excludedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="px-3 py-1 bg-red-600 dark:bg-red-500 text-white rounded-full text-sm flex items-center gap-2"
                    >
                      {brand}
                      <button
                        onClick={() => setExcludedBrands(excludedBrands.filter(b => b !== brand))}
                        className="hover:text-red-200 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(selectedBrands.length > 0 || excludedBrands.length > 0) && (
              <button
                onClick={() => {
                  setSelectedBrands([]);
                  setExcludedBrands([]);
                  setIncludeBrandInput('');
                  setExcludeBrandInput('');
                }}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                {t('common.clearAll')}
              </button>
            )}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">{t('search.searching')}</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const isWatched = watchedProductIds.has(product.id);
                  const isLoading = watchlistLoading[product.id];
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isWatched={isWatched}
                      isLoading={isLoading}
                      onAddToWatchlist={(e) => handleAddToWatchlist(product.id, e)}
                      onRemoveFromWatchlist={(e) => handleRemoveFromWatchlist(product.id, e)}
                      onProductClick={handleProductClick}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 card">
                <p className="text-gray-600 dark:text-gray-400">{t('search.noResults').replace('{query}', query)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('search.tryDifferent')}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {query.length < 2 && (
          <div className="text-center py-12 card">
            <p className="text-gray-600 dark:text-gray-400">{t('search.typeToSearch')}</p>
          </div>
        )}
      </div>
    </main>
    </>
  );
}

