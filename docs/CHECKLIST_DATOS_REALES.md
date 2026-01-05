# ✅ Checklist: Verificar Datos Reales de Jira

## Queries SQL para Ejecutar en Supabase

Ejecuta estas queries en Supabase SQL Editor para verificar qué datos reales están disponibles:

### 1. Verificar issue_type (Para Net Bug Flow)
```sql
-- Ver tipos de issues disponibles
SELECT 
  issue_type, 
  COUNT(*) as count
FROM issues
GROUP BY issue_type
ORDER BY count DESC
LIMIT 10;

-- Verificar si hay bugs
SELECT COUNT(*) as total_bugs
FROM issues
WHERE issue_type = 'Bug';
```

**Resultado esperado:** Si ves tipos como 'Bug', 'Story', 'Task', etc., entonces Net Bug Flow puede calcularse.

---

### 2. Verificar status_by_sprint (Para Rework Rate)
```sql
-- Verificar si status_by_sprint está poblado
SELECT 
  COUNT(*) as total_issues,
  COUNT(status_by_sprint) as issues_with_history,
  COUNT(*) FILTER (
    WHERE status_by_sprint IS NOT NULL 
    AND status_by_sprint != '{}'::JSONB
  ) as issues_with_valid_history
FROM issues;

-- Ver ejemplo de historial
SELECT 
  issue_key,
  status_by_sprint
FROM issues
WHERE status_by_sprint IS NOT NULL
  AND status_by_sprint != '{}'::JSONB
LIMIT 5;
```

**Resultado esperado:** Si `issues_with_valid_history` > 0, entonces Rework Rate puede calcularse.

---

### 3. Verificar Planning Fields (Para Planning Accuracy)
```sql
-- Verificar planned_story_points
SELECT 
  COUNT(*) as total_closed_sprints,
  COUNT(planned_story_points) as sprints_with_planned_sp,
  COUNT(*) FILTER (WHERE planned_story_points IS NOT NULL) as with_planned
FROM sprints
WHERE state = 'closed';

-- Verificar sprint_metrics
SELECT 
  COUNT(*) as total_metrics,
  COUNT(total_story_points) as with_total_sp,
  COUNT(completed_story_points) as with_completed_sp,
  COUNT(added_story_points) as with_added_sp
FROM sprint_metrics;
```

**Resultado esperado:** Si hay `total_story_points` y `completed_story_points`, Planning Accuracy puede calcularse.

---

### 4. Verificar Capacity Data (Para Capacity Accuracy)
```sql
-- Verificar developer_sprint_metrics
SELECT 
  COUNT(*) as total_dev_metrics,
  COUNT(workload_sp) as with_workload,
  COUNT(velocity_sp) as with_velocity
FROM developer_sprint_metrics;

-- Ver ejemplo de datos
SELECT 
  workload_sp,
  velocity_sp,
  sprint_id
FROM developer_sprint_metrics
LIMIT 10;
```

**Resultado esperado:** Si hay `workload_sp` y `velocity_sp`, Capacity Accuracy puede calcularse.

---

### 5. Verificar Cycle Time (Ya funciona)
```sql
-- Verificar avg_lead_time
SELECT 
  COUNT(*) as total_metrics,
  COUNT(avg_lead_time_days) as with_lead_time,
  AVG(avg_lead_time_days) as avg_lead_time
FROM sprint_metrics
WHERE avg_lead_time_days IS NOT NULL;
```

**Resultado esperado:** Si hay `avg_lead_time_days`, Cycle Time ya funciona.

---

## 📊 Resumen de Verificación

Después de ejecutar las queries arriba, completa este checklist:

- [ ] **Net Bug Flow:** `issue_type` está poblado y hay bugs
- [ ] **Rework Rate:** `status_by_sprint` está poblado con historial válido
- [ ] **Planning Accuracy:** `total_story_points` y `completed_story_points` existen
- [ ] **Capacity Accuracy:** `workload_sp` y `velocity_sp` existen
- [ ] **Cycle Time:** `avg_lead_time_days` existe (ya funciona)

---

## 🎯 Qué Hacer Según los Resultados

### Si issue_type está poblado:
✅ Net Bug Flow funcionará automáticamente con datos reales

### Si status_by_sprint está poblado:
✅ Rework Rate funcionará automáticamente con datos reales

### Si total_story_points existe:
✅ Planning Accuracy funcionará usando `total_story_points` como `planned_story_points`

### Si workload_sp existe:
✅ Capacity Accuracy funcionará calculando desde `workload_sp`

---

## 💡 Nota

Los servicios ya están configurados para usar estos datos reales automáticamente. Solo necesitas verificar que los datos estén disponibles ejecutando las queries arriba.

