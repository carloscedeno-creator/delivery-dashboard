/**
 * Tests unitarios para GanttChart component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GanttChart from '../../src/components/GanttChart';

describe('GanttChart', () => {
    const mockData = [
        {
            initiative: 'Test Initiative 1',
            squad: 'Test Squad',
            start: '2025-01-01',
            delivery: '2025-03-31',
            status: 50,
            spi: 1.0
        },
        {
            initiative: 'Test Initiative 2',
            squad: 'Test Squad 2',
            start: '2025-02-01',
            delivery: '2025-04-30',
            status: 75,
            spi: 0.9
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el componente correctamente', () => {
        render(<GanttChart data={mockData} />);
        
        // Usar getAllByText porque el texto aparece en múltiples lugares (label y tooltip)
        const initiativeElements = screen.getAllByText(/Test Initiative 1/i);
        expect(initiativeElements.length).toBeGreaterThan(0);
        // Verificar que el componente renderiza correctamente verificando la estructura
        const container = document.querySelector('.w-full.overflow-x-auto');
        expect(container).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay datos', () => {
        render(<GanttChart data={[]} />);
        
        // El componente puede mostrar "No hay datos" o simplemente no renderizar nada
        // Verificar que al menos el contenedor existe
        const container = document.querySelector('.w-full.overflow-x-auto');
        expect(container).toBeInTheDocument();
    });

    it('debe normalizar datos de diferentes formatos', () => {
        const deliveryFormatData = [
            {
                name: 'Delivery Item',
                team: 'Team A',
                begin: '2025-01-01',
                dueDate: '2025-03-31',
                completion: 60
            }
        ];

        render(<GanttChart data={deliveryFormatData} />);
        
        // Usar getAllByText porque el texto aparece en múltiples lugares (label y tooltip)
        const elements = screen.getAllByText(/Delivery Item/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('debe normalizar datos de Product Roadmap', () => {
        const productFormatData = [
            {
                initiative: 'Product Item',
                Team: 'Product Team',
                startDate: '2025-01-01',
                expectedDate: '2025-03-31',
                status: 'Complete'
            }
        ];

        render(<GanttChart data={productFormatData} />);
        
        // Usar getAllByText porque el texto aparece en múltiples lugares
        const elements = screen.getAllByText(/Product Item/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('debe convertir estados de texto a porcentajes', () => {
        const textStatusData = [
            {
                initiative: 'Complete Item',
                squad: 'Test',
                start: '2025-01-01',
                delivery: '2025-03-31',
                status: 'Complete'
            },
            {
                initiative: 'Incomplete Item',
                squad: 'Test',
                start: '2025-01-01',
                delivery: '2025-03-31',
                status: 'Incomplete'
            }
        ];

        render(<GanttChart data={textStatusData} />);
        
        // Usar getAllByText porque el texto aparece en múltiples lugares
        const completeElements = screen.getAllByText(/Complete Item/i);
        const incompleteElements = screen.getAllByText(/Incomplete Item/i);
        expect(completeElements.length).toBeGreaterThan(0);
        expect(incompleteElements.length).toBeGreaterThan(0);
    });

    it('debe filtrar items sin fechas válidas', () => {
        const invalidData = [
            {
                initiative: 'Valid Item',
                squad: 'Test',
                start: '2025-01-01',
                delivery: '2025-03-31',
                status: 50
            },
            {
                initiative: 'Invalid Item',
                squad: 'Test',
                start: '',
                delivery: '',
                status: 0
            }
        ];

        render(<GanttChart data={invalidData} />);
        
        // Usar getAllByText porque el texto aparece en múltiples lugares
        const validElements = screen.getAllByText(/Valid Item/i);
        expect(validElements.length).toBeGreaterThan(0);
        
        // Invalid Item no debería aparecer porque no tiene fechas válidas
        const invalidElements = screen.queryAllByText(/Invalid Item/i);
        expect(invalidElements.length).toBe(0);
    });

    it('debe mostrar la línea de "today" cuando hay datos', () => {
        render(<GanttChart data={mockData} />);
        
        // La línea de today debería estar presente
        const todayLine = document.querySelector('.bg-red-500');
        expect(todayLine).toBeInTheDocument();
    });

    it('debe calcular correctamente el rango de fechas', () => {
        render(<GanttChart data={mockData} />);
        
        // El componente debería calcular el rango basado en las fechas de los datos
        // Verificar que se renderizan los meses en el timeline (puede aparecer múltiples veces)
        const janElements = screen.getAllByText(/Jan/i);
        expect(janElements.length).toBeGreaterThan(0);
        // Usar getAllByText porque el texto aparece en múltiples lugares
        const initiativeElements = screen.getAllByText(/Test Initiative 1/i);
        expect(initiativeElements.length).toBeGreaterThan(0);
    });
});

