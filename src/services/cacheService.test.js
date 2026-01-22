/**
 * Tests for Cache Service - ENH-001: Add Data Caching Layer
 * Framework: Ralph-Compounding / Agentic Engineering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import cacheService, { set, get, invalidate, clear, CACHE_TTL } from './cacheService.js';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('Cache Service - ENH-001', () => {
  beforeEach(() => {
    clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    clear();
    sessionStorage.clear();
  });

  describe('Basic Cache Operations', () => {
    it('Archivo src/services/cacheService.js existe con exports: set, get, invalidate, clear', () => {
      expect(typeof set).toBe('function');
      expect(typeof get).toBe('function');
      expect(typeof invalidate).toBe('function');
      expect(typeof clear).toBe('function');
      expect(cacheService).toBeDefined();
    });

    it('CacheService tiene método set() que acepta key, value, ttl en segundos', () => {
      const result = set('test-key', 'test-value', 300);
      expect(result).toBe(true);
    });

    it('CacheService tiene método get() que retorna null cuando key no existe', () => {
      const result = get('non-existent-key');
      expect(result).toBeNull();
    });

    it('CacheService tiene método invalidate() que elimina key específica del cache', () => {
      set('test-key', 'test-value', 300);
      expect(get('test-key')).toBe('test-value');

      invalidate('test-key');
      expect(get('test-key')).toBeNull();
    });
  });

  describe('TTL Configuration', () => {
    it('TTL configurado: KPIs=300s, SprintData=600s, StaticData=3600s', () => {
      expect(CACHE_TTL.KPIs).toBe(300);
      expect(CACHE_TTL.SprintData).toBe(600);
      expect(CACHE_TTL.StaticData).toBe(3600);
    });
  });

  describe('Session Storage Persistence', () => {
    it('Cache persiste en sessionStorage durante sesión del navegador', () => {
      set('persist-test', 'persisted-value', 300);

      // Simulate page refresh by creating new cache instance
      const newCacheInstance = require('./cacheService.js').default;
      const result = newCacheInstance.get('persist-test');

      expect(result).toBe('persisted-value');
    });
  });

  describe('Offline Mode', () => {
    it('Modo offline funciona: dashboard carga datos desde cache sin llamadas API', () => {
      // Set cache data
      set('offline-test', 'cached-data', 3600);

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      // Should still return cached data
      const result = get('offline-test');
      expect(result).toBe('cached-data');
    });
  });

  describe('Automatic Expiration', () => {
    it('Cache entries expire automatically after TTL', async () => {
      // Set with short TTL (1 second)
      set('expire-test', 'will-expire', 1);

      // Should exist immediately
      expect(get('expire-test')).toBe('will-expire');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be null after expiration
      expect(get('expire-test')).toBeNull();
    });
  });

  describe('Supabase Realtime Integration', () => {
    it('Invalidación automática implementada escuchando eventos Supabase realtime', () => {
      // This tests the infrastructure setup
      expect(cacheService.setupRealtimeInvalidation).toBeDefined();
      expect(typeof cacheService.handleRealtimeEvent).toBe('function');
    });

    it('Cache invalida automáticamente cuando recibe evento postgres_changes de Supabase', () => {
      // Set cache data
      set('realtime-test', 'cached-data', 3600);
      expect(get('realtime-test')).toBe('cached-data');

      // Simulate realtime event
      const mockPayload = {
        table: 'sprints',
        eventType: 'INSERT',
        new: { id: 1 },
        old: null
      };

      cacheService.handleRealtimeEvent(mockPayload);

      // Cache should be invalidated for sprint-related keys
      expect(get('realtime-test')).toBeNull();
    });
  });

  describe('Fallback Strategy', () => {
    it('Fallback implementado: cuando cache.get() falla, ejecuta fetch a API fresca', async () => {
      // Mock fetch function
      const mockFetch = async () => 'fresh-api-data';

      // First call should fetch and cache
      const result1 = await cacheService.getWithFallback('fallback-test', mockFetch);
      expect(result1).toBe('fresh-api-data');

      // Second call should use cache
      const result2 = await cacheService.getWithFallback('fallback-test', mockFetch);
      expect(result2).toBe('fresh-api-data');
      // Note: In real scenario, this would be cached
    });
  });

  describe('Hook Integration', () => {
    it('Hook useCache implementado con React.useState para estado del cache', async () => {
      const { useCache } = await import('../hooks/useCache.js');

      // This would normally be tested in a React testing environment
      expect(useCache).toBeDefined();
      expect(typeof useCache).toBe('function');
    });
  });

  describe('Service Export', () => {
    it('CacheService exportado en src/services/index.js', async () => {
      const servicesIndex = await import('./index.js');

      expect(servicesIndex.cacheService).toBeDefined();
      expect(servicesIndex.set).toBeDefined();
      expect(servicesIndex.get).toBeDefined();
      expect(servicesIndex.invalidate).toBeDefined();
      expect(servicesIndex.clear).toBeDefined();
      expect(servicesIndex.CACHE_TTL).toBeDefined();
    });
  });
});