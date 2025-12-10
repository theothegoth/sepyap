'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, CartItem } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useExtensionCheck } from '../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../components/ExtensionRequiredModal';
import BrandPreferencesManager from '../components/BrandPreferencesManager';
import { useBrandPreferences } from '../hooks/useBrandPreferences';
import StructuredData from '../components/StructuredData';

function HomeContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const { checkExtension } = useExtensionCheck();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [includeBrandInput, setIncludeBrandInput] = useState('');
  const [excludeBrandInput, setExcludeBrandInput] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);
  const { currentSet, isLoaded } = useBrandPreferences();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Admin secret key - change this to your own secret
    // In production, this should be in an environment variable
    const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'change-this-secret-key';
    
    // Check for admin mode from URL parameter with secret key
    // Try multiple ways to get the parameter (Next.js App Router can be tricky)
    const adminParam = searchParams?.get('admin') || 
                      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('admin') : null);
    const decodedParam = adminParam ? decodeURIComponent(adminParam) : null;
    
    if (decodedParam && decodedParam === ADMIN_SECRET) {
      // Valid admin key - enable admin mode
      setIsAdmin(true);
      // Store a token derived from the secret (not the secret itself)
      const adminToken = btoa(ADMIN_SECRET + '_' + Date.now()).substring(0, 20);
      localStorage.setItem('groceryMatcher_admin_token', adminToken);
      localStorage.setItem('groceryMatcher_admin_enabled', 'true');
    } else {
      // Check if admin was previously enabled with valid token
      const storedToken = localStorage.getItem('groceryMatcher_admin_token');
      const storedEnabled = localStorage.getItem('groceryMatcher_admin_enabled');
      if (storedToken && storedEnabled === 'true') {
        // Verify token is still valid (basic check - token exists)
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        // Clear invalid admin data
        localStorage.removeItem('groceryMatcher_admin_token');
        localStorage.removeItem('groceryMatcher_admin_enabled');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Only fetch debug data if admin mode is enabled
    if (isAdmin) {
      fetchDebug();
    }
    
    // Check if product should be added from URL
    const addProductId = searchParams?.get('addProduct');
    if (addProductId) {
      handleAddProductById(parseInt(addProductId));
    }
  }, [searchParams, isAdmin]);

  // Load saved brand preferences on mount (only once when loaded)
  useEffect(() => {
    if (isLoaded && currentSet) {
      setSelectedBrands(currentSet.includeBrands);
      setExcludedBrands(currentSet.excludeBrands);
    }
  }, [isLoaded, currentSet]);

  const fetchDebug = async () => {
    try {
      const res = await api.debug();
      setRecentScans(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const addItem = useCallback(() => {
    if (!newItem) return;
    setCart((prevCart) => [...prevCart, { query: newItem, quantity }]);
    setNewItem('');
    setQuantity(1);
  }, [newItem, quantity]);

  const handleAddProductById = useCallback(async (productId: number) => {
    try {
      const response = await api.compareProduct(productId);
      const product = response.data;
      setCart((prevCart) => [...prevCart, { 
        productId: product.productId, 
        productTitle: product.productTitle,
        quantity: 1 
      }]);
      // Remove query param
      window.history.replaceState({}, '', '/');
    } catch (error) {
      console.error('Error adding product:', error);
    }
  }, []);

  const removeItem = useCallback((idx: number) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      newCart.splice(idx, 1);
      return newCart;
    });
  }, []);

  const handleOptimize = useCallback(async () => {
    // Check if extension is installed
    if (!checkExtension()) {
      setShowExtensionModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.optimize(
        cart,
        selectedBrands.length > 0 ? selectedBrands : undefined,
        excludedBrands.length > 0 ? excludedBrands : undefined
      );
      setResult(res.data);
    } catch (e) {
      alert('Optimization failed. Ensure backend is running.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [cart, selectedBrands, excludedBrands, checkExtension]);

  return (
    <>
      <StructuredData
        type="WebPage"
        data={{
          url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
          name: t('home.title'),
          description: 'Build your shopping cart and find the cheapest option across all markets',
        }}
      />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <ExtensionRequiredModal 
          isOpen={showExtensionModal} 
          onClose={() => setShowExtensionModal(false)} 
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Left: Cart Builder */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.shoppingList')}</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('home.addProductHint')} <Link href="/search" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{t('home.searchProducts')}</Link>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('home.addProductPlaceholder')}
                className="input flex-1"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
              <input
                type="number"
                min="1"
                className="input w-20"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <button 
                onClick={addItem}
                className="btn-primary"
              >
                {t('common.add')}
              </button>
            </div>
          </div>

          {/* Brand Filters */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('home.filterByBrand')}</h3>
            
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
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {t('home.includeBrands')}
              </label>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder="Brand name"
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
                  className="input flex-1 text-sm"
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
                  className="px-3 py-1 text-sm btn-primary"
                >
                  {t('common.add')}
                </button>
              </div>
              {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center gap-1"
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
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {t('home.excludeBrands')}
              </label>
              <div className="flex gap-2 mb-1">
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
                  className="input flex-1 text-sm"
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
                  className="px-3 py-1 text-sm btn-danger"
                >
                  {t('common.add')}
                </button>
              </div>
              {excludedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {excludedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="px-2 py-0.5 bg-red-600 dark:bg-red-500 text-white rounded-full text-xs flex items-center gap-1"
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
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                {t('common.clearAll')}
              </button>
            )}
          </div>

          <ul className="space-y-2">
            {cart.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-gray-900 dark:text-gray-100">{item.quantity}x <strong>{item.query || item.productTitle || `Product #${item.productId}`}</strong></span>
                <button onClick={() => removeItem(idx)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">✖</button>
              </li>
            ))}
            {cart.length === 0 && <p className="text-gray-400 dark:text-gray-500 italic text-center py-4">{t('home.cartEmpty')}</p>}
          </ul>

          {cart.length > 0 && (
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="mt-6 w-full bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg text-lg font-bold hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('home.calculating')}
                </span>
              ) : t('home.findCheapestCart')}
            </button>
          )}
        </div>

        {/* Right: Results */}
        <div className="card" aria-label={t('home.cheapestOption')}>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.cheapestOption')}</h2>
          
          {result ? (
            <div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                {t('home.productsTotal')} {result.totalPrice.toFixed(2)} TL
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
                {t('home.deliveryNote')}
              </div>
              
              <div className="space-y-4">
                {result.breakdown.map((basket: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      {basket.marketName}
                    </h3>
                    <ul className="text-sm space-y-2">
                      {basket.items.map((item: any, i: number) => (
                        <li key={i} className="flex justify-between items-start text-gray-900 dark:text-gray-100">
                          <div className="flex-1">
                            <span>{item.quantity}x {item.name}</span>
                            {item.product?.property && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({item.product.property})</span>
                            )}
                          </div>
                          <span className="font-mono ml-2 text-right">
                            {item.product?.price_card && Number(item.product.price_card) < Number(item.product.price) ? (
                              <span>
                                <span className="text-green-600 dark:text-green-400 font-bold">{(Number(item.product.price_card) * item.quantity).toFixed(2)} TL</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 line-through ml-1">
                                  {(Number(item.product.price) * item.quantity).toFixed(2)} TL
                                </span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(Card)</span>
                              </span>
                            ) : (
                              <span>{item.total.toFixed(2)} TL</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                      <div className="flex justify-between text-lg font-bold mb-2">
                        <span className="text-gray-900 dark:text-gray-100">{t('home.productsTotal')}</span>
                        <span className="text-green-700 dark:text-green-400">{basket.total.toFixed(2)} TL</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {t('home.deliveryNote')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('home.buildCart')}</p>
          )}
        </div>
      </div>

      </div>

      {/* Bottom: Debug Scans - Admin Only */}
      {isAdmin && (
      <section className="mt-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label={t('home.recentlyScanned')}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('home.recentlyScanned')}</h2>
          <button onClick={fetchDebug} className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors" aria-label={t('home.refresh')}>{t('home.refresh')}</button>
        </div>
        <div className="overflow-x-auto card">
          <table className="min-w-full text-sm text-left" role="table" aria-label={t('home.recentlyScanned')}>
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.lastSeen')}</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.lastUpdated')}</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.market')}</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.title')}</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.property')}</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">{t('home.price')}</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((p, i) => {
                const lastSeen = new Date(p.last_seen);
                const lastUpdated = p.last_updated ? new Date(p.last_updated) : null;
                const isRecentlyUpdated = lastUpdated && Math.abs(lastSeen.getTime() - lastUpdated.getTime()) < 1000; // Within 1 second
                const isStale = lastUpdated && (lastSeen.getTime() - lastUpdated.getTime()) > 86400000; // More than 24 hours difference
                
                return (
                  <tr key={i} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-2 text-gray-600 dark:text-gray-400" title={`Last seen: ${lastSeen.toLocaleString()}`}>
                      <div className="text-xs">{lastSeen.toLocaleDateString()}</div>
                      <div className="text-sm font-medium">{lastSeen.toLocaleTimeString()}</div>
                    </td>
                    <td className="p-2" title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Never updated'}>
                      {lastUpdated ? (
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{lastUpdated.toLocaleDateString()}</div>
                          <div className={`text-sm font-medium ${isRecentlyUpdated ? 'text-blue-600 dark:text-blue-400' : isStale ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {lastUpdated.toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{p.market.name}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-100">{p.title}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400 text-sm">
                      {p.property ? (
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{p.property}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-100">
                      {p.price_card && Number(p.price_card) < Number(p.price) ? (
                        <div>
                          <span className="font-bold text-green-600 dark:text-green-400">{Number(p.price_card).toFixed(2)} TL</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-through ml-2">{Number(p.price).toFixed(2)} TL</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(Card)</span>
                        </div>
                      ) : (
                        <span>{Number(p.price).toFixed(2)} TL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
