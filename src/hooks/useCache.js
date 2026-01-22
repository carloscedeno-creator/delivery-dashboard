/**
 * useCache Hook - React hook para gestión de cache
 * Framework: Ralph-Compounding / Agentic Engineering
 * ENH-001: Add Data Caching Layer
 */

import { useState, useEffect, useCallback } from 'react';
import cacheService from '../services/cacheService.js';
import { CACHE_TTL } from '../services/cacheService.js';

/**
 * Custom hook para gestión de cache con estado React
 * @param {string} key - Cache key
 * @param {any} initialValue - Valor inicial si no hay cache
 * @param {number} ttlSeconds - TTL en segundos (opcional)
 * @returns {Object} { data, setData, invalidate, isLoading, error }
 */
export function useCache(key, initialValue = null, ttlSeconds = CACHE_TTL.KPIs) {
  // Estado para el valor cacheado
  const [data, setData] = useState(() => {
    // Intentar cargar desde cache inicialmente
    return cacheService.get(key) || initialValue;
  });

  // Estado para loading
  const [isLoading, setIsLoading] = useState(false);

  // Estado para errores
  const [error, setError] = useState(null);

  // Estado para trackear si el cache fue invalidado
  const [cacheInvalidated, setCacheInvalidated] = useState(false);

  /**
   * Set data in cache and state
   * @param {any} value - Value to cache
   * @param {number} customTTL - Custom TTL (optional)
   */
  const setCacheData = useCallback((value, customTTL = ttlSeconds) => {
    try {
      setError(null);
      setIsLoading(true);

      // Set in cache
      cacheService.set(key, value, customTTL);

      // Update local state
      setData(value);
      setCacheInvalidated(false);

    } catch (err) {
      setError(err);
      console.error('[useCache] Error setting cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, [key, ttlSeconds]);

  /**
   * Invalidate cache for this key
   */
  const invalidate = useCallback(() => {
    try {
      cacheService.invalidate(key);
      setCacheInvalidated(true);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('[useCache] Error invalidating cache:', err);
    }
  }, [key]);

  /**
   * Refresh data (force reload)
   * @param {Function} fetchFunction - Function to fetch fresh data
   * @param {number} customTTL - Custom TTL for new data
   */
  const refresh = useCallback(async (fetchFunction, customTTL = ttlSeconds) => {
    if (!fetchFunction) return;

    try {
      setError(null);
      setIsLoading(true);

      // Fetch fresh data
      const freshData = await fetchFunction();

      // Cache it
      setCacheData(freshData, customTTL);

    } catch (err) {
      setError(err);
      console.error('[useCache] Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setCacheData, ttlSeconds]);

  /**
   * Get cached data with fallback
   * @param {Function} fallbackFunction - Function to call if cache miss
   * @returns {Promise<any>} Cached or fresh data
   */
  const getWithFallback = useCallback(async (fallbackFunction) => {
    try {
      setError(null);
      setIsLoading(true);

      // Try cache first
      let cachedData = cacheService.get(key);
      if (cachedData !== null) {
        setData(cachedData);
        return cachedData;
      }

      // Cache miss - fetch fresh data
      if (fallbackFunction) {
        const freshData = await fallbackFunction();
        setData(freshData, ttlSeconds);
        return freshData;
      }

      return null;

    } catch (err) {
      setError(err);
      console.error('[useCache] Error with fallback:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [key, setCacheData, ttlSeconds]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleInvalidation = (invalidatedKey) => {
      if (invalidatedKey === key) {
        setCacheInvalidated(true);
      }
    };

    cacheService.addInvalidationListener(key, handleInvalidation);

    return () => {
      cacheService.removeInvalidationListener(key, handleInvalidation);
    };
  }, [key]);

  // Sync with cache changes
  useEffect(() => {
    const checkCache = () => {
      const cachedValue = cacheService.get(key);
      if (cachedValue !== data && !cacheInvalidated) {
        setData(cachedValue);
      }
    };

    // Check cache periodically (every 30 seconds)
    const interval = setInterval(checkCache, 30000);

    return () => clearInterval(interval);
  }, [key, data, cacheInvalidated]);

  return {
    data,
    setCacheData,
    invalidate,
    refresh,
    getWithFallback,
    isLoading,
    error,
    cacheInvalidated,
    // Utility methods
    hasData: data !== null && data !== undefined,
    isExpired: cacheInvalidated,
    cacheStats: cacheService.getStats()
  };
}

/**
 * Hook for cache statistics
 * @returns {Object} Cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState(cacheService.getStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheService.getStats());
    };

    // Update stats every 60 seconds
    const interval = setInterval(updateStats, 60000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

export default useCache;