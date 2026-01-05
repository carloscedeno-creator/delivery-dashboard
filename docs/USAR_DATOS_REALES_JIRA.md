# 📊 Usar Datos Reales de Jira para KPIs

## Objetivo
Usar los datos reales que ya están sincronizados desde Jira en Supabase, en lugar de datos de ejemplo.

---

## ✅ Datos Reales Disponibles desde Jira

### 1. **Cycle Time** ✅ DISPONIBLE
**Fuente:** `v_sprint_metrics_complete.avg_lead_time` o `sprint_metrics.avg_lead_time_days`

**Estado:** Ya funciona - `deliveryKPIService.js` ya lo usa

**Datos disponibles:**
- `avg_lead_time` en horas/días
- `dev_start_date` y `dev_close_date` en `issues`

---

### 2. **Deploy Frequency** ⚠️ ESTIMADO DESDE JIRA
**Fuente:** Se estima desde sprints completados

**Estado:** Ya funciona - `deliveryKPIService.js` lo estima desde sprints

**Mejora posible:** Si tienes información de deployments en Jira (como releases o versiones), podríamos usarla

---

### 3. **Net Bug Flow** ✅ DISPONIBLE (si `issue_type` está poblado)
**Fuente:** `issues` donde `issue_type = 'Bug'`

**Datos necesarios:**
- `issue_type` en `issues` (debe estar poblado desde Jira)
- `created_date` para bugs creados
- `resolved_date` para bugs resueltos

**Estado:** `qualityKPIService.js` ya lo calcula desde datos reales

**Verificar:**
```sql
SELECT DISTINCT issue_type FROM issues LIMIT 10;
```

---

### 4. **Rework Rate** ✅ DISPONIBLE (si `status_by_sprint` está poblado)
**Fuente:** `issues.status_by_sprint` (historial de estados)

**Datos necesarios:**
- `status_by_sprint` JSONB en `issues` (debe estar poblado desde Jira)

**Estado:** `qualityKPIService.js` usa función `calculate_rework_rate()` que analiza el historial

**Verificar:**
```sql
SELECT COUNT(*) FROM issues WHERE status_by_sprint IS NOT NULL;
```

---

### 5. **Planning Accuracy** ⚠️ PARCIALMENTE DISPONIBLE
**Fuente:** 
- `sprint_metrics.total_story_points` (disponible desde Jira)
- `sprint_metrics.completed_story_points` (disponible desde Jira)
- `sprints.planned_story_points` (necesita poblarse)

**Datos disponibles desde Jira:**
- `total_story_points` en `sprint_metrics` ✅
- `completed_story_points` en `sprint_metrics` ✅
- `added_story_points` (calculado desde issues creados después del inicio del sprint) ✅

**Datos que faltan:**
- `planned_story_points` en `sprints` (no viene de Jira, se establece durante planning)

**Solución:** Usar `total_story_points` como `planned_story_points` si no está definido

---

### 6. **Capacity Accuracy** ⚠️ PARCIALMENTE DISPONIBLE
**Fuente:**
- `developer_sprint_metrics.workload_sp` (disponible desde Jira)
- `developer_sprint_metrics.velocity_sp` (disponible desde Jira)
- `sprints.planned_capacity_hours` (necesita poblarse)

**Datos disponibles desde Jira:**
- `workload_sp` en `developer_sprint_metrics` ✅
- `velocity_sp` en `developer_sprint_metrics` ✅

**Solución:** Calcular capacidad real desde `workload_sp` y estimar capacidad planificada

---

## ❌ Datos NO Disponibles desde Jira

### 1. **Change Failure Rate**
**Por qué:** Jira no tiene información de deployments/rollbacks
**Solución:** Necesita tabla `deployments` poblada desde CI/CD

### 2. **eNPS**
**Por qué:** No es un dato de Jira, es una encuesta de equipo
**Solución:** Necesita tabla `enps_responses` poblada desde UI de encuestas

### 3. **PR Size**
**Por qué:** No está en Jira, está en GitHub/GitLab
**Solución:** Necesita integración con repositorios Git

---

## 🔧 Ajustes Necesarios en Servicios

### 1. Mejorar Planning Accuracy para usar datos reales
- Usar `total_story_points` como `planned_story_points` si no está definido
- Ya está implementado en `teamHealthKPIService.js`

### 2. Mejorar Capacity Accuracy para usar datos reales
- Calcular desde `workload_sp` y `velocity_sp` de `developer_sprint_metrics`
- Ya está implementado en `teamHealthKPIService.js`

### 3. Verificar Net Bug Flow
- Verificar que `issue_type` esté poblado
- Si está poblado, ya funciona automáticamente

### 4. Verificar Rework Rate
- Verificar que `status_by_sprint` esté poblado
- Si está poblado, ya funciona automáticamente

---

## 📋 Plan de Acción

### Paso 1: Verificar Datos Disponibles
Ejecutar script de análisis:
```bash
node scripts/analyze-real-data-availability.js
```

### Paso 2: Poblar Planning Fields desde Datos Reales
Ejecutar script de población (usa datos reales de Jira):
```bash
npm run populate-kpi-data
```

### Paso 3: Ajustar Servicios si es Necesario
- Los servicios ya están diseñados para usar datos reales
- Solo necesitan que los datos estén disponibles

### Paso 4: Probar KPIs
- Ejecutar aplicación: `npm run dev`
- Verificar que los KPIs muestren datos reales

---

## 💡 Nota Importante

Los servicios están diseñados para:
1. **Intentar obtener datos reales primero**
2. **Usar datos mock como fallback** solo si no hay datos reales

Esto significa que:
- Si los datos de Jira están disponibles, se usarán automáticamente
- No necesitas cambiar código, solo asegurarte de que los datos estén disponibles

