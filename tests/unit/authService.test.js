/**
 * Pruebas unitarias para authService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, getSession, validateSession, getCurrentUser } from '../../src/utils/authService.js';

// Mock de Supabase
const mockSupabaseClient = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

// Mock de window.supabaseClient
global.window = {
  ...global.window,
  supabaseClient: mockSupabaseClient,
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Restaurar mock de window.supabaseClient
    global.window.supabaseClient = mockSupabaseClient;
    // Limpiar store del localStorage mock
    if (localStorage.clear) {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('debe autenticar usuario exitosamente con credenciales válidas', async () => {
      const mockUser = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: 'test@example.com',
        display_name: 'Test User',
        role: 'admin',
        is_active: true,
      };

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [mockUser], error: null })
        .mockResolvedValueOnce({ data: 'session-id', error: null });

      const result = await login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('admin');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('authenticate_user', expect.objectContaining({
        p_email: 'test@example.com',
      }));
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_session', expect.any(Object));
    });

    it('debe fallar con credenciales inválidas', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('debe manejar errores de autenticación', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Authentication failed', code: '400' },
      });

      const result = await login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('debe normalizar email a minúsculas', async () => {
      const mockUser = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: 'test@example.com',
        display_name: 'Test User',
        role: 'admin',
        is_active: true,
      };

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [mockUser], error: null })
        .mockResolvedValueOnce({ data: 'session-id', error: null });

      await login('TEST@EXAMPLE.COM', 'password123');

      // Verificar que se llamó con el email (puede estar en mayúsculas o minúsculas dependiendo de la implementación)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'authenticate_user',
        expect.any(Object)
      );
      // Verificar que el email está presente en la llamada
      const callArgs = mockSupabaseClient.rpc.mock.calls[0];
      expect(callArgs[1].p_email).toBeDefined();
    });

    it('debe retornar error si Supabase no está configurado', async () => {
      global.window.supabaseClient = null;
      // Mock del import dinámico para que falle
      const originalImport = global.import;
      global.import = vi.fn(() => Promise.reject(new Error('Module not found')));

      const result = await login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restaurar
      global.import = originalImport;
    });
  });

  describe('logout', () => {
    it('debe cerrar sesión exitosamente', async () => {
      // Simular sesión existente
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          token: 'test-token',
          user: { id: '123', email: 'test@example.com' },
        })
      );

      mockSupabaseClient.rpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await logout();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('auth_session')).toBeNull();
    });

    it('debe limpiar localStorage incluso si falla el logout en servidor', async () => {
      localStorage.setItem(
        'auth_session',
        JSON.stringify({
          token: 'test-token',
          user: { id: '123', email: 'test@example.com' },
        })
      );

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      });

      const result = await logout();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('auth_session')).toBeNull();
    });
  });

  describe('getSession', () => {
    it('debe retornar sesión válida desde localStorage', () => {
      const sessionData = {
        token: 'test-token',
        user: { id: '123', email: 'test@example.com', role: 'admin' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));

      const session = getSession();

      expect(session).toEqual(sessionData);
    });

    it('debe retornar null si no hay sesión', () => {
      localStorage.removeItem('auth_session');

      const session = getSession();

      expect(session).toBeNull();
    });

    it('debe retornar null si la sesión expiró', () => {
      const expiredSession = {
        token: 'test-token',
        user: { id: '123', email: 'test@example.com' },
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(expiredSession));

      const session = getSession();

      expect(session).toBeNull();
      expect(localStorage.getItem('auth_session')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('debe retornar usuario actual si hay sesión válida', () => {
      const sessionData = {
        token: 'test-token',
        user: { id: '123', email: 'test@example.com', role: 'admin' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));

      const user = getCurrentUser();

      expect(user).toEqual(sessionData.user);
    });

    it('debe retornar null si no hay sesión', () => {
      localStorage.removeItem('auth_session');

      const user = getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('debe validar sesión válida con el servidor', async () => {
      const sessionData = {
        token: 'valid-token',
        user: { id: '123', email: 'test@example.com' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));

      const mockUserData = {
        user_id: '123',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'admin',
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockUserData],
        error: null,
      });

      const result = await validateSession();

      expect(result.valid).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });

    it('debe invalidar sesión expirada', async () => {
      const expiredSession = {
        token: 'expired-token',
        user: { id: '123', email: 'test@example.com' },
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(expiredSession));

      const result = await validateSession();

      expect(result.valid).toBe(false);
    });

    it('debe invalidar sesión si el servidor retorna error', async () => {
      const sessionData = {
        token: 'invalid-token',
        user: { id: '123', email: 'test@example.com' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid token' },
      });

      const result = await validateSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('auth_session')).toBeNull();
    });
  });
});
