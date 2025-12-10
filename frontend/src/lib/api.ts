import axios from 'axios';
import { apiCache } from './apiCache';

// API URL configuration
// When running in browser, use host machine address (127.0.0.1:3005)
// Can be overridden with NEXT_PUBLIC_API_URL environment variable
// Note: Browser cannot resolve Docker service names like "backend", must use localhost/127.0.0.1
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('backend')) {
    return envUrl;
  }
  // Default to localhost for browser access
  return 'http://127.0.0.1:3005/api';
};

const API_URL = getApiUrl();

// Create axios instance with default config
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
});

export interface CartItem {
  query?: string;
  productId?: number;
  productTitle?: string; // Product name for display when adding by productId
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
  optimize: async (cartItems: CartItem[], includeBrands?: string[], excludeBrands?: string[]) => {
    const payload: any = { items: cartItems };
    if (includeBrands && includeBrands.length > 0) payload.includeBrands = includeBrands;
    if (excludeBrands && excludeBrands.length > 0) payload.excludeBrands = excludeBrands;
    return axiosInstance.post(`${API_URL}/optimize`, payload);
  },
  
  debug: async (limit?: number) => {
    const url = limit ? `${API_URL}/ingest/debug?limit=${limit}` : `${API_URL}/ingest/debug?limit=5000`;
    return axiosInstance.get(url);
  },
  
  stats: async () => {
    return axiosInstance.get(`${API_URL}/ingest/stats`);
  },
  
  ingest: async (products: any[]) => {
    return axiosInstance.post(`${API_URL}/ingest`, { items: products });
  },

  // Product search (with caching)
  searchProducts: async (query: string, limit: number = 20, includeBrands?: string[], excludeBrands?: string[]) => {
    const params: any = { q: query };
    if (limit) params.limit = limit;
    if (includeBrands && includeBrands.length > 0) params.includeBrands = includeBrands.join(',');
    if (excludeBrands && excludeBrands.length > 0) params.excludeBrands = excludeBrands.join(',');
    
    const cacheKey = `search:${query}:${limit}:${includeBrands?.join(',')}:${excludeBrands?.join(',')}`;
    
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/matching/search`, { 
        params,
        paramsSerializer: { indexes: null }
      }),
      2 * 60 * 1000 // 2 minutes cache for search results
    );
  },

  // Product comparison (with caching)
  compareProduct: async (productId: number) => {
    const cacheKey = `compare:${productId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/products/${productId}/compare`),
      5 * 60 * 1000 // 5 minutes cache for product comparisons
    );
  },

  // Get markets for a product
  getProductMarkets: async (productId: number) => {
    return axiosInstance.get(`${API_URL}/matching/product/${productId}/markets`);
  },

  // Price history (with caching)
  getPriceHistory: async (productId: number, days: number = 30) => {
    const cacheKey = `priceHistory:${productId}:${days}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/price-history/product/${productId}`, { params: { days } }),
      5 * 60 * 1000 // 5 minutes cache for price history
    );
  },

  getPriceTrends: async (marketProductId: number, days: number = 30) => {
    return axiosInstance.get(`${API_URL}/price-history/trends/${marketProductId}`, { params: { days } });
  },

  // Watchlist
  addToWatchlist: async (userId: string, productId: number, targetPrice?: number, targetPercent?: number) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/watchlist`, {
      userId,
      productId,
      targetPrice,
      targetPercent
    });
    // Invalidate watchlist cache
    apiCache.invalidatePattern(`watchlist:${userId}`);
    return result;
  },

  removeFromWatchlist: async (userId: string, productId: number) => {
    const result = await axiosInstance.delete(`${API_URL}/alerts/watchlist/${userId}/${productId}`);
    // Invalidate watchlist cache
    apiCache.invalidatePattern(`watchlist:${userId}`);
    return result;
  },

  getWatchlist: async (userId: string) => {
    const cacheKey = `watchlist:${userId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/alerts/watchlist/${userId}`),
      1 * 60 * 1000 // 1 minute cache for watchlist
    );
  },

  // Alerts
  getAlerts: async (userId: string, unreadOnly: boolean = false) => {
    const cacheKey = `alerts:${userId}:${unreadOnly}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/alerts/${userId}`, { params: { unreadOnly: unreadOnly ? 'true' : 'false' } }),
      30 * 1000 // 30 seconds cache for alerts
    );
  },

  markAlertAsRead: async (alertId: number, userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${alertId}/read`, { userId });
    // Invalidate alerts cache
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  dismissAlert: async (alertId: number, userId: string) => {
    const result = await axiosInstance.post(`${API_URL}/alerts/${alertId}/dismiss`, { userId });
    // Invalidate alerts cache
    apiCache.invalidatePattern(`alerts:${userId}`);
    return result;
  },

  getAlertStats: async (userId: string) => {
    const cacheKey = `alertStats:${userId}`;
    return apiCache.get(
      cacheKey,
      () => axiosInstance.get(`${API_URL}/alerts/${userId}/stats`),
      1 * 60 * 1000 // 1 minute cache for alert stats
    );
  }
};
