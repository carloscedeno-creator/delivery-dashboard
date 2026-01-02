/**
 * Tests unitarios para UserAdministration component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import UserAdministration from '../../src/components/UserAdministration';

// Mock de supabase - debe estar definido antes del vi.mock
vi.mock('../../src/utils/supabaseApi', () => {
    const mockSupabase = {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
        })),
        rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
    };
    
    return {
        supabase: mockSupabase
    };
});

describe('UserAdministration', () => {
    const mockCurrentUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el componente correctamente', async () => {
        const { supabase } = await import('../../src/utils/supabaseApi');
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            })
        });

        await act(async () => {
            render(<UserAdministration currentUser={mockCurrentUser} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText(/User Administration/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('debe mostrar loading inicialmente', async () => {
        const { supabase } = await import('../../src/utils/supabaseApi');
        // Mock que resuelve lentamente para mantener el estado de loading
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn(() => new Promise(resolve => {
                    // Delay para mantener el estado de loading
                    setTimeout(() => resolve({ data: [], error: null }), 100);
                }))
            })
        });

        let container;
        await act(async () => {
            const result = render(<UserAdministration currentUser={mockCurrentUser} />);
            container = result.container;
        });
        
        // El componente muestra un spinner mientras carga
        // Verificar inmediatamente después del render antes de que termine la carga
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeTruthy();
        
        // Esperar a que termine la carga
        await waitFor(() => {
            expect(screen.queryByText(/User Administration/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('debe manejar errores de carga correctamente', async () => {
        const { supabase } = await import('../../src/utils/supabaseApi');
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockRejectedValue(new Error('Network error'))
            })
        });

        await act(async () => {
            render(<UserAdministration currentUser={mockCurrentUser} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText(/Error loading users/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('debe cargar usuarios desde app_users cuando está disponible', async () => {
        const mockUsers = [
            {
                id: '1',
                email: 'user1@test.com',
                display_name: 'User One',
                role: 'Regular',
                is_active: true,
                last_login_at: '2025-12-30T10:00:00Z',
                created_at: '2025-01-01T00:00:00Z'
            },
            {
                id: '2',
                email: 'user2@test.com',
                display_name: 'User Two',
                role: 'PM',
                is_active: false,
                last_login_at: null,
                created_at: '2025-01-02T00:00:00Z'
            }
        ];

        const { supabase } = await import('../../src/utils/supabaseApi');
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: mockUsers,
                    error: null
                })
            })
        });

        await act(async () => {
            render(<UserAdministration currentUser={mockCurrentUser} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
            expect(screen.getByText('user1@test.com')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('debe mapear correctamente los campos de app_users', async () => {
        const mockAppUsers = [
            {
                id: '1',
                email: 'test@test.com',
                name: 'Test User', // Campo alternativo
                role: 'admin',
                status: 'active', // Campo alternativo para is_active
                updated_at: '2025-12-30T10:00:00Z', // Campo alternativo para last_login_at
                created_at: '2025-01-01T00:00:00Z'
            }
        ];

        const { supabase } = await import('../../src/utils/supabaseApi');
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: mockAppUsers,
                    error: null
                })
            })
        });

        await act(async () => {
            render(<UserAdministration currentUser={mockCurrentUser} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('debe mostrar mensaje cuando no hay usuarios', async () => {
        const { supabase } = await import('../../src/utils/supabaseApi');
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            })
        });

        await act(async () => {
            render(<UserAdministration currentUser={mockCurrentUser} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText(/No users found/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});

