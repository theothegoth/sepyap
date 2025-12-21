'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, CartItem } from '../../lib/api';
import { useExtensionCheck } from '../../hooks/useExtensionCheck';
import ExtensionRequiredModal from '../../components/ExtensionRequiredModal';
import BrandPreferencesManager from '../../components/BrandPreferencesManager';
import { useBrandPreferences } from '../../hooks/useBrandPreferences';
import StructuredData from '../../components/StructuredData';

function CartContent() {
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

  // Market filtreleme için state
  const [allowedMarkets, setAllowedMarkets] = useState<string[]>([]);
  const [allMarkets, setAllMarkets] = useState<string[]>([]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const adminParam =
        searchParams?.get('admin') ||
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('admin')
          : null);
      const decodedParam = adminParam ? decodeURIComponent(adminParam) : null;

      if (decodedParam) {
        // Check with backend
        try {
          const res = await api.checkAdmin(decodedParam);
          if (res.data.valid) {
            setIsAdmin(true);
            localStorage.setItem('groceryMatcher_admin_token', res.data.token);
            localStorage.setItem('groceryMatcher_admin_enabled', 'true');
          } else {
            setIsAdmin(false);
            localStorage.removeItem('groceryMatcher_admin_token');
            localStorage.removeItem('groceryMatcher_admin_enabled');
          }
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        // Check stored token
        const storedToken = localStorage.getItem('groceryMatcher_admin_token');
        const storedEnabled = localStorage.getItem('groceryMatcher_admin_enabled');
        if (storedToken && storedEnabled === 'true') {
          // Token exists, assume valid (backend validation happens on first check)
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          localStorage.removeItem('groceryMatcher_admin_token');
          localStorage.removeItem('groceryMatcher_admin_enabled');
        }
      }
    };

    checkAdminAccess();
  }, [searchParams]);

  useEffect(() => {
    if (isAdmin) {
      fetchDebug();
    }

    const addProductId = searchParams?.get('addProduct');
    if (addProductId) {
      handleAddProductById(parseInt(addProductId));
    }
  }, [searchParams, isAdmin]);

  useEffect(() => {
    if (isLoaded && currentSet) {
      setSelectedBrands(currentSet.includeBrands);
      setExcludedBrands(currentSet.excludeBrands);
    }
  }, [isLoaded, currentSet]);

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const res = await api.getMarkets();
        const names = (res.data || []).map((m: any) => m.name);
        setAllMarkets(names);
      } catch (e) {
        // Hata olursa sessiz geç
      }
    };

    loadMarkets();
  }, []);

  const fetchDebug = async () => {
    try {
      const res = await api.debug();
      setRecentScans(res.data);
    } catch (e) {
      // Error handling
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
      setCart((prevCart) => [
        ...prevCart,
        {
          productId: product.productId,
          productTitle: product.productTitle,
          quantity: 1,
        },
      ]);
      window.history.replaceState({}, '', '/cart');
    } catch (error) {
      // Error handling
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
    if (!checkExtension()) {
      setShowExtensionModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.optimize(
        cart,
        selectedBrands.length > 0 ? selectedBrands : undefined,
        excludedBrands.length > 0 ? excludedBrands : undefined,
        allowedMarkets.length > 0 ? allowedMarkets : undefined,
      );

      // Filter out alternative carts that contain items not matching query words
      // This is a workaround until backend query validation is fixed
      if (res.data.alternatives && cart.length > 0) {
        const filteredAlternatives = res.data.alternatives.filter((alt: any) => {
          if (!alt.breakdown || alt.breakdown.length === 0) return false;

          // Check each item in the alternative cart against corresponding cart item
          for (let i = 0; i < cart.length; i++) {
            const cartItem = cart[i];
            if (!cartItem.query) continue; // Skip if no query (productId-based)

            // Find the corresponding item in the alternative cart
            let foundMatchingItem = false;
            for (const basket of alt.breakdown) {
              if (!basket.items || basket.items.length === 0) continue;

              // Check if any item in this basket matches the cart item query
              for (const item of basket.items) {
                const queryWords = cartItem.query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
                const itemTitle = item.name.toLowerCase();

                // Check if all query words appear as whole words in the item title
                const allWordsMatch = queryWords.every(word => {
                  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const wordRegex = new RegExp(`(^|[^a-z0-9ığüşöç])${escapedWord}([^a-z0-9ığüşöç]|$)`, 'i');
                  return wordRegex.test(itemTitle);
                });

                if (allWordsMatch) {
                  foundMatchingItem = true;
                  break;
                }
              }

              if (foundMatchingItem) break;
            }

            // If no matching item found for this cart item, reject this alternative cart
            if (!foundMatchingItem) {
              return false;
            }
          }

          return true; // Keep this alternative cart
        });

        res.data.alternatives = filteredAlternatives;
      }

      setResult(res.data);
    } catch (e) {
      alert('Optimization failed. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }, [cart, selectedBrands, excludedBrands, allowedMarkets, checkExtension]);

  const allMarketNames: string[] = allMarkets;

  // allowedMarkets boşsa: "tüm marketler seçili" gibi davran
  const isMarketChecked = (marketName: string) => {
    if (allowedMarkets.length === 0) return true;
    return allowedMarkets.includes(marketName);
  };

  return (
    <>
      <StructuredData
        type="WebPage"
        data={{
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/cart`,
          name: 'Alışveriş Sepeti',
          description: 'Sepetinizi oluşturun ve tüm marketlerdeki en ucuz seçeneği bulun',
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
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Alışveriş Listeniz <span className="text-xs text-gray-400 font-normal">(v1.1)</span>
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ürün adıyla ekleyin veya{' '}
                  <Link
                    href="/search"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    ürün ara
                  </Link>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ürün Adı (örn. Süt)"
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
                  <button onClick={addItem} className="btn-primary">
                    Ekle
                  </button>
                </div>
              </div>

              {/* Brand Filters */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Markaya Göre Filtrele
                </h3>

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
                    Dahil Et (sadece bu markalar):
                  </label>
                  <div className="flex gap-2 mb-1">
                    <input
                      type="text"
                      placeholder="Marka adı"
                      value={includeBrandInput}
                      onChange={(e) => setIncludeBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && includeBrandInput.trim()) {
                          const brand = includeBrandInput.trim();
                          if (!selectedBrands.includes(brand)) {
                            setSelectedBrands([...selectedBrands, brand]);
                            setExcludedBrands(excludedBrands.filter((b) => b !== brand));
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
                            setExcludedBrands(excludedBrands.filter((b) => b !== brand));
                          }
                          setIncludeBrandInput('');
                        }
                      }}
                      className="px-3 py-1 text-sm btn-primary"
                    >
                      Ekle
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
                            onClick={() =>
                              setSelectedBrands(selectedBrands.filter((b) => b !== brand))
                            }
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
                    Hariç Tut (bu markaları gizle):
                  </label>
                  <div className="flex gap-2 mb-1">
                    <input
                      type="text"
                      placeholder="Marka adı"
                      value={excludeBrandInput}
                      onChange={(e) => setExcludeBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && excludeBrandInput.trim()) {
                          const brand = excludeBrandInput.trim();
                          if (!excludedBrands.includes(brand)) {
                            setExcludedBrands([...excludedBrands, brand]);
                            setSelectedBrands(selectedBrands.filter((b) => b !== brand));
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
                            setSelectedBrands(selectedBrands.filter((b) => b !== brand));
                          }
                          setExcludeBrandInput('');
                        }
                      }}
                      className="px-3 py-1 text-sm btn-danger"
                    >
                      Ekle
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
                            onClick={() =>
                              setExcludedBrands(excludedBrands.filter((b) => b !== brand))
                            }
                            className="hover:text-red-200 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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
                    Tümünü Temizle
                  </button>
                )}
              </div>

              {/* Market Filters */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Marketlere Göre Filtrele
                </h3>

                {allMarketNames.length > 0 ? (
                  <div className="space-y-2">
                    {allMarketNames.map((marketName) => {
                      const checked = isMarketChecked(marketName);
                      return (
                        <label
                          key={marketName}
                          className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              setAllowedMarkets((prev) => {
                                if (e.target.checked) {
                                  // İşaretleniyorsa, listede yoksa ekle
                                  if (prev.length === 0) {
                                    // Eğer hepsi seçiliyken (boş array) birine tıklanırsa (bu durum arayüzde zaten seçili görünür,
                                    // ama mantıken birisi uncheck edilmişse ve tekrar check ediliyorsa buraya düşmez.
                                    // Checkbox mantığı: işaretliyse uncheck edilir.
                                    return [marketName];
                                  }
                                  return prev.includes(marketName) ? prev : [...prev, marketName];
                                } else {
                                  // İşaret kaldırılıyorsa
                                  // Eğer liste boşsa (hepsi seçili), referans listemiz tüm marketlerdir
                                  const currentList = prev.length === 0 ? allMarketNames : prev;
                                  const filtered = currentList.filter((m) => m !== marketName);
                                  // Eğer hiçbiri kalmadıysa boş dön (hepsi seçili)
                                  return filtered.length === 0 ? [] : filtered;
                                }
                              });
                            }}
                          />
                          <span>{marketName}</span>
                        </label>
                      );
                    })}
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => setAllowedMarkets([])}
                    >
                      Tüm marketleri dahil et
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Henüz market listesi yüklenmedi veya sistemde tanımlı market bulunamadı.
                  </p>
                )}
              </div>

              <ul className="space-y-2">
                {cart.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <span className="text-gray-900 dark:text-gray-100">
                      {item.quantity}x{' '}
                      <strong>
                        {item.query || item.productTitle || `Product #${item.productId}`}
                      </strong>
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      ✖
                    </button>
                  </li>
                ))}
                {cart.length === 0 && (
                  <p className="text-gray-400 dark:text-gray-500 italic text-center py-4">
                    Sepet boş.
                  </p>
                )}
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
                      Hesaplanıyor...
                    </span>
                  ) : (
                    'En Ucuz Sepeti Bul ✨'
                  )}
                </button>
              )}
            </div>

            {/* Right: Results */}
            <div className="card" aria-label="En Ucuz Seçenek">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                En Ucuz Seçenek
              </h2>

              {result ? (
                <div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                    Ürünler Toplamı: {result.totalPrice.toFixed(2)} TL
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
                    + Kargo (ücretler market ve sipariş tutarına göre değişebilir)
                  </div>

                  <div className="space-y-4">
                    {result.breakdown.map((basket: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                      >
                        <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                          {basket.marketName}
                        </h3>
                        <ul className="text-sm space-y-2">
                          {basket.items.map((item: any, i: number) => (
                            <li
                              key={i}
                              className="flex justify-between items-start text-gray-900 dark:text-gray-100"
                            >
                              <div className="flex-1">
                                <span>
                                  {item.quantity}x {item.name}
                                </span>
                                {item.product?.property && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    ({item.product.property})
                                  </span>
                                )}
                              </div>
                              <span className="font-mono ml-2 text-right">
                                {item.product?.price_card &&
                                  Number(item.product.price_card) <
                                  Number(item.product.price) ? (
                                  <span>
                                    <span className="text-green-600 dark:text-green-400 font-bold">
                                      {(
                                        Number(item.product.price_card) * item.quantity
                                      ).toFixed(2)}{' '}
                                      TL
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 line-through ml-1">
                                      {(
                                        Number(item.product.price) * item.quantity
                                      ).toFixed(2)}{' '}
                                      TL
                                    </span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                      (Card)
                                    </span>
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
                            <span className="text-gray-900 dark:text-gray-100">
                              Ürünler Toplamı:
                            </span>
                            <span className="text-green-700 dark:text-green-400">
                              {basket.total.toFixed(2)} TL
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                            + Kargo (ücretler market ve sipariş tutarına göre değişebilir)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                        Alternatif Sepetler
                      </h3>
                      <div className="space-y-3">
                        {result.alternatives.map((alt: any) => (
                          <div
                            key={alt.id}
                            className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white/50 dark:bg-gray-800/50"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                {alt.marketCount === 1
                                  ? `${alt.breakdown[0]?.marketName} marketinden tek sepet`
                                  : `${alt.marketCount} market kombinasyonu`}
                              </div>
                              <div className="text-sm font-bold text-green-700 dark:text-green-400">
                                {alt.totalPrice.toFixed(2)} TL
                              </div>
                            </div>
                            {alt.breakdown.map((basket: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-xs text-gray-700 dark:text-gray-300"
                              >
                                <span className="font-semibold">
                                  {basket.marketName}
                                </span>{' '}
                                – {basket.subtotal.toFixed(2)} TL
                              </div>
                            ))}
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                              Bu sepet, en ucuz sepete alternatif olarak farklı market
                              tercihleri sunar (ör. tek marketten alışveriş).
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Sepetinizi oluşturun ve optimize edin.
                </p>
              )}
            </div>
          </div>

          {/* Bottom: Debug Scans - Admin Only */}
          {isAdmin && (
            <section
              className="mt-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
              aria-label="Son Taranan Ürünler"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  Son Taranan Ürünler (DB Kontrolü)
                </h2>
                <button
                  onClick={fetchDebug}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                  aria-label="Yenile"
                >
                  Yenile
                </button>
              </div>
              <div className="overflow-x-auto card">
                <table
                  className="min-w-full text-sm text-left"
                  role="table"
                  aria-label="Son Taranan Ürünler"
                >
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="p-2 text-gray-700 dark:text-gray-300">Son Görüldü</th>
                      <th className="p-2 text-gray-700 dark:text-gray-300">
                        Son Güncellendi
                      </th>
                      <th className="p-2 text-gray-700 dark:text-gray-300">Market</th>
                      <th className="p-2 text-gray-700 dark:text-gray-300">Başlık</th>
                      <th className="p-2 text-gray-700 dark:text-gray-300">Özellik</th>
                      <th className="p-2 text-gray-700 dark:text-gray-300">Fiyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((p, i) => {
                      const lastSeen = new Date(p.last_seen);
                      const lastUpdated = p.last_updated
                        ? new Date(p.last_updated)
                        : null;
                      const isRecentlyUpdated =
                        lastUpdated &&
                        Math.abs(lastSeen.getTime() - lastUpdated.getTime()) < 1000;
                      const isStale =
                        lastUpdated &&
                        lastSeen.getTime() - lastUpdated.getTime() > 86400000;

                      return (
                        <tr
                          key={i}
                          className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td
                            className="p-2 text-gray-600 dark:text-gray-400"
                            title={`Last seen: ${lastSeen.toLocaleString()}`}
                          >
                            <div className="text-xs">
                              {lastSeen.toLocaleDateString()}
                            </div>
                            <div className="text-sm font-medium">
                              {lastSeen.toLocaleTimeString()}
                            </div>
                          </td>
                          <td
                            className="p-2"
                            title={
                              lastUpdated
                                ? `Last updated: ${lastUpdated.toLocaleString()}`
                                : 'Never updated'
                            }
                          >
                            {lastUpdated ? (
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {lastUpdated.toLocaleDateString()}
                                </div>
                                <div
                                  className={`text-sm font-medium ${isRecentlyUpdated
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : isStale
                                      ? 'text-orange-500 dark:text-orange-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                  {lastUpdated.toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-medium text-gray-900 dark:text-gray-100">
                            {p.market.name}
                          </td>
                          <td className="p-2 text-gray-900 dark:text-gray-100">
                            {p.title}
                          </td>
                          <td className="p-2 text-gray-600 dark:text-gray-400 text-sm">
                            {p.property ? (
                              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                                {p.property}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-gray-900 dark:text-gray-100">
                            {p.price_card && Number(p.price_card) < Number(p.price) ? (
                              <div>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {Number(p.price_card).toFixed(2)} TL
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 line-through ml-2">
                                  {Number(p.price).toFixed(2)} TL
                                </span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                  (Card)
                                </span>
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
        </div>
      </main>
    </>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </main>
      }
    >
      <CartContent />
    </Suspense>
  );
}