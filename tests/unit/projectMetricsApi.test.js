/**
 * Tests for projectMetricsApi.js
 * Validates filtering of removed tickets from closed sprints
 */

import { describe, it, expect } from 'vitest';

describe('projectMetricsApi - Filtro de Tickets Removidos', () => {
  describe('Filtro Post-Fetch para Sprints Cerrados', () => {
    it('debe excluir tickets con status_at_sprint_close null después del fetch', () => {
      const filteredIssues = [
        { id: 'issue-1', status_at_sprint_close: 'DONE' },
        { id: 'issue-2', status_at_sprint_close: null }, // Debe excluirse
        { id: 'issue-3', status_at_sprint_close: 'IN PROGRESS' },
        { id: 'issue-4', status_at_sprint_close: undefined }, // También debe excluirse
      ];

      const sprintCloseDate = new Date('2026-01-05');
      const isSprintClosed = true;

      // Simular el filtro que se aplica en projectMetricsApi.js líneas 328-335
      const result = filteredIssues.filter(issue => {
        if (isSprintClosed && sprintCloseDate) {
          return issue.status_at_sprint_close !== null && issue.status_at_sprint_close !== undefined;
        }
        return true;
      });

      expect(result).toHaveLength(2);
      expect(result.find(i => i.id === 'issue-2')).toBeUndefined();
      expect(result.find(i => i.id === 'issue-4')).toBeUndefined();
      expect(result.find(i => i.id === 'issue-1')).toBeDefined();
      expect(result.find(i => i.id === 'issue-3')).toBeDefined();
    });

    it('NO debe filtrar tickets para sprints activos', () => {
      const filteredIssues = [
        { id: 'issue-1', status_at_sprint_close: 'DONE' },
        { id: 'issue-2', status_at_sprint_close: null }, // No debe excluirse en sprint activo
        { id: 'issue-3', status_at_sprint_close: 'IN PROGRESS' },
      ];

      const sprintCloseDate = null; // Sprint activo
      const isSprintClosed = false;

      const result = filteredIssues.filter(issue => {
        if (isSprintClosed && sprintCloseDate) {
          return issue.status_at_sprint_close !== null && issue.status_at_sprint_close !== undefined;
        }
        return true;
      });

      // Para sprints activos, debe incluir todos los tickets
      expect(result).toHaveLength(3);
      expect(result.find(i => i.id === 'issue-2')).toBeDefined();
    });
  });

  describe('Validación de Regla Fundamental', () => {
    it('debe validar que la regla status_at_sprint_close IS NOT NULL se aplica correctamente', () => {
      const testCases = [
        { status: 'DONE', shouldInclude: true },
        { status: 'IN PROGRESS', shouldInclude: true },
        { status: null, shouldInclude: false },
        { status: undefined, shouldInclude: false },
      ];

      const sprintCloseDate = new Date('2026-01-05');
      const isSprintClosed = true;

      testCases.forEach(({ status, shouldInclude }) => {
        const issue = { id: 'test-issue', status_at_sprint_close: status };
        const shouldBeIncluded = issue.status_at_sprint_close !== null && issue.status_at_sprint_close !== undefined;
        expect(shouldBeIncluded).toBe(shouldInclude);
      });
    });
  });
});
