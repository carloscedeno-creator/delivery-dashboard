/**
 * Tests unitarios para Login component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../src/components/Login';

// Mock de authService
const mockLogin = vi.fn();
vi.mock('../../src/utils/authService.js', () => ({
    login: (...args) => mockLogin(...args)
}));

describe('Login', () => {
    const mockOnLoginSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el formulario de login correctamente', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        expect(screen.getByText(/Sign in to continue/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('debe actualizar el campo de email cuando se escribe', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        
        expect(emailInput.value).toBe('test@example.com');
    });

    it('debe actualizar el campo de password cuando se escribe', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        
        expect(passwordInput.value).toBe('password123');
    });

    it('debe llamar onLoginSuccess cuando el login es exitoso', async () => {
        const mockUser = {
            id: '1',
            email: 'test@example.com',
            role: 'admin'
        };
        
        mockLogin.mockResolvedValue({
            success: true,
            user: mockUser
        });

        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
        });
    });

    it('debe mostrar error cuando el login falla', async () => {
        mockLogin.mockResolvedValue({
            success: false,
            error: 'Invalid credentials'
        });

        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
        });
        
        expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it('debe mostrar loading state mientras se procesa el login', async () => {
        mockLogin.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ success: true, user: {} }), 100))
        );

        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
        
        // Debería mostrar "Signing in..." mientras carga
        expect(screen.getByText(/Signing in/i)).toBeInTheDocument();
        
        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalled();
        });
    });

    it('debe deshabilitar el botón mientras se procesa el login', async () => {
        mockLogin.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ success: true, user: {} }), 100))
        );

        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
        
        expect(submitButton).toBeDisabled();
        
        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalled();
        });
    });

    it('debe validar que los campos son requeridos', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        
        const emailInput = screen.getByLabelText(/Email/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        
        expect(emailInput).toHaveAttribute('required');
        expect(passwordInput).toHaveAttribute('required');
    });
});


