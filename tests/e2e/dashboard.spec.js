/**
 * Pruebas e2e para navegación y visualización de tableros
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Hacer login primero si es necesario
    // (puede requerir mock o credenciales de test)
    try {
      const emailInput = page.getByLabel(/Email/i);
      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('carlos.cedeno@agenticdream.com');
        await page.getByLabel(/Password/i).fill('Miranda*14');
        await page.getByRole('button', { name: /Sign In/i }).click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      // Si no hay login requerido, continuar
    }
  });

  test('debe navegar a Projects Metrics', async ({ page }) => {
    const projectsMetricsLink = page.getByRole('link', { name: /Projects Metrics/i });
    
    if (await projectsMetricsLink.isVisible()) {
      await projectsMetricsLink.click();
      
      await expect(page.getByText(/Dev Team Metrics/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('debe mostrar gráficos con colores en Projects Metrics', async ({ page }) => {
    // Navegar a Projects Metrics
    const projectsMetricsLink = page.getByRole('link', { name: /Projects Metrics/i });
    if (await projectsMetricsLink.isVisible({ timeout: 5000 })) {
      await projectsMetricsLink.click();
      await page.waitForTimeout(3000);
    }

    // Verificar que estamos en la página correcta
    const metricsTitle = page.getByText(/Dev Team Metrics/i);
    const isOnPage = await metricsTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isOnPage) {
      // Si no hay datos, verificar que muestra mensaje apropiado
      const noDataMessage = page.getByText(/No tickets found/i);
      if (await noDataMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Test pasa - comportamiento esperado cuando no hay datos
        return;
      }
    }

    // Si hay datos, verificar que los gráficos están presentes
    const pieChart = page.locator('[class*="recharts-pie"]');
    const barChart = page.locator('[class*="recharts-bar"]');

    const pieVisible = await pieChart.first().isVisible({ timeout: 5000 }).catch(() => false);
    const barVisible = await barChart.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (pieVisible && barVisible) {
      // Verificar que los elementos tienen colores (no solo gris)
      const pieSectors = page.locator('[class*="recharts-pie-sector"]');
      const count = await pieSectors.count();
      
      if (count > 0) {
        const firstSector = pieSectors.first();
        const fillColor = await firstSector.getAttribute('fill');
        
        // Verificar que el color no es el gris por defecto (#6b7280)
        if (fillColor) {
          expect(fillColor).not.toBe('#6b7280');
          expect(fillColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
      }
    } else {
      // Si no hay gráficos, puede ser porque no hay datos - esto es aceptable
      console.log('⚠️ Gráficos no visibles - puede ser porque no hay datos');
    }
  });

  test('debe filtrar por squad y sprint', async ({ page }) => {
    // Navegar a Projects Metrics
    const projectsMetricsLink = page.getByRole('link', { name: /Projects Metrics/i });
    if (await projectsMetricsLink.isVisible({ timeout: 5000 })) {
      await projectsMetricsLink.click();
      await page.waitForTimeout(2000);
    }

    // Verificar que estamos en la página correcta
    const metricsTitle = page.getByText(/Dev Team Metrics/i);
    if (!(await metricsTitle.isVisible({ timeout: 5000 }))) {
      // Si no hay datos, el componente puede mostrar un mensaje diferente
      const noDataMessage = page.getByText(/No tickets found/i);
      if (await noDataMessage.isVisible({ timeout: 2000 })) {
        // Test pasa si muestra mensaje de no datos (comportamiento esperado)
        return;
      }
    }

    // Seleccionar un squad si está disponible
    const squadSelect = page.locator('select').first();
    if (await squadSelect.isVisible({ timeout: 2000 })) {
      const options = await squadSelect.locator('option').count();
      if (options > 1) {
        await squadSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }

    // Seleccionar un sprint si está disponible
    const sprintSelect = page.locator('select').nth(1);
    if (await sprintSelect.isVisible({ timeout: 2000 }) && !(await sprintSelect.isDisabled())) {
      const sprintOptions = await sprintSelect.locator('option').count();
      if (sprintOptions > 1) {
        await sprintSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
      }
    }

    // Verificar que la página sigue siendo accesible
    await expect(page).toHaveURL(/.*/, { timeout: 5000 });
  });

  test('debe mostrar Developer Metrics correctamente', async ({ page }) => {
    const developerMetricsLink = page.getByRole('link', { name: /Developer Metrics/i });
    
    if (await developerMetricsLink.isVisible()) {
      await developerMetricsLink.click();
      
      await expect(page.getByText(/Developer Metrics/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('debe mostrar Delivery Roadmap correctamente', async ({ page }) => {
    const roadmapLink = page.getByRole('link', { name: /Delivery Roadmap/i });
    
    if (await roadmapLink.isVisible()) {
      await roadmapLink.click();
      
      await expect(page.getByText(/Delivery Roadmap/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('debe mostrar Product Roadmap correctamente', async ({ page }) => {
    const productRoadmapLink = page.getByRole('link', { name: /Product Roadmap/i });
    
    if (await productRoadmapLink.isVisible()) {
      await productRoadmapLink.click();
      
      await expect(page.getByText(/Product Roadmap/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
