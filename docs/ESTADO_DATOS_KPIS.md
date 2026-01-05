# 📊 Estado de Datos para KPIs - Análisis Completo

## Resumen Ejecutivo

**Estado General:** ⚠️ **Parcialmente Disponible**

- ✅ **1 de 3 KPIs principales** puede calcularse completamente (Delivery Success - parcial)
- ⚠️ **2 de 3 KPIs principales** requieren datos adicionales (Development Quality, Team Health)

---

## 📈 Análisis Detallado por KPI

### 1. ✅ Delivery Success Score (75% Disponible)

| Componente | Peso | Estado | Datos Disponibles | Datos Faltantes |
|------------|------|--------|-------------------|-----------------|
| **Cycle Time** | 40% | ✅ **Disponible** | `avg_lead_time_days` en `v_sprint_metrics_complete`<br>`dev_start_date`, `dev_close_date` en `issues` | Breakdown preciso de fases (Coding, Pickup, Review, Deploy) |
| **Deploy Frequency** | 30% | ⚠️ **Estimado** | Se estima desde sprints completados | Tabla `deployments` con timestamps reales |
| **PR Size** | 30% | ❌ **No Disponible** | - | Tabla `pull_requests` + Integración GitHub/GitLab<br>⚠️ **NO IMPLEMENTABLE AHORA** - Requiere acceso a repositorios |

**Puede calcularse:** ✅ **Sí** (con estimaciones para Deploy Frequency y mock para PR Size)

---

### 2. ❌ Development Quality Score (0% Disponible)

| Componente | Peso | Estado | Datos Disponibles | Datos Faltantes |
|------------|------|--------|-------------------|-----------------|
| **Change Failure Rate** | 50% | ❌ **No Disponible** | - | Tabla `deployments` con campo `status` (success/failure) |
| **Net Bug Flow** | 30% | ⚠️ **Parcial** | Campo `issue_type` existe (según esquema SQL) | Verificar si está poblado<br>Calcular ratio bugs resueltos/creados |
| **Rework Rate** | 20% | ❌ **No Disponible** | - | Tracking de rework (tabla o campo `rework_count`) |

**Puede calcularse:** ❌ **No** (requiere tablas nuevas)

---

### 3. ⚠️ Team Health Score (60% Disponible)

| Componente | Peso | Estado | Datos Disponibles | Datos Faltantes |
|------------|------|--------|-------------------|-----------------|
| **eNPS** | 40% | ❌ **No Disponible** | - | Tabla `enps_responses` + Sistema de encuestas |
| **Planning Accuracy** | 30% | ⚠️ **Parcial** | `total_story_points`, `completed_story_points` en `sprint_metrics` | Campos `planned_story_points` y `added_story_points` |
| **Capacity Accuracy** | 30% | ⚠️ **Parcial** | `workload_sp`, `velocity_sp` en `developer_sprint_metrics` | Campos `planned_capacity` vs `actual_capacity` |

**Puede calcularse:** ⚠️ **Parcialmente** (falta eNPS y algunos campos)

---

## 🔴 Tablas Críticas Faltantes

### 1. **`deployments`** 🔴 ALTA PRIORIDAD
**Impacto:** Change Failure Rate (50% de Development Quality) + Deploy Frequency preciso

**Campos necesarios:**
- `deploy_date` TIMESTAMPTZ
- `environment` TEXT ('staging', 'production')
- `status` TEXT ('success', 'failure', 'rollback')
- `sprint_id` UUID (FK a sprints)
- `deployed_by_id` UUID (FK a developers)
- `rollback_date` TIMESTAMPTZ (opcional)
- `failure_reason` TEXT (opcional)

**Fuente:** Integración con CI/CD (GitHub Actions, GitLab CI, Jenkins, etc.)

---

### 2. **`pull_requests`** ⚠️ NO IMPLEMENTABLE AHORA
**Impacto:** PR Size (30% de Delivery Success)

**Estado:** Requiere acceso a repositorios de GitHub/GitLab que no están disponibles actualmente.

**Nota:** Esta funcionalidad se implementará cuando se tenga acceso a los repositorios. Por ahora, PR Size seguirá usando datos mock.

**Campos necesarios (para futuro):**
- `pr_number` INTEGER
- `repository` TEXT
- `author_id` UUID (FK a developers)
- `lines_added` INTEGER
- `lines_deleted` INTEGER
- `files_changed` INTEGER
- `created_at` TIMESTAMPTZ
- `merged_at` TIMESTAMPTZ
- `state` TEXT ('open', 'merged', 'closed')
- `sprint_id` UUID (FK a sprints)

**Fuente:** Integración con GitHub/GitLab API (cuando esté disponible)

---

### 3. **`enps_responses`** 🟡 MEDIA PRIORIDAD
**Impacto:** eNPS (40% de Team Health)

**Campos necesarios:**
- `survey_date` DATE
- `respondent_id` UUID (FK a developers)
- `nps_score` INTEGER (0-10)
- `comments` TEXT (opcional)

**Fuente:** Sistema de encuestas (manual o automatizado)

---

### 4. **`issue_rework_history`** 🟢 BAJA PRIORIDAD
**Impacto:** Rework Rate (20% de Development Quality)

**Alternativa:** Puede calcularse desde historial de estados en `issues`

**Campos necesarios (si se crea tabla):**
- `issue_id` UUID (FK a issues)
- `rework_date` TIMESTAMPTZ
- `original_status` TEXT
- `rework_status` TEXT
- `reason` TEXT (opcional)

---

## 🟡 Campos Adicionales Necesarios

### En `sprints`:
```sql
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS planned_story_points INTEGER;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS planned_capacity_hours DECIMAL(10,2);
```

### En `sprint_metrics`:
```sql
ALTER TABLE sprint_metrics ADD COLUMN IF NOT EXISTS added_story_points INTEGER;
ALTER TABLE sprint_metrics ADD COLUMN IF NOT EXISTS actual_capacity_hours DECIMAL(10,2);
```

### En `issues`:
```sql
-- Verificar si existe, si no:
ALTER TABLE issues ADD COLUMN IF NOT EXISTS issue_type VARCHAR(100);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS rework_count INTEGER DEFAULT 0;
```

---

## ✅ Verificaciones Necesarias

Antes de implementar, verificar:

1. ✅ ¿Existe `issue_type` en `issues` y está poblado?
   - **Query:** `SELECT DISTINCT issue_type FROM issues LIMIT 10;`
   - **Necesario para:** Net Bug Flow

2. ✅ ¿Qué campos tiene `sprint_metrics`?
   - **Query:** `SELECT * FROM sprint_metrics LIMIT 1;`
   - **Necesario para:** Planning Accuracy, Capacity Accuracy

3. ✅ ¿Qué campos tiene `developer_sprint_metrics`?
   - **Query:** `SELECT * FROM developer_sprint_metrics LIMIT 1;`
   - **Necesario para:** Capacity Accuracy

4. ✅ ¿Existe tabla `deployments`?
   - **Query:** `SELECT * FROM deployments LIMIT 1;`
   - **Necesario para:** Change Failure Rate, Deploy Frequency preciso

5. ✅ ¿Existe tabla `pull_requests`?
   - **Query:** `SELECT * FROM pull_requests LIMIT 1;`
   - **Necesario para:** PR Size

---

## 🎯 Plan de Implementación Recomendado

### Fase 1: Verificación (Inmediato)
1. Ejecutar script `verify-supabase-structure.js` para verificar estructura actual
2. Verificar si `issue_type` está poblado en `issues`
3. Verificar campos disponibles en `sprint_metrics` y `developer_sprint_metrics`

### Fase 2: Implementación Crítica (Alta Prioridad)
1. **Crear tabla `deployments`**
   - Migración SQL
   - Integración con CI/CD para poblar datos
   - Servicio de sincronización

2. **Crear tabla `pull_requests`**
   - Migración SQL
   - Integración con GitHub/GitLab API
   - Servicio de sincronización

### Fase 3: Campos Adicionales (Media Prioridad)
3. **Agregar campos a `sprints` y `sprint_metrics`**
   - `planned_story_points`, `added_story_points`
   - `planned_capacity_hours`, `actual_capacity_hours`

### Fase 4: Sistema de Encuestas (Baja Prioridad)
4. **Crear tabla `enps_responses`**
   - Migración SQL
   - UI para encuestas
   - Proceso de recolección

---

## 📝 Notas Importantes

- **Cycle Time**: Ya funciona pero necesita mejor breakdown de fases (Coding, Pickup, Review, Deploy)
- **Deploy Frequency**: Actualmente se estima desde sprints, necesita datos reales
- **PR Size**: Completamente faltante, requiere integración con Git
- **Change Failure Rate**: Depende completamente de tabla `deployments`
- **Net Bug Flow**: Depende de que `issue_type` esté poblado correctamente
- **Rework Rate**: Puede calcularse desde historial de estados o necesita tracking explícito
- **eNPS**: Requiere sistema de encuestas (puede empezar manual)
- **Planning Accuracy**: Casi completo, solo falta distinguir planned vs added
- **Capacity Accuracy**: Puede calcularse desde métricas existentes con algunos ajustes

---

## 🔄 Próximos Pasos Inmediatos

1. ✅ Ejecutar verificación de estructura (script creado)
2. ✅ Crear migraciones SQL para tablas faltantes
3. ✅ Implementar servicios de sincronización
4. ✅ Actualizar servicios de KPIs para usar datos reales

