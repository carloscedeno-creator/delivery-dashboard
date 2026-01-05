/**
 * Tests unitarios para Sidebar component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../src/components/Sidebar';

// Mock de authService
vi.mock('../../src/utils/authService', () => ({
    getCurrentUser: vi.fn(() => ({
        id: '1',
        email: 'test@test.com',
        role: 'admin'
    }))
}));

// Mock de permissions
vi.mock('../../src/config/permissions', () => ({
    getNavbarModules: vi.fn(() => [
        { id: 'overall', label: 'Overall', icon: 'Layout' },
        { id: 'product', label: 'Product Roadmap', icon: 'Box' },
        { id: 'delivery', label: 'Delivery Roadmap', icon: 'Truck' },
        { 
            id: 'pm', 
            label: 'PM', 
            icon: 'BarChart',
            hasSubmenu: true,
            submodules: [
                { id: 'projects-metrics', label: 'Project Metrics', icon: 'BarChart' },
                { id: 'developer-metrics', label: 'Developer Metrics', icon: 'Activity' },
                { id: 'team-capacity', label: 'Team Capacity', icon: 'UserCheck' }
            ]
        },
        { 
            id: 'admin', 
            label: 'Admin', 
            icon: 'Shield',
            hasSubmenu: true,
            submodules: [
                { id: 'user-admin', label: 'User Administration', icon: 'Users' },
                { id: 'role-access', label: 'Role Access', icon: 'Shield' }
            ]
        }
    ])
}));

describe('Sidebar', () => {
    const mockSetActiveView = vi.fn();
    const mockSetIsOpen = vi.fn();
    const defaultProps = {
        activeView: 'overall',
        setActiveView: mockSetActiveView,
        isOpen: true,
        setIsOpen: mockSetIsOpen
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el sidebar correctamente', () => {
        render(<Sidebar {...defaultProps} />);
        
        // "Dashboard" aparece en múltiples lugares (header y módulos)
        const dashboardElements = screen.getAllByText(/Dashboard/i);
        expect(dashboardElements.length).toBeGreaterThan(0);
    });

    it('debe mostrar los módulos de navegación', () => {
        render(<Sidebar {...defaultProps} />);
        
        expect(screen.getByText(/Overall/i)).toBeInTheDocument();
        expect(screen.getByText(/Product Roadmap/i)).toBeInTheDocument();
        expect(screen.getByText(/Delivery Roadmap/i)).toBeInTheDocument();
    });

    it('debe mostrar módulos con submenús cuando están disponibles', () => {
        render(<Sidebar {...defaultProps} />);
        
        expect(screen.getByText(/PM/i)).toBeInTheDocument();
        // Admin appears multiple times (label and role badge), use getAllByText
        expect(screen.getAllByText(/Admin/i).length).toBeGreaterThan(0);
    });

    it('debe expandir submenú cuando se hace clic en un módulo con submenú', () => {
        render(<Sidebar {...defaultProps} />);
        
        const pmButton = screen.getByText(/PM/i).closest('button');
        if (pmButton) {
            fireEvent.click(pmButton);
            // After expansion, submenu items should be visible
            expect(screen.getByText(/Project Metrics/i)).toBeInTheDocument();
            expect(screen.getByText(/Developer Metrics/i)).toBeInTheDocument();
            expect(screen.getByText(/Team Capacity/i)).toBeInTheDocument();
        }
    });

    it('debe llamar setActiveView cuando se hace clic en un submenú', () => {
        render(<Sidebar {...defaultProps} />);
        
        const pmButton = screen.getByText(/PM/i).closest('button');
        if (pmButton) {
            fireEvent.click(pmButton); // Expand submenu
            
            const projectMetricsButton = screen.getByText(/Project Metrics/i).closest('button');
            if (projectMetricsButton) {
                fireEvent.click(projectMetricsButton);
                expect(mockSetActiveView).toHaveBeenCalledWith('projects-metrics');
            }
        }
    });

    it('debe llamar setActiveView cuando se hace clic en un módulo', () => {
        render(<Sidebar {...defaultProps} />);
        
        const productLink = screen.getByText(/Product Roadmap/i);
        fireEvent.click(productLink);
        
        expect(mockSetActiveView).toHaveBeenCalledWith('product');
    });

    it('debe mostrar el botón de toggle cuando está abierto', () => {
        render(<Sidebar {...defaultProps} />);
        
        const toggleButton = screen.getByRole('button', { name: /Toggle sidebar/i });
        expect(toggleButton).toBeInTheDocument();
    });

    it('debe llamar setIsOpen cuando se hace clic en el botón de toggle', () => {
        render(<Sidebar {...defaultProps} />);
        
        const toggleButton = screen.getByRole('button', { name: /Toggle sidebar/i });
        fireEvent.click(toggleButton);
        
        expect(mockSetIsOpen).toHaveBeenCalled();
    });

    it('debe mostrar overlay en móvil cuando está abierto', () => {
        render(<Sidebar {...defaultProps} />);
        
        // El overlay debería estar presente cuando isOpen es true
        const overlay = document.querySelector('.bg-black\\/50');
        expect(overlay).toBeInTheDocument();
    });

    it('debe cerrar el sidebar cuando se hace clic en el overlay (móvil)', () => {
        render(<Sidebar {...defaultProps} />);
        
        const overlay = document.querySelector('.bg-black\\/50');
        fireEvent.click(overlay);
        
        expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });

    it('debe aplicar clases correctas cuando está cerrado', () => {
        render(<Sidebar {...defaultProps} isOpen={false} />);
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('debe aplicar clases correctas cuando está abierto', () => {
        render(<Sidebar {...defaultProps} isOpen={true} />);
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toHaveClass('translate-x-0');
    });
});

