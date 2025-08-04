/**
 * Browser-only cache implementation
 * Safe for client-side use without Node.js dependencies
 */

interface CacheItem {
  value: unknown
  expiry: number
}

class BrowserCache {
  private cache = new Map<string, CacheItem>()
  private maxSize = 100

  get(key: string): unknown | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  set(key: string, value: unknown, ttlSeconds: number = 300): void {
    // Clean up expired items if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }

  getStats(): { size: number } {
    return {
      size: this.cache.size
    }
  }
}

// Singleton browser cache instance
const browserCache = new BrowserCache()

// Browser-safe cache functions
export async function getBrowserCache(key: string): Promise<unknown | null> {
  return browserCache.get(key)
}

export async function setBrowserCache(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
  browserCache.set(key, value, ttlSeconds)
}

export async function deleteBrowserCache(key: string): Promise<void> {
  browserCache.delete(key)
}

export function clearBrowserCache(): void {
  browserCache.clear()
}

export function getBrowserCacheStats(): { size: number } {
  return browserCache.getStats()
}

// Auto-cleanup every 5 minutes (only set up once)
let cleanupInterval: NodeJS.Timeout | null = null;
if (typeof window !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(() => browserCache.cleanup(), 5 * 60 * 1000);
  
  // Clean up interval when page unloads
  window.addEventListener('beforeunload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });
} 