# 📊 Cálculo de Asignación de Desarrolladores

## 📋 Tabla de Conversión Story Points → Tiempo

| Story Points | Tiempo |
|--------------|--------|
| 1 SP | 4 horas |
| 2 SP | 1 día (8 horas) |
| 3 SP | 2-3 días (16-24 horas) |
| 5 SP | 3-4 días (24-32 horas) |

## ⏱️ Capacidad del Sprint

- **Duración del Sprint**: 2 semanas
- **Días de trabajo**: 8.5 días
- **Horas de trabajo**: 8.5 días × 8 horas/día = **68 horas**

## 🧮 Cálculo de Capacidad en Story Points

Basado en la conversión: **1 SP = 4 horas**

```
Capacidad del Sprint = 68 horas / 4 horas por SP = 17 SP
```

**Un desarrollador puede trabajar aproximadamente 17 Story Points por sprint.**

## 📈 Cálculo de Porcentaje de Asignación

### Por Iniciativa

Para cada iniciativa, el porcentaje se calcula así:

```javascript
percentage = (SP asignados en la iniciativa / 17 SP) × 100
```

**Ejemplo:**
- Un desarrollador tiene 5 SP asignados en la iniciativa "Cloud Migration"
- Porcentaje = (5 / 17) × 100 = **29%**

### Total del Desarrollador

El total de asignación de un desarrollador es la **suma de todos los porcentajes de sus iniciativas**:

```javascript
totalAllocation = suma de todos los porcentajes de iniciativas
```

**Ejemplo:**
- Iniciativa A: 5 SP = 29%
- Iniciativa B: 3 SP = 18%
- Iniciativa C: 2 SP = 12%
- **Total: 59%**

### Casos Especiales

- **> 100%**: El desarrollador está sobre-asignado (más de 17 SP en total)
- **80-100%**: Asignación óptima
- **< 80%**: Tiene capacidad disponible

## 🔍 Ejemplo Real

**Luis Mayz tiene asignado:**
- Environment Homologation: 5 SP = 29%
- Importing Metadata: 2 SP = 12%
- Pentest Bots: 5 SP = 29%
- Pentest Dev: 2 SP = 12%
- Pentest Production: 5 SP = 29%
- Pentest QA: 5 SP = 29%
- Pentest Staging: 5 SP = 29%
- Strata Public API: 5 SP = 29%
- Support: 3 SP = 18%

**Total SP: 37 SP**
**Total Allocation: 217%** (37 / 17 × 100)

Esto indica que Luis está asignado a **más del doble de su capacidad** en el sprint.

## ⚙️ Implementación

El cálculo se realiza en:
- `src/utils/supabaseApi.js` → `getDeveloperAllocationData()`
- `index.html` → función `loadFromSupabase()`

**Constante:**
```javascript
const SPRINT_CAPACITY_SP = 17; // SP por sprint
```

## 🔄 Filtro por Sprint Actual

**IMPORTANTE**: Solo se cuentan los issues que están **activos durante el sprint actual**.

Un issue se considera activo si:

1. **Está asignado al sprint actual** (según `issue_sprints`)
2. **Fue creado durante el sprint** (`created_date` dentro del rango del sprint)
3. **Está en desarrollo durante el sprint** (`dev_start_date` <= `sprint.end_date` y (`dev_close_date` >= `sprint.start_date` o `dev_close_date` es null))
4. **Fue resuelto durante el sprint** (`resolved_date` dentro del rango del sprint)

**Issues excluidos:**
- Issues completados hace más de 2 semanas (fuera del sprint actual)
- Issues que nunca estuvieron en el sprint actual
- Issues sin fechas de desarrollo que no se solapan con el sprint

## 📝 Notas

- El porcentaje por iniciativa **NO está limitado a 100%** porque un desarrollador puede estar asignado a múltiples iniciativas
- El total del desarrollador puede exceder 100% si está sobre-asignado
- El cálculo se basa en **SP de issues activos en el sprint actual**, no en issues viejos o futuros
- Solo se cuenta trabajo que está ocurriendo o ocurrió durante el sprint actual
