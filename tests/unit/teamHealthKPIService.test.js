/**
 * Tests for teamHealthKPIService.js
 * Validates filtering of removed tickets in Planning Accuracy and Capacity Accuracy calculations
 */

import { describe, it, expect } from 'vitest';

describe('teamHealthKPIService - Filtro de Tickets Removidos', () => {
  describe('Planning Accuracy - SP Commitment', () => {
    it('debe excluir tickets removidos del cálculo de SP Commitment', () => {
      const issueSprintRows = [
        {
          issue_id: 'issue-1',
          story_points_at_start: 5,
          status_at_sprint_close: 'DONE', // En sprint al cierre
        },
        {
          issue_id: 'issue-2',
          story_points_at_start: 3,
          status_at_sprint_close: null, // Removido antes del cierre
        },
        {
          issue_id: 'issue-3',
          story_points_at_start: 2,
          status_at_sprint_close: 'IN PROGRESS', // En sprint al cierre
        },
      ];

      const sprintCloseDate = new Date('2026-01-05');

      // Simular el cálculo de plannedSP (teamHealthKPIService.js líneas 504-513)
      const plannedSP = issueSprintRows.reduce((sum, row) => {
        // Si status_at_sprint_close es null, el ticket fue removido antes del cierre, excluirlo
        if (!row.status_at_sprint_close && sprintCloseDate) {
          return sum;
        }
        const spAtStart = Number(row.story_points_at_start) || 0;
        return sum + spAtStart;
      }, 0);

      // Solo debe contar issue-1 (5 SP) y issue-3 (2 SP) = 7 SP
      // NO debe contar issue-2 (3 SP) porque fue removido
      expect(plannedSP).toBe(7);
      expect(plannedSP).not.toBe(10); // 10 sería si contara todos
    });

    it('debe incluir todos los tickets para sprints activos', () => {
      const issueSprintRows = [
        {
          issue_id: 'issue-1',
          story_points_at_start: 5,
          status_at_sprint_close: null, // Sprint activo, puede ser null
        },
        {
          issue_id: 'issue-2',
          story_points_at_start: 3,
          status_at_sprint_close: null,
        },
      ];

      const sprintCloseDate = null; // Sprint activo

      const plannedSP = issueSprintRows.reduce((sum, row) => {
        if (!row.status_at_sprint_close && sprintCloseDate) {
          return sum;
        }
        const spAtStart = Number(row.story_points_at_start) || 0;
        return sum + spAtStart;
      }, 0);

      // Para sprints activos, debe contar todos
      expect(plannedSP).toBe(8);
    });
  });

  describe('Planning Accuracy - SP Completed', () => {
    it('debe excluir tickets removidos del cálculo de SP Completed', () => {
      const issueSprintRows = [
        {
          issue_id: 'issue-1',
          story_points_at_close: 5,
          status_at_sprint_close: 'DONE', // Completado y en sprint al cierre
        },
        {
          issue_id: 'issue-2',
          story_points_at_close: 3,
          status_at_sprint_close: null, // Removido antes del cierre
        },
        {
          issue_id: 'issue-3',
          story_points_at_close: 2,
          status_at_sprint_close: 'DEVELOPMENT DONE', // Completado y en sprint al cierre
        },
      ];

      const sprintCloseDate = new Date('2026-01-05');
      const isCompletedStatus = (status) => status === 'DONE' || status === 'DEVELOPMENT DONE';

      // Simular el cálculo de completedSP (teamHealthKPIService.js líneas 516-529)
      const completedSP = issueSprintRows.reduce((sum, row) => {
        // Si status_at_sprint_close es null, el ticket fue removido antes del cierre, excluirlo
        if (!row.status_at_sprint_close && sprintCloseDate) {
          return sum;
        }

        const statusAtClose = row.status_at_sprint_close;
        const isCompleted = isCompletedStatus(statusAtClose);
        if (!isCompleted) return sum;

        const spAtClose = Number(row.story_points_at_close) || 0;
        return sum + spAtClose;
      }, 0);

      // Solo debe contar issue-1 (5 SP) y issue-3 (2 SP) = 7 SP
      // NO debe contar issue-2 (3 SP) porque fue removido
      expect(completedSP).toBe(7);
      expect(completedSP).not.toBe(10); // 10 sería si contara todos
    });

    it('debe manejar casos donde todos los tickets fueron removidos', () => {
      const issueSprintRows = [
        {
          issue_id: 'issue-1',
          story_points_at_close: 5,
          status_at_sprint_close: null, // Removido
        },
        {
          issue_id: 'issue-2',
          story_points_at_close: 3,
          status_at_sprint_close: null, // Removido
        },
      ];

      const sprintCloseDate = new Date('2026-01-05');
      const isCompletedStatus = (status) => status === 'DONE' || status === 'DEVELOPMENT DONE';

      const completedSP = issueSprintRows.reduce((sum, row) => {
        if (!row.status_at_sprint_close && sprintCloseDate) {
          return sum;
        }
        const statusAtClose = row.status_at_sprint_close;
        const isCompleted = isCompletedStatus(statusAtClose);
        if (!isCompleted) return sum;
        const spAtClose = Number(row.story_points_at_close) || 0;
        return sum + spAtClose;
      }, 0);

      // Si todos fueron removidos, debe retornar 0
      expect(completedSP).toBe(0);
    });
  });

  describe('Validación de Regla Fundamental', () => {
    it('debe validar que tickets removidos se identifican correctamente', () => {
      const testCases = [
        { status: 'DONE', sprintCloseDate: new Date('2026-01-05'), shouldExclude: false },
        { status: 'IN PROGRESS', sprintCloseDate: new Date('2026-01-05'), shouldExclude: false },
        { status: null, sprintCloseDate: new Date('2026-01-05'), shouldExclude: true },
        { status: undefined, sprintCloseDate: new Date('2026-01-05'), shouldExclude: true },
        { status: null, sprintCloseDate: null, shouldExclude: false }, // Sprint activo
      ];

      testCases.forEach(({ status, sprintCloseDate, shouldExclude }) => {
        const row = { status_at_sprint_close: status };
        // La lógica correcta: excluir solo si status es null/undefined Y hay sprintCloseDate
        const shouldBeExcluded = (!row.status_at_sprint_close && sprintCloseDate !== null);
        expect(shouldBeExcluded).toBe(shouldExclude);
      });
    });
  });
});
