# Testing Guide

Este proyecto incluye pruebas unitarias y e2e para garantizar la calidad del código.

## Estructura de Pruebas

```
tests/
├── unit/              # Pruebas unitarias
│   ├── authService.test.js
│   └── ProjectsMetrics.test.jsx
├── e2e/               # Pruebas end-to-end
│   ├── login.spec.js
│   └── dashboard.spec.js
└── setup.js           # Configuración global de pruebas
```

## Ejecutar Pruebas

### Pruebas Unitarias

```bash
# Ejecutar todas las pruebas unitarias
npm run test:unit

# Ejecutar en modo watch (desarrollo)
npm run test:unit:watch

# Ejecutar con UI interactiva
npm run test:unit:ui

# Ejecutar con cobertura
npm run test:coverage
```

### Pruebas E2E

```bash
# Ejecutar todas las pruebas e2e
npm run test:e2e

# Ejecutar con UI interactiva
npm run test:e2e:ui

# Ejecutar en modo headed (ver el navegador)
npm run test:e2e:headed
```

### Ejecutar Todas las Pruebas

```bash
npm run test:all
```

## Pre-Push Hook

Las pruebas se ejecutan automáticamente antes de cada `git push` gracias a Husky. Si las pruebas fallan, el push será bloqueado.

Para saltar el hook (no recomendado):

```bash
git push --no-verify
```

## Cobertura de Pruebas

### Módulos Cubiertos

1. **authService** (`src/utils/authService.js`)
   - ✅ Login con credenciales válidas/inválidas
   - ✅ Normalización de email
   - ✅ Logout
   - ✅ Gestión de sesiones
   - ✅ Validación de sesiones
   - ✅ Manejo de errores

2. **ProjectsMetrics** (`src/components/ProjectsMetrics.jsx`)
   - ✅ Renderizado del componente
   - ✅ Asignación de colores a estados
   - ✅ Normalización de estados
   - ✅ Manejo de datos vacíos
   - ✅ Manejo de errores

3. **E2E - Login Flow**
   - ✅ Formulario de login
   - ✅ Validación de campos
   - ✅ Autenticación exitosa
   - ✅ Persistencia de sesión
   - ✅ Logout

4. **E2E - Dashboard**
   - ✅ Navegación entre vistas
   - ✅ Visualización de gráficos con colores
   - ✅ Filtros por squad y sprint

## Escribir Nuevas Pruebas

### Pruebas Unitarias

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../src/components/MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar correctamente', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Pruebas E2E

```javascript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('debe funcionar correctamente', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

## Troubleshooting

### ResizeObserver no está definido

Este error ocurre con componentes que usan Recharts. Ya está mockeado en `tests/setup.js`.

### localStorage no funciona en pruebas

El localStorage está mockeado en `tests/setup.js`. Si necesitas resetearlo, usa `localStorage.clear()` en `beforeEach`.

### Supabase no está configurado

Las pruebas mockean `window.supabaseClient`. Si necesitas probar con Supabase real, configura las variables de entorno en `.env.test`.

## CI/CD

Las pruebas también se ejecutan en GitHub Actions. Ver `.github/workflows/` para más detalles.
