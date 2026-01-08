# 📊 Qué Falta para Ver Datos Reales en los KPIs

## Estado Actual

✅ **Migraciones SQL ejecutadas:**
- Tabla `deployments` existe
- Tabla `enps_responses` existe
- Funciones creadas (`calculate_added_story_points`, `calculate_rework_rate`, `calculate_enps`)
- Campos agregados (`planned_story_points`, `added_story_points`, etc.)

✅ **Servicios creados:**
- `qualityKPIService.js` - Listo para usar datos reales
- `teamHealthKPIService.js` - Listo para usar datos reales

✅ **Componentes actualizados:**
- `QualityKPIs.jsx` - Usa `getQualityKPIData()`
- `TeamHealthKPIs.jsx` - Usa `getTeamHealthKPIData()`

---

## ❌ Lo Que Falta para Ver Datos Reales

### 1. **Deployments Data** (Para Change Failure Rate y Deploy Frequency preciso)

**Estado:** Tabla existe, pero está vacía

**Qué hacer:**
- Opción A: Insertar datos manualmente (para pruebas)
- Opción B: Conectar CI/CD para poblar automáticamente (To Be Connected)

**Script SQL para poblar datos de ejemplo:**
```sql
-- Insertar algunos deployments de ejemplo
INSERT INTO deployments (deploy_date, environment, status, sprint_id)
SELECT 
  NOW() - (random() * INTERVAL '30 days') as deploy_date,
  'production' as environment,
  CASE WHEN random() < 0.95 THEN 'success' ELSE 'failure' END as status,
  s.id as sprint_id
FROM sprints s
WHERE s.state = 'closed'
ORDER BY s.end_date DESC
LIMIT 20;
```

---

### 2. **eNPS Responses** (Para eNPS)

**Estado:** Tabla existe, pero está vacía

**Qué hacer:**
- Opción A: Insertar datos manualmente (para pruebas)
- Opción B: Implementar UI de encuestas (To Be Connected)

**Script SQL para poblar datos de ejemplo:**
```sql
-- Insertar respuestas eNPS de ejemplo
INSERT INTO enps_responses (survey_date, respondent_id, nps_score, survey_period)
SELECT 
  CURRENT_DATE - (random() * INTERVAL '30 days')::INTEGER as survey_date,
  d.id as respondent_id,
  (random() * 10)::INTEGER as nps_score,
  'weekly' as survey_period
FROM developers d
WHERE d.active = true
LIMIT 20;
```

---

### 3. **Planning Fields** (Para Planning Accuracy)

**Estado:** Campo `planned_story_points` existe, pero necesita poblarse

**Qué hacer:**
- Ejecutar el script de población nuevamente (ya corregido)
- O poblar manualmente durante el planning de cada sprint

**Script SQL para poblar desde métricas existentes:**
```sql
-- Poblar planned_story_points desde sprint_metrics
UPDATE sprints s
SET planned_story_points = (
  SELECT total_story_points 
  FROM sprint_metrics sm
  WHERE sm.sprint_id = s.id
  ORDER BY sm.calculated_at DESC
  LIMIT 1
)
WHERE s.state = 'closed' 
  AND s.planned_story_points IS NULL;
```

---

### 4. **Net Bug Flow** (Para Development Quality)

**Estado:** Depende de que `issue_type` esté poblado en `issues`

**Qué hacer:**
- Verificar si `issue_type` está poblado
- Si no, necesita sincronizarse desde Jira

**Query para verificar:**
```sql
-- Verificar si issue_type está poblado
SELECT 
  issue_type, 
  COUNT(*) as count
FROM issues
GROUP BY issue_type
ORDER BY count DESC;
```

**Si está poblado:** Los servicios ya pueden calcular Net Bug Flow
**Si NO está poblado:** Necesita sincronizarse desde Jira

---

### 5. **Rework Rate** (Para Development Quality)

**Estado:** Función existe, pero necesita historial de estados

**Qué hacer:**
- Verificar que `status_by_sprint` esté poblado en `issues`
- La función `calculate_rework_rate()` ya está lista

**Query para verificar:**
```sql
-- Verificar si status_by_sprint está poblado
SELECT 
  COUNT(*) as total_issues,
  COUNT(status_by_sprint) as issues_with_history,
  COUNT(*) FILTER (WHERE status_by_sprint IS NOT NULL AND status_by_sprint != '{}'::JSONB) as issues_with_valid_history
FROM issues;
```

---

## 🎯 Plan de Acción Inmediato

### Paso 1: Poblar Datos de Ejemplo (Para Ver Datos Reales Ahora)

1. **Ejecutar script de población mejorado:**
   ```bash
   npm run populate-kpi-data
   ```

2. **Insertar deployments de ejemplo:**
   - Ejecutar el SQL de ejemplo arriba en Supabase SQL Editor

3. **Insertar eNPS responses de ejemplo:**
   - Ejecutar el SQL de ejemplo arriba en Supabase SQL Editor

### Paso 2: Verificar Datos Existentes

1. **Verificar issue_type:**
   ```sql
   SELECT DISTINCT issue_type FROM issues LIMIT 10;
   ```

2. **Verificar status_by_sprint:**
   ```sql
   SELECT COUNT(*) FROM issues WHERE status_by_sprint IS NOT NULL;
   ```

### Paso 3: Probar los KPIs

1. **Ejecutar la aplicación:**
   ```bash
   npm run dev
   ```

2. **Navegar a KPIs:**
   - Quality KPIs
   - Team Health KPIs

3. **Verificar en consola del navegador:**
   - Deberías ver logs indicando si se están usando datos reales o mock
   - Si hay datos reales disponibles, se mostrarán automáticamente

---

## 📋 Checklist de Verificación

- [ ] Migraciones SQL ejecutadas ✅
- [ ] Tabla `deployments` existe ✅
- [ ] Tabla `enps_responses` existe ✅
- [ ] Funciones creadas ✅
- [ ] Servicios de KPIs creados ✅
- [ ] Componentes actualizados ✅
- [ ] **FALTA:** Datos en `deployments` (insertar manualmente o conectar CI/CD)
- [ ] **FALTA:** Datos en `enps_responses` (insertar manualmente o implementar UI)
- [ ] **FALTA:** `planned_story_points` poblado (ejecutar script corregido)
- [ ] **VERIFICAR:** `issue_type` poblado en `issues` (para Net Bug Flow)
- [ ] **VERIFICAR:** `status_by_sprint` poblado en `issues` (para Rework Rate)

---

## 🚀 Script Rápido para Poblar Datos de Ejemplo

He creado un script SQL completo que puedes ejecutar en Supabase para poblar datos de ejemplo y ver los KPIs funcionando con datos reales.

**Archivo:** `docs/supabase/POPULATE_SAMPLE_DATA.sql` (crear si es necesario)

---

## 💡 Nota Importante

Los servicios están diseñados para:
1. **Intentar obtener datos reales primero**
2. **Usar datos mock como fallback** si no hay datos reales disponibles

Esto significa que:
- Si insertas datos de ejemplo, los KPIs mostrarán datos reales automáticamente
- Si no hay datos, seguirán mostrando datos mock (sin errores)
- No necesitas cambiar código, solo poblar datos

