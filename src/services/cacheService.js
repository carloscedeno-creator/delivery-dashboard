/**
 * Cache Service - Sistema de cache inteligente para Delivery Dashboard
 * Framework: Ralph-Compounding / Agentic Engineering
 * ENH-001: Add Data Caching Layer
 */

// TTL Configuration (seconds)
const CACHE_TTL = {
  KPIs: 300,        // 5 minutes - KPIs change frequently
  SprintData: 600,  // 10 minutes - Sprint data moderately stable
  StaticData: 3600  // 1 hour - Static data very stable
};

class CacheService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();

    // Initialize from sessionStorage on load
    this.loadFromSessionStorage();

    // Set up Supabase realtime invalidation
    this.setupRealtimeInvalidation();

    // Set up offline detection
    this.setupOfflineDetection();
  }

  /**
   * Set cache entry with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds
   */
  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    const cacheEntry = {
      value,
      expiresAt,
      createdAt: Date.now()
    };

    this.cache.set(key, cacheEntry);
    this.saveToSessionStorage(key, cacheEntry);

    // Set up automatic expiration
    setTimeout(() => {
      this.invalidate(key);
    }, ttlSeconds * 1000);

    return true;
  }

  /**
   * Get cache entry (returns null if not exists or expired)
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.invalidate(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Invalidate specific cache key
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    this.cache.delete(key);
    this.removeFromSessionStorage(key);

    // Notify listeners
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(callback => callback(key));

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.clearSessionStorage();

    // Notify all listeners
    this.listeners.forEach((listeners, key) => {
      listeners.forEach(callback => callback(key));
    });

    return true;
  }

  /**
   * Set up Supabase realtime invalidation
   * Listens for postgres_changes events and invalidates relevant cache
   */
  setupRealtimeInvalidation() {
    // This will be integrated with Supabase client
    // For now, we set up the infrastructure
    this.realtimeChannel = null;

    // Cache invalidation patterns for different table changes
    this.invalidationPatterns = {
      'sprints': ['sprint-', 'sprintData-', 'kpi-'],
      'issues': ['issue-', 'sprint-', 'kpi-'],
      'squad_capacity': ['capacity-', 'sprint-', 'kpi-'],
      'developers': ['developer-', 'kpi-'],
      'teams': ['team-', 'kpi-']
    };
  }

  /**
   * Handle Supabase realtime events
   * @param {Object} payload - Supabase realtime payload
   */
  handleRealtimeEvent(payload) {
    const { table, eventType, new: newRecord, old: oldRecord } = payload;

    if (!this.invalidationPatterns[table]) {
      return;
    }

    // Invalidate cache keys that match the patterns
    const patterns = this.invalidationPatterns[table];

    patterns.forEach(pattern => {
      // Find and invalidate all keys matching this pattern
      for (const [key] of this.cache) {
        if (key.startsWith(pattern)) {
          this.invalidate(key);
        }
      }
    });

    console.log(`[CacheService] Invalidated cache for table: ${table}, event: ${eventType}`);
  }

  /**
   * Set up offline detection
   */
  setupOfflineDetection() {
    // Only set up offline detection in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[CacheService] Back online - cache operational');
      });

      window.addEventListener('offline', () => {
        console.log('[CacheService] Offline mode - using cached data only');
      });
    }
  }

  /**
   * Load cache from sessionStorage
   */
  loadFromSessionStorage() {
    try {
      // Check if sessionStorage is available (browser environment)
      if (typeof sessionStorage !== 'undefined') {
        const cacheData = sessionStorage.getItem('deliveryDashboard_cache');
        if (cacheData) {
          const parsedCache = JSON.parse(cacheData);
          const now = Date.now();

          // Only load non-expired entries
          Object.entries(parsedCache).forEach(([key, entry]) => {
            if (now < entry.expiresAt) {
              this.cache.set(key, entry);
            }
          });

          console.log(`[CacheService] Loaded ${this.cache.size} entries from sessionStorage`);
        }
      }
    } catch (error) {
      console.warn('[CacheService] Failed to load from sessionStorage:', error);
    }
  }

  /**
   * Save cache entry to sessionStorage
   * @param {string} key - Cache key
   * @param {Object} entry - Cache entry
   */
  saveToSessionStorage(key, entry) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cacheData = sessionStorage.getItem('deliveryDashboard_cache') || '{}';
        const parsedCache = JSON.parse(cacheData);
        parsedCache[key] = entry;
        sessionStorage.setItem('deliveryDashboard_cache', JSON.stringify(parsedCache));
      }
    } catch (error) {
      console.warn('[CacheService] Failed to save to sessionStorage:', error);
    }
  }

  /**
   * Remove cache entry from sessionStorage
   * @param {string} key - Cache key
   */
  removeFromSessionStorage(key) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cacheData = sessionStorage.getItem('deliveryDashboard_cache');
        if (cacheData) {
          const parsedCache = JSON.parse(cacheData);
          delete parsedCache[key];
          sessionStorage.setItem('deliveryDashboard_cache', JSON.stringify(parsedCache));
        }
      }
    } catch (error) {
      console.warn('[CacheService] Failed to remove from sessionStorage:', error);
    }
  }

  /**
   * Clear all sessionStorage cache
   */
  clearSessionStorage() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('deliveryDashboard_cache');
      }
    } catch (error) {
      console.warn('[CacheService] Failed to clear sessionStorage:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      totalEntries++;
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
      // Rough size calculation
      totalSize += JSON.stringify(entry).length;
    }

    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      totalSizeBytes: totalSize,
      hitRate: 0 // Would need to track hits/misses for this
    };
  }

  /**
   * Add event listener for cache invalidation
   * @param {string} key - Cache key to listen for
   * @param {Function} callback - Callback function
   */
  addInvalidationListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} key - Cache key
   * @param {Function} callback - Callback function to remove
   */
  removeInvalidationListener(key, callback) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Make cacheService globally available for testing and debugging
if (typeof window !== 'undefined') {
  window.cacheService = cacheService;
}

// Export methods individually and as default
export const set = (key, value, ttlSeconds = 300) => cacheService.set(key, value, ttlSeconds);
export const get = (key) => cacheService.get(key);
export const invalidate = (key) => cacheService.invalidate(key);
export const clear = () => cacheService.clear();

export { CACHE_TTL };
export default cacheService;