# 📊 Resumen: Usar Datos Reales de Jira

## ✅ Lo Que Ya Funciona con Datos Reales de Jira

### 1. **Cycle Time** ✅
- **Fuente:** `sprint_metrics.avg_lead_time_days` (desde Jira)
- **Estado:** Ya funciona - usa datos reales automáticamente
- **Servicio:** `deliveryKPIService.js`

### 2. **Deploy Frequency** ⚠️
- **Fuente:** Estimado desde sprints completados (datos reales de Jira)
- **Estado:** Funciona pero es estimado
- **Mejora:** Si tienes releases en Jira, podríamos usarlas
- **Servicio:** `deliveryKPIService.js`

### 3. **Net Bug Flow** ✅ (si `issue_type` está poblado)
- **Fuente:** `issues` donde `issue_type = 'Bug'` (desde Jira)
- **Estado:** Funciona automáticamente si `issue_type` está poblado
- **Servicio:** `qualityKPIService.js` (mejorado para verificar datos)

### 4. **Rework Rate** ✅ (si `status_by_sprint` está poblado)
- **Fuente:** `issues.status_by_sprint` (historial desde Jira)
- **Estado:** Funciona automáticamente si el historial está poblado
- **Servicio:** `qualityKPIService.js` usa función `calculate_rework_rate()`

### 5. **Planning Accuracy** ✅ (usando datos reales de Jira)
- **Fuente:** 
  - `sprint_metrics.total_story_points` (desde Jira) ✅
  - `sprint_metrics.completed_story_points` (desde Jira) ✅
  - `sprint_metrics.added_story_points` (calculado desde issues de Jira) ✅
- **Estado:** Usa `total_story_points` como `planned_story_points` si no está definido
- **Servicio:** `teamHealthKPIService.js` (mejorado)

### 6. **Capacity Accuracy** ✅ (usando datos reales de Jira)
- **Fuente:**
  - `developer_sprint_metrics.workload_sp` (desde Jira) ✅
  - `developer_sprint_metrics.velocity_sp` (desde Jira) ✅
- **Estado:** Calcula desde `workload_sp` (datos reales)
- **Servicio:** `teamHealthKPIService.js` (mejorado)

---

## ❌ Lo Que NO Está Disponible en Jira

### 1. **Change Failure Rate**
- **Por qué:** Jira no tiene información de deployments/rollbacks
- **Solución:** Necesita tabla `deployments` desde CI/CD

### 2. **eNPS**
- **Por qué:** No es un dato de Jira, es una encuesta
- **Solución:** Necesita tabla `enps_responses` desde UI de encuestas

### 3. **PR Size**
- **Por qué:** No está en Jira, está en GitHub/GitLab
- **Solución:** Necesita integración con repositorios Git

---

## 🔧 Mejoras Realizadas

### 1. **Planning Accuracy**
- Ahora usa `total_story_points` como `planned_story_points` si no está definido
- Usa datos reales de Jira automáticamente

### 2. **Capacity Accuracy**
- Calcula desde `workload_sp` y `velocity_sp` (datos reales de Jira)
- Estima capacidad planificada desde `planned_story_points` o `workload_sp`

### 3. **Net Bug Flow**
- Verifica que `issue_type` esté poblado antes de calcular
- Usa datos reales de Jira cuando están disponibles

---

## 📋 Próximos Pasos

### 1. Ejecutar Script de Análisis
```bash
node scripts/analyze-real-data-availability.js
```

Este script verificará:
- Si `issue_type` está poblado (para Net Bug Flow)
- Si `status_by_sprint` está poblado (para Rework Rate)
- Qué datos están disponibles para cada KPI

### 2. Ejecutar Script de Población
```bash
npm run populate-kpi-data
```

Este script poblará:
- `planned_story_points` desde `total_story_points` (datos reales de Jira)
- `added_story_points` usando función (desde issues de Jira)

### 3. Probar KPIs
```bash
npm run dev
```

Los KPIs deberían mostrar datos reales automáticamente si están disponibles.

---

## 💡 Nota Importante

Los servicios están diseñados para usar datos reales de Jira cuando están disponibles. Solo usan datos mock como fallback si no hay datos reales.

**No necesitas datos de ejemplo** - los servicios usarán los datos reales de Jira automáticamente.

