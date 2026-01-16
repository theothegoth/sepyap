import axios from 'axios';
import { apiCache } from './apiCache';

// API URL configuration
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const currentHostname = isBrowser ? window.location.hostname : '';
  const protocol = isBrowser ? window.location.protocol : 'http:';

  const isInternalOrOldIP = (url: string) => {
    if (!url) return true;
    if (url.includes('backend:')) return true; // Docker internal
    if (url.includes('127.0.0.1') || url.includes('localhost')) {
      return currentHostname !== 'localhost' && currentHostname !== '127.0.0.1';
    }
    // Eğer URL bir IP içeriyorsa ve o IP şu anki host değilse eski kalmış olabilir
    const ipMatch = url.match(/\d+\.\d+\.\d+\.\d+/);
    if (ipMatch && currentHostname && !currentHostname.includes(ipMatch[0])) {
      return true;
    }
    return false;
  };

  // Eğer çevresel değişken varsa ve geçerli/güncel bir URL gibi duruyorsa kullan
  if (envUrl && envUrl.startsWith('http') && !isInternalOrOldIP(envUrl)) {
    return envUrl;
  }

  // Tahmin yürüt
  if (isBrowser) {
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      return 'http://127.0.0.1:3005/api';
    }
    return `${protocol}//${currentHostname}:3000/api`;
  }

  return 'http://127.0.0.1:3005/api';
};

const API_URL = getApiUrl();

const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds default
});

// Special axios instance for ingest operations (handles large batches up to 2000 products)
const ingestAxiosInstance = axios.create({
  timeout: 5 * 60 * 1000, // 5 minutes for large product batches
});

export interface CartItem {
  query?: string;
  productId?: number;
  productTitle?: string;
  quantity: number;
}

export interface Product {
  id: number;
  canonical_title: string;
  category: string | null;
  image_url: string | null;
}

export interface MarketProduct {
  marketName: string;
  title: string;
  price: number;
  priceCard: number | null;
  property: string | null;
  url: string | null;
  imageUrl: string | null;
  effectivePrice: number;
}

export interface PriceComparison {
  productId: number;
  productTitle: string;
  markets: MarketProduct[];
  cheapest: {
    marketName: string;
    price: number;
  } | null;
}

export const api = {
  optimize: async (
    cartItems: CartItem[],
    includeBrands?: string[],
    excludeBrands?: string[],
    allowedMarkets?: string[],
  ) => {
    const payload: any = { items: cartItems };
    if (includeBrands && includeBrands.length > 0) payload.includeBrands = includeBrands;
    if (excludeBrands && excludeBrands.length > 0) payload.excludeBrands = excludeBrands;
    if (allowedMarkets && allowedMarkets.length > 0) payload.allowedMarkets = allowedMarkets;
    return axiosInstance.post(`${API_URL}/optimize`, payload);
  },

  debug: async (limit?: number) => {
    const url = limit
      ? `${API_URL}/ingest/debug?limit=${limit}`
      : `${API_URL}/ingest/debug?limit=5000`;
    return axiosInstance.get(url);
  },

  stats: async () => {
    return axiosInstance.get(`${API_URL}/ingest/stats`);
  },

  getMarkets: async () => {
    const cacheKey = 'markets:all';
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/markets`),
      30 * 60 * 1000, // 30 minutes cache (markets don't change often)
    );
  },

  ingest: async (products: any[]) => {
    // Use special axios instance with longer timeout for large batches
    return ingestAxiosInstance.post(`${API_URL}/ingest`, { items: products });
  },

  searchProducts: async (
    query: string,
    limit: number = 20,
    includeBrands?: string[],
    excludeBrands?: string[],
    strict?: boolean,
    allowedMarkets?: string[],
  ) => {
    const params: any = { q: query };
    if (limit) params.limit = limit;
    if (includeBrands && includeBrands.length > 0)
      params.includeBrands = includeBrands.join(',');
    if (excludeBrands && excludeBrands.length > 0)
      params.excludeBrands = excludeBrands.join(',');
    if (allowedMarkets && allowedMarkets.length > 0)
      params.allowedMarkets = allowedMarkets.join(',');
    if (strict !== undefined) params.strict = strict ? 'true' : 'false';

    const cacheKey = `search:${query}:${limit}:${includeBrands?.join(',')}:${excludeBrands?.join(
      ',',
    )}:${strict}:${allowedMarkets?.join(',')}`;

    return apiCache.get(
      cacheKey,
      () =>
        axiosInstance.get(`${API_URL}/matching/search`, {
          params,
          paramsSerializer: { indexes: null },
        }),
      2 * 60 * 1000,
    );
  },

  compareProduct: async (productId: number) => {
    const cacheKey = `compare:${productId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/products/${productId}/compare`),
      5 * 60 * 1000,
    );
  },

  getProductMarkets: async (productId: number) => {
    return axiosInstance.get(`${API_URL}/matching/product/${productId}/markets`);
  },

  getPriceHistory: async (productId: number, days: number = 30) => {
    const cacheKey = `priceHistory:${productId}:${days}`;
    return apiCache.get(
      cacheKey,
      () =>
        axiosInstance.get(`${API_URL}/price-history/product/${productId}`, {
          params: { days },
        }),
      5 * 60 * 1000,
    );
  },

  getPriceTrends: async (marketProductId: number, days: number = 30) => {
    return axiosInstance.get(`${API_URL}/price-history/trends/${marketProductId}`, {
      params: { days },
    });
  },

  addToWatchlist: async (
    userId: string,
    productId: number,
    targetPrice?: number,
    targetPercent?: number,
  ) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/watchlist`, {
      userId,
      productId,
      targetPrice,
      targetPercent,
    });
    apiCache.invalidatePattern(`watchlist:${userId}`);
    return result;
  },

  removeFromWatchlist: async (userId: string, productId: number) => {
    const result = await axiosInstance.delete(
      `${API_URL}/alerts/watchlist/${userId}/${productId}`,
    );
    apiCache.invalidatePattern(`watchlist:${userId}`);
    return result;
  },

  getWatchlist: async (userId: string) => {
    const cacheKey = `watchlist:${userId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/alerts/watchlist/${userId}`),
      1 * 60 * 1000,
    );
  },

  getAlerts: async (userId: string, unreadOnly: boolean = false) => {
    const cacheKey = `alerts:${userId}:${unreadOnly}`;
    return apiCache.get(
      cacheKey,
      () =>
        axiosInstance.get(`${API_URL}/alerts/${userId}`, {
          params: { unreadOnly: unreadOnly ? 'true' : 'false' },
        }),
      30 * 1000,
    );
  },

  markAlertAsRead: async (alertId: number, userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${alertId}/read`, {
      userId,
    });
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  dismissAlert: async (alertId: number, userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${alertId}/dismiss`, {
      userId,
    });
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  getAlertStats: async (userId: string) => {
    const cacheKey = `alertStats:${userId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/alerts/${userId}/stats`),
      1 * 60 * 1000,
    );
  },

  markAllAlertsAsRead: async (userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${userId}/read-all`);
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  dismissAllAlerts: async (userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${userId}/dismiss-all`);
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  // Admin check (server-side validation)
  checkAdmin: async (secret: string) => {
    return axiosInstance.post(`${API_URL}/admin/check`, { secret });
  },
};