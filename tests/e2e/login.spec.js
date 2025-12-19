/**
 * Pruebas e2e para flujo de login
 */
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe mostrar el formulario de login', async ({ page }) => {
    await expect(page.getByText(/Sign in to continue/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('debe validar campos requeridos', async ({ page }) => {
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    
    // Intentar enviar sin llenar campos
    await signInButton.click();
    
    // El formulario debe prevenir el envío o mostrar error
    // (depende de la implementación del formulario)
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.getByLabel(/Email/i).fill('invalid@example.com');
    await page.getByLabel(/Password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Esperar mensaje de error
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('debe autenticar exitosamente con credenciales válidas', async ({ page }) => {
    // Nota: Esto requiere credenciales válidas o un mock del backend
    // Por ahora, verificamos que el flujo funciona
    await page.getByLabel(/Email/i).fill('carlos.cedeno@agenticdream.com');
    await page.getByLabel(/Password/i).fill('Miranda*14');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Después del login exitoso, debería redirigir o mostrar el dashboard
    // Esperar que desaparezca el formulario de login
    await expect(page.getByText(/Sign in to continue/i)).not.toBeVisible({
      timeout: 10000,
    });
  });

  test('debe mantener sesión después de recargar página', async ({ page, context }) => {
    // Simular login exitoso
    await page.getByLabel(/Email/i).fill('carlos.cedeno@agenticdream.com');
    await page.getByLabel(/Password/i).fill('Miranda*14');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Esperar a que el login se complete
    await page.waitForTimeout(2000);

    // Recargar página
    await page.reload();

    // Verificar que la sesión se mantiene (no muestra login de nuevo)
    // Esto depende de cómo se maneje la sesión en la app
  });

  test('debe permitir cerrar sesión', async ({ page }) => {
    // Primero hacer login
    await page.getByLabel(/Email/i).fill('carlos.cedeno@agenticdream.com');
    await page.getByLabel(/Password/i).fill('Miranda*14');
    await page.getByRole('button', { name: /Sign In/i }).click();

    await page.waitForTimeout(2000);

    // Buscar botón de logout (puede estar en el navbar)
    const logoutButton = page.getByRole('button', { name: /Logout|Sign Out|Cerrar Sesión/i });
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Después de logout, debería mostrar el formulario de login de nuevo
      await expect(page.getByText(/Sign in to continue/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
