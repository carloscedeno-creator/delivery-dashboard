# Dev Performance Module

Módulo de métricas de rendimiento de desarrolladores con arquitectura modular y separación de responsabilidades.

## Estructura

```
src/
├── components/
│   └── DevPerformance/
│       ├── DevPerformanceView.jsx       # Componente principal (orquestador)
│       ├── DevPerformanceSelectors.jsx  # Selectores (Squad, Sprint, Developer)
│       ├── DevPerformanceMetrics.jsx    # Tarjetas de métricas
│       ├── DevPerformanceCharts.jsx     # Gráficos de barras
│       └── DevPerformanceTable.jsx       # Tabla detallada
├── hooks/
│   └── useDevPerformance.js            # Hook personalizado para lógica de estado
└── services/
    └── devPerformanceService.js         # Lógica de negocio y cálculos
```

## Arquitectura

### 1. Services (`devPerformanceService.js`)
Contiene toda la lógica de negocio pura:
- Funciones de filtrado
- Cálculos de métricas
- Validaciones de estado "Dev Done"
- Ordenamiento y transformación de datos

**Características:**
- ✅ Funciones puras (sin efectos secundarios)
- ✅ Fáciles de testear
- ✅ Reutilizables
- ✅ Sin dependencias de React

### 2. Hooks (`useDevPerformance.js`)
Maneja el estado y la lógica de React:
- Carga de datos desde Supabase
- Gestión de filtros
- Cálculo de métricas usando servicios
- Manejo de loading y errores

**Características:**
- ✅ Encapsula toda la lógica de estado
- ✅ Proporciona una API limpia a los componentes
- ✅ Maneja efectos secundarios (fetch, etc.)

### 3. Componentes
Componentes React modulares y reutilizables:

#### `DevPerformanceView.jsx`
- Componente principal que orquesta todos los sub-componentes
- Usa el hook `useDevPerformance`
- Maneja estados de loading y error

#### `DevPerformanceSelectors.jsx`
- Selectores jerárquicos (Squad → Sprint → Developer)
- Maneja la interacción del usuario
- Deshabilita selectores dependientes

#### `DevPerformanceMetrics.jsx`
- Muestra tarjetas con métricas clave
- Total Issues, Dev Done Rate, Total SP, SP Dev Done

#### `DevPerformanceCharts.jsx`
- Gráficos de barras usando Recharts
- Tres gráficos: All, With SP, No SP

#### `DevPerformanceTable.jsx`
- Tabla detallada con breakdown por estado
- Muestra count y porcentaje

## Flujo de Datos

```
User Interaction
    ↓
DevPerformanceSelectors
    ↓
useDevPerformance Hook
    ↓
devPerformanceService (filtrado y cálculos)
    ↓
Metrics & StatusBreakdowns
    ↓
DevPerformanceMetrics, Charts, Table
```

## Uso

```jsx
import DevPerformanceView from './components/DevPerformance/DevPerformanceView';

// En App.jsx
{activeView === 'dev-performance' && <DevPerformanceView />}
```

## Ventajas de esta Arquitectura

1. **Separación de Responsabilidades**
   - Lógica de negocio separada de la UI
   - Componentes pequeños y enfocados

2. **Testabilidad**
   - Servicios fáciles de testear (funciones puras)
   - Hooks testables con React Testing Library
   - Componentes testables de forma aislada

3. **Mantenibilidad**
   - Código organizado y fácil de encontrar
   - Cambios localizados (no afectan todo el módulo)

4. **Reutilización**
   - Servicios reutilizables en otros módulos
   - Componentes reutilizables

5. **Escalabilidad**
   - Fácil agregar nuevas métricas
   - Fácil agregar nuevos filtros
   - Fácil agregar nuevos gráficos

## Extensión

Para agregar nuevas funcionalidades:

1. **Nueva métrica**: Agregar función en `devPerformanceService.js`
2. **Nuevo filtro**: Agregar función de filtrado en `devPerformanceService.js` y actualizar el hook
3. **Nuevo gráfico**: Crear nuevo componente en `DevPerformance/` y agregarlo a `DevPerformanceView`
4. **Nuevo cálculo**: Agregar función en `devPerformanceService.js` y usarla en el hook

## Dependencias

- `react` - Framework UI
- `recharts` - Gráficos
- `@supabase/supabase-js` - Cliente de Supabase





