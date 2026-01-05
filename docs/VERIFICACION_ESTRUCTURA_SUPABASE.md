# 🔍 Verificación de Estructura Supabase

## Scripts Disponibles

### 1. `scripts/verify-supabase-structure.js`
Script completo que verifica todas las tablas y campos necesarios para los KPIs.

**Ejecutar:**
```bash
node scripts/verify-supabase-structure.js
```

### 2. `scripts/test-supabase-connection.js`
Script simple para verificar la conexión básica con Supabase.

**Ejecutar:**
```bash
node scripts/test-supabase-connection.js
```

---

## Verificación Manual

Si los scripts no funcionan, puedes verificar manualmente ejecutando estas consultas en Supabase SQL Editor:

### 1. Verificar campos en `issues`
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
ORDER BY column_name;
```

### 2. Verificar si `issue_type` está poblado
```sql
SELECT DISTINCT issue_type, COUNT(*) as count
FROM issues
GROUP BY issue_type
ORDER BY count DESC;
```

### 3. Verificar campos en `sprints`
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sprints' 
ORDER BY column_name;
```

### 4. Verificar campos en `sprint_metrics`
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sprint_metrics' 
ORDER BY column_name;
```

### 5. Verificar si existen tablas críticas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deployments', 'pull_requests', 'enps_responses', 'issue_rework_history')
ORDER BY table_name;
```

### 6. Verificar vista `v_sprint_metrics_complete`
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'v_sprint_metrics_complete' 
ORDER BY column_name;
```

---

## Resultados Esperados

### Campos Críticos a Verificar:

#### En `issues`:
- ✅ `id`, `issue_key`, `summary`
- ✅ `current_status`, `current_story_points`
- ✅ `assignee_id`, `initiative_id`, `squad_id`
- ✅ `created_date`, `dev_start_date`, `dev_close_date`, `resolved_date`
- ⚠️ `issue_type` - **VERIFICAR SI EXISTE Y ESTÁ POBLADO**
- ❌ `rework_count` - Probablemente no existe

#### En `sprints`:
- ✅ `id`, `sprint_name`, `squad_id`, `project_id`
- ✅ `start_date`, `end_date`, `state`, `complete_date`
- ❌ `planned_story_points` - Probablemente no existe
- ❌ `planned_capacity_hours` - Probablemente no existe

#### En `sprint_metrics`:
- ✅ `sprint_id`, `calculated_at`
- ✅ `total_story_points`, `completed_story_points`
- ✅ `avg_lead_time_days`
- ❌ `added_story_points` - Probablemente no existe
- ❌ `actual_capacity_hours` - Probablemente no existe

#### Tablas Faltantes:
- ❌ `deployments` - **NO EXISTE** (crítico)
- ❌ `pull_requests` - **NO EXISTE** (crítico)
- ❌ `enps_responses` - **NO EXISTE** (importante)
- ❌ `issue_rework_history` - **NO EXISTE** (opcional)

---

## Próximos Pasos Después de la Verificación

1. **Si `issue_type` existe y está poblado:**
   - ✅ Podemos calcular Net Bug Flow
   - Crear servicio `qualityKPIService.js` para calcular Net Bug Flow

2. **Si las tablas críticas no existen:**
   - Crear migraciones SQL para `deployments` y `pull_requests`
   - Implementar servicios de sincronización

3. **Si faltan campos en `sprints` y `sprint_metrics`:**
   - Crear migraciones SQL para agregar campos
   - Actualizar funciones de cálculo de métricas

---

## Notas

- Los scripts requieren que las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas en el archivo `.env`
- Si los scripts no funcionan, usa las consultas SQL manuales arriba
- Los resultados de la verificación ayudarán a determinar qué migraciones SQL crear primero

