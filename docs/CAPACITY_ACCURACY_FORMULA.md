# 📊 Capacity Accuracy - Fórmula y Ejemplos

## Fórmula

```
Capacity Accuracy = Actual Capacity / Planned Capacity (ratio)

Score = Scoring basado en el ratio según rangos predefinidos
```

## Rangos de Scoring

Según `CAPACITY_ACCURACY_SCORING` en `kpiConfig.js`:

| Ratio | Nivel | Score | Significado |
|-------|-------|-------|-------------|
| 0.85 - 1.15 | Elite | 100 | Rango ideal (evita burnout) |
| 0.70 - 0.85 o 1.15 - 1.30 | Good | 85 | Bueno |
| 0.50 - 0.70 o 1.30 - 1.50 | Fair | 70 | Aceptable |
| 0.30 - 0.50 o 1.50 - 1.70 | Needs Focus | 50 | Necesita atención |
| < 0.30 o > 1.70 | Poor | 25 | Crítico |

**Target Q1 2026:** Ratio entre 0.85 y 1.15 (85% - 115%)

---

## Cálculo de Capacidad

### Planned Capacity (Capacidad Planificada)

Se calcula en este orden de prioridad:

1. **`sprints.planned_capacity_hours`** (si existe)
2. **`sprints.planned_story_points × 5`** (estimación: 1 SP = 5 horas)
3. **`sprint_metrics.total_story_points × 5`** (datos de Jira)
4. **`sprint_metrics.workload_sp × 5`** (como último recurso)

### Actual Capacity (Capacidad Real)

Se calcula en este orden de prioridad:

1. **`sprint_metrics.actual_capacity_hours`** (si existe)
2. **Suma de `developer_sprint_metrics.workload_sp × 5`** (suma de todos los desarrolladores)
3. **`sprint_metrics.workload_sp × 5`** (como último recurso)

**Conversión:** 1 Story Point (SP) ≈ 5 horas de trabajo

---

## Ejemplos Prácticos

### Ejemplo 1: Datos Ideales ✅

**Datos disponibles:**
- `sprints.planned_story_points` = 100 SP
- `developer_sprint_metrics` (suma de `workload_sp`) = 95 SP

**Cálculo:**
```
Planned Capacity = 100 SP × 5 horas = 500 horas
Actual Capacity = 95 SP × 5 horas = 475 horas

Ratio = 475 / 500 = 0.95

Score = 100 (Elite) porque 0.95 está en el rango 0.85-1.15
```

**Resultado:** ✅ **Capacity Accuracy = 0.95 (95%) - Score: 100/100**

---

### Ejemplo 2: Sobre Carga (Burnout Risk) ⚠️

**Datos disponibles:**
- `sprints.planned_story_points` = 80 SP
- `developer_sprint_metrics` (suma de `workload_sp`) = 120 SP

**Cálculo:**
```
Planned Capacity = 80 SP × 5 horas = 400 horas
Actual Capacity = 120 SP × 5 horas = 600 horas

Ratio = 600 / 400 = 1.50

Score = 70 (Fair) porque 1.50 está en el rango 1.30-1.50
```

**Resultado:** ⚠️ **Capacity Accuracy = 1.50 (150%) - Score: 70/100**
**Significado:** El equipo trabajó 50% más de lo planificado (riesgo de burnout)

---

### Ejemplo 3: Sub Carga (Baja Utilización) ⚠️

**Datos disponibles:**
- `sprints.planned_story_points` = 100 SP
- `developer_sprint_metrics` (suma de `workload_sp`) = 60 SP

**Cálculo:**
```
Planned Capacity = 100 SP × 5 horas = 500 horas
Actual Capacity = 60 SP × 5 horas = 300 horas

Ratio = 300 / 500 = 0.60

Score = 70 (Fair) porque 0.60 está en el rango 0.50-0.70
```

**Resultado:** ⚠️ **Capacity Accuracy = 0.60 (60%) - Score: 70/100**
**Significado:** El equipo solo utilizó 60% de la capacidad planificada (subutilización)

---

### Ejemplo 4: Usando total_story_points (Datos de Jira) ✅

**Datos disponibles:**
- `sprints.planned_story_points` = NULL (no existe)
- `sprint_metrics.total_story_points` = 90 SP
- `developer_sprint_metrics` (suma de `workload_sp`) = 88 SP

**Cálculo:**
```
Planned Capacity = 90 SP × 5 horas = 450 horas (usa total_story_points)
Actual Capacity = 88 SP × 5 horas = 440 horas

Ratio = 440 / 450 = 0.98

Score = 100 (Elite) porque 0.98 está en el rango 0.85-1.15
```

**Resultado:** ✅ **Capacity Accuracy = 0.98 (98%) - Score: 100/100**

---

### Ejemplo 5: Sin planned_story_points (Solo workload_sp) ⚠️

**Datos disponibles:**
- `sprints.planned_story_points` = NULL
- `sprint_metrics.total_story_points` = NULL
- `sprint_metrics.workload_sp` = 85 SP
- `developer_sprint_metrics` (suma de `workload_sp`) = 82 SP

**Cálculo:**
```
Planned Capacity = 85 SP × 5 horas = 425 horas (usa workload_sp como estimación)
Actual Capacity = 82 SP × 5 horas = 410 horas

Ratio = 410 / 425 = 0.96

Score = 100 (Elite) porque 0.96 está en el rango 0.85-1.15
```

**Resultado:** ✅ **Capacity Accuracy = 0.96 (96%) - Score: 100/100**

---

## Por Qué Puede Fallar

### Caso 1: No hay datos de capacidad planificada
```
❌ sprints.planned_capacity_hours = NULL
❌ sprints.planned_story_points = NULL
❌ sprint_metrics.total_story_points = NULL
❌ sprint_metrics.workload_sp = NULL

Resultado: No se puede calcular Planned Capacity → Capacity Accuracy = NULL
```

### Caso 2: No hay datos de capacidad real
```
❌ sprint_metrics.actual_capacity_hours = NULL
❌ developer_sprint_metrics.workload_sp = NULL (o tabla vacía)
❌ sprint_metrics.workload_sp = NULL

Resultado: No se puede calcular Actual Capacity → Capacity Accuracy = NULL
```

### Caso 3: Datos disponibles pero en diferentes sprints
```
✅ Sprint A tiene planned_story_points = 100
❌ Sprint A no tiene developer_sprint_metrics
✅ Sprint B tiene developer_sprint_metrics pero no planned_story_points

Resultado: No se puede calcular porque los datos están en sprints diferentes
```

---

## Solución: Qué Datos Necesitas

Para que Capacity Accuracy funcione, necesitas **al menos uno** de estos:

### Opción 1: Datos de Planning (Recomendado)
```sql
-- En la tabla sprints
UPDATE sprints 
SET planned_story_points = 100  -- O usar total_story_points desde sprint_metrics
WHERE id = 'sprint-id';
```

### Opción 2: Datos de Developer Metrics (Desde Jira)
```sql
-- Verificar que developer_sprint_metrics tiene workload_sp
SELECT 
  sprint_id,
  SUM(workload_sp) as total_workload_sp
FROM developer_sprint_metrics
WHERE sprint_id = 'sprint-id'
GROUP BY sprint_id;
```

### Opción 3: Usar total_story_points como Planned
```sql
-- Si planned_story_points no existe, usar total_story_points
SELECT 
  sm.sprint_id,
  sm.total_story_points as planned_sp,
  SUM(dsm.workload_sp) as actual_sp
FROM sprint_metrics sm
LEFT JOIN developer_sprint_metrics dsm ON sm.sprint_id = dsm.sprint_id
WHERE sm.sprint_id = 'sprint-id'
GROUP BY sm.sprint_id, sm.total_story_points;
```

---

## Verificación Rápida

Ejecuta esta query en Supabase para ver qué datos tienes:

```sql
SELECT 
  s.id as sprint_id,
  s.sprint_name,
  s.planned_capacity_hours,
  s.planned_story_points,
  sm.total_story_points,
  sm.actual_capacity_hours,
  COUNT(dsm.id) as developer_metrics_count,
  SUM(dsm.workload_sp) as total_dev_workload_sp,
  SUM(dsm.workload_sp) * 5 as calculated_actual_capacity_hours,
  COALESCE(
    s.planned_capacity_hours,
    s.planned_story_points * 5,
    sm.total_story_points * 5
  ) as calculated_planned_capacity_hours
FROM sprints s
LEFT JOIN sprint_metrics sm ON s.id = sm.sprint_id
LEFT JOIN developer_sprint_metrics dsm ON s.id = dsm.sprint_id
WHERE s.state = 'closed'
GROUP BY s.id, s.sprint_name, s.planned_capacity_hours, s.planned_story_points, 
         sm.total_story_points, sm.actual_capacity_hours
ORDER BY s.end_date DESC
LIMIT 5;
```

Esta query te mostrará exactamente qué datos están disponibles para calcular Capacity Accuracy.

