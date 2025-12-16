// Simple in-memory cache for API requests
// Prevents duplicate requests and provides basic caching

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  // Generate cache key from URL and params
  private getCacheKey(url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${url}${paramsStr}`;
  }

  // Check if entry is still valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  // Get cached data or execute request
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const entry = this.cache.get(key);

    // Return cached data if valid
    if (entry && this.isValid(entry)) {
      return entry.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Execute request and cache result
    const promise = fetcher().then((data) => {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Invalidate cache entry
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate all cache
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Invalidate cache by pattern
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new ApiCache();

