/**
 * Setup file for Vitest tests
 */
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpiar después de cada test
afterEach(() => {
  cleanup();
});

// Mock de ResizeObserver (requerido por Recharts)
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock de window.supabaseClient para tests
global.window = global.window || {};
global.window.supabaseClient = {
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
};

// Mock de localStorage con implementación real
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
global.localStorage = localStorageMock;
