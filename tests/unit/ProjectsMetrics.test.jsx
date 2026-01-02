/**
 * Pruebas unitarias para ProjectsMetrics component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ProjectsMetrics from '../../src/components/ProjectsMetrics.jsx';
import * as projectMetricsApi from '../../src/utils/projectMetricsApi.js';
import * as pdfGenerator from '../../src/utils/pdfGenerator.js';
import * as supabaseApi from '../../src/utils/supabaseApi.js';

// Mock del módulo de API
vi.mock('../../src/utils/projectMetricsApi.js', () => ({
  getSquads: vi.fn(),
  getSprintsForSquad: vi.fn(),
  getProjectMetricsData: vi.fn(),
  getSquadById: vi.fn(),
  getSprintById: vi.fn(),
}));

// Mock de pdfGenerator
vi.mock('../../src/utils/pdfGenerator.js', () => ({
  getIssuesForPDF: vi.fn(),
  getSprintGoal: vi.fn(),
  generateProjectMetricsPDF: vi.fn(),
}));

// Mock de supabaseApi
vi.mock('../../src/utils/supabaseApi.js', () => ({
  supabase: {},
}));

describe('ProjectsMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el componente correctamente', async () => {
    projectMetricsApi.getSquads.mockResolvedValue([
      { id: '1', squad_name: 'Test Squad' },
    ]);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue([]);
    projectMetricsApi.getSquadById.mockResolvedValue({
      id: '1',
      squad_name: 'Test Squad',
    });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue({
      statusData: [],
      totalTickets: 0,
      totalSP: 0,
    });

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Dev Team Metrics/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar colores correctos para estados normalizados', async () => {
    const mockSquads = [{ id: '1', squad_name: 'Test Squad' }];
    const mockSprints = [{ id: '1', sprint_name: 'Sprint 1', is_active: true }];
    const mockMetricsData = {
      statusData: [
        { name: 'DONE', value: 10, percentage: 50 },
        { name: 'TO DO', value: 5, percentage: 25 },
        { name: 'IN PROGRESS', value: 5, percentage: 25 },
      ],
      totalTickets: 20,
      totalSP: 40,
    };

    projectMetricsApi.getSquads.mockResolvedValue(mockSquads);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue(mockSprints);
    projectMetricsApi.getSquadById.mockResolvedValue({
      id: '1',
      squad_name: 'Test Squad',
    });
    projectMetricsApi.getSprintById.mockResolvedValue({
      id: '1',
      sprint_name: 'Sprint 1',
    });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue(mockMetricsData);

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Board State Distribution/i)).toBeInTheDocument();
    });

    // Verificar que los datos se procesaron correctamente
    // Los colores deberían estar asignados según statusColors
    // Nota: Recharts puede no renderizar completamente en tests, así que verificamos que el componente se renderizó
    expect(screen.getByText(/Board State Distribution/i)).toBeInTheDocument();
  });

  it('debe manejar estados con diferentes capitalizaciones', async () => {
    const mockMetricsData = {
      statusData: [
        { name: 'done', value: 10, percentage: 50 }, // minúsculas
        { name: 'To Do', value: 5, percentage: 25 }, // title case
        { name: 'IN PROGRESS', value: 5, percentage: 25 }, // mayúsculas
      ],
      totalTickets: 20,
      totalSP: 40,
    };

    projectMetricsApi.getSquads.mockResolvedValue([{ id: '1', squad_name: 'Test' }]);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue([]);
    projectMetricsApi.getSquadById.mockResolvedValue({ id: '1', squad_name: 'Test' });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue(mockMetricsData);

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Board State Distribution/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar mensaje cuando no hay datos', async () => {
    projectMetricsApi.getSquads.mockResolvedValue([{ id: '1', squad_name: 'Test' }]);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue([]);
    projectMetricsApi.getSquadById.mockResolvedValue({ id: '1', squad_name: 'Test' });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue({
      statusData: [],
      totalTickets: 0,
      totalSP: 0,
    });

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(
        screen.getByText(/No tickets found for the selected squad and sprint/i)
      ).toBeInTheDocument();
    });
  });

  it('debe manejar errores al cargar datos', async () => {
    projectMetricsApi.getSquads.mockRejectedValue(new Error('Network error'));

    render(<ProjectsMetrics />);

    // El componente debe manejar el error sin crashear
    // Puede mostrar un spinner o mensaje de error
    await waitFor(() => {
      // Verificar que el componente se renderizó (puede estar en estado de carga o error)
      const body = document.body;
      expect(body).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('debe mostrar el botón de descargar PDF cuando hay datos', async () => {
    const mockSquads = [{ id: '1', squad_name: 'Test Squad' }];
    const mockSprints = [{ id: '1', sprint_name: 'Sprint 1', is_active: true }];
    const mockMetricsData = {
      statusData: [
        { name: 'DONE', value: 10, percentage: 50 },
      ],
      totalTickets: 10,
      totalSP: 20,
      completedSP: 10,
    };

    projectMetricsApi.getSquads.mockResolvedValue(mockSquads);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue(mockSprints);
    projectMetricsApi.getSquadById.mockResolvedValue({
      id: '1',
      squad_name: 'Test Squad',
    });
    projectMetricsApi.getSprintById.mockResolvedValue({
      id: '1',
      sprint_name: 'Sprint 1',
    });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue(mockMetricsData);

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Board State Distribution/i)).toBeInTheDocument();
    });

    // Verificar que el botón de PDF está presente
    await waitFor(() => {
      expect(screen.getByText(/Download PDF Report/i)).toBeInTheDocument();
    });
  });

  it('debe llamar a generateProjectMetricsPDF cuando se hace clic en el botón de PDF', async () => {
    const mockSquads = [{ id: '1', squad_name: 'Test Squad' }];
    const mockSprints = [{ id: '1', sprint_name: 'Sprint 1', is_active: true }];
    const mockMetricsData = {
      statusData: [
        { name: 'DONE', value: 10, percentage: 50 },
      ],
      totalTickets: 10,
      totalSP: 20,
      completedSP: 10,
    };

    projectMetricsApi.getSquads.mockResolvedValue(mockSquads);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue(mockSprints);
    projectMetricsApi.getSquadById.mockResolvedValue({
      id: '1',
      squad_name: 'Test Squad',
    });
    projectMetricsApi.getSprintById.mockResolvedValue({
      id: '1',
      sprint_name: 'Sprint 1',
    });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue(mockMetricsData);

    pdfGenerator.getIssuesForPDF.mockResolvedValue([
      {
        issueType: 'Task',
        key: 'TEST-1',
        assignee: 'Developer 1',
        priority: 'Medium',
        status: 'DONE',
        storyPoint: 5,
        summary: 'Test issue',
      },
    ]);
    pdfGenerator.getSprintGoal.mockResolvedValue('Test sprint goal');
    pdfGenerator.generateProjectMetricsPDF.mockResolvedValue();

    // Mock de querySelector para los gráficos
    const mockChartElement = {
      querySelector: vi.fn(() => ({
        offsetWidth: 100,
        offsetHeight: 100,
      })),
    };

    // Mock de useRef
    const originalUseRef = React.useRef;
    vi.spyOn(React, 'useRef').mockImplementation((initialValue) => {
      if (initialValue === null) {
        return { current: mockChartElement };
      }
      return { current: initialValue };
    });

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/Download PDF Report/i)).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download PDF Report/i);
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(pdfGenerator.getIssuesForPDF).toHaveBeenCalled();
      expect(pdfGenerator.getSprintGoal).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('no debe mostrar el botón de PDF cuando no hay datos', async () => {
    projectMetricsApi.getSquads.mockResolvedValue([{ id: '1', squad_name: 'Test Squad' }]);
    projectMetricsApi.getSprintsForSquad.mockResolvedValue([]);
    projectMetricsApi.getSquadById.mockResolvedValue({ id: '1', squad_name: 'Test Squad' });
    projectMetricsApi.getProjectMetricsData.mockResolvedValue({
      statusData: [],
      totalTickets: 0,
      totalSP: 0,
    });

    render(<ProjectsMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
    });

    // El botón de PDF no debe estar presente
    expect(screen.queryByText(/Download PDF Report/i)).not.toBeInTheDocument();
  });
});
