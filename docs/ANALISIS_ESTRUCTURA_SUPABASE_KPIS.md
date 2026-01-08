# Análisis de Estructura Supabase para KPIs

## Objetivo
Identificar qué datos están disponibles en Supabase y qué falta para calcular los KPIs según el documento Delivery OKRS Plan.

---

## 📊 KPIs a Calcular

### 1. Delivery Success Score
**Componentes:**
- Cycle Time (40%)
- Deploy Frequency (30%)
- PR Size (30%)

### 2. Development Quality Score
**Componentes:**
- Change Failure Rate (50%)
- Net Bug Flow (30%)
- Rework Rate (20%)

### 3. Team Health Score
**Componentes:**
- eNPS (40%)
- Planning Accuracy (30%)
- Capacity Accuracy (30%)

---

## 🔍 Análisis de Tablas Existentes

### Tablas Identificadas en el Código:

1. **`v_sprint_metrics_complete`** (Vista)
   - Usada para obtener métricas de sprints
   - Campos conocidos: `avg_lead_time`, `end_date`, `state`, `project_name`, `sprint_name`

2. **`issues`**
   - Campos conocidos:
     - `id`, `issue_key`, `summary`
     - `current_status`, `current_story_points`
     - `assignee_id`, `initiative_id`, `squad_id`
     - `created_date`, `dev_start_date`, `dev_close_date`, `resolved_date`
     - `current_sprint`
     - Campos históricos: `status_at_sprint_close`, `story_points_at_start`

3. **`sprints`**
   - Campos conocidos:
     - `id`, `sprint_name`, `squad_id`, `project_id`
     - `start_date`, `end_date`, `state`
     - `complete_date`

4. **`sprint_metrics`**
   - Campos conocidos:
     - `sprint_id`, `calculated_at`
     - `total_story_points`, `completed_story_points`
     - `avg_lead_time_days`
     - Contadores de estados

5. **`developers`**
   - Campos conocidos: `id`, `display_name`, `active`

6. **`squads`**
   - Campos conocidos: `id`, `squad_name`, `squad_key`

7. **`projects`**
   - Campos conocidos: `id`, `project_key`, `project_name`

8. **`initiatives`**
   - Campos conocidos: `id`, `initiative_name`, `squad_id`, `start_date`, `end_date`

---

## ✅ Datos Disponibles Actualmente

### Delivery Success Score

#### ✅ Cycle Time
- **Disponible**: `avg_lead_time_days` en `v_sprint_metrics_complete` o `sprint_metrics`
- **Breakdown disponible**: `dev_start_date`, `dev_close_date` en `issues`
- **Faltante**: 
  - Separación precisa de fases (Coding Time, Pickup Time, Review Time, Deploy Time)
  - Necesitamos timestamps más granulares de Git/Jira

#### ⚠️ Deploy Frequency
- **Disponible parcialmente**: Se estima desde sprints completados
- **Faltante**: 
  - Tabla `deployments` o `deploys` con timestamps reales
  - Estado de cada deploy (success/failure)
  - Integración con CI/CD (GitHub Actions, GitLab CI, etc.)

#### ❌ PR Size
- **No disponible**: No hay tabla de Pull Requests
- **Faltante**: 
  - Integración con GitHub/GitLab API
  - Tabla `pull_requests` con campos:
    - `pr_number`, `repository`, `author_id`
    - `lines_added`, `lines_deleted`, `files_changed`
    - `created_at`, `merged_at`, `closed_at`
    - `state` (open, merged, closed)

### Development Quality Score

#### ❌ Change Failure Rate
- **No disponible**: No hay tabla de deployments con estado
- **Faltante**: 
  - Tabla `deployments` con campos:
    - `id`, `deploy_date`, `environment` (staging, production)
    - `status` (success, failure, rollback)
    - `sprint_id`, `deployed_by_id`
    - `rollback_date` (si aplica)
    - `failure_reason` (opcional)

#### ❌ Net Bug Flow
- **Disponible parcialmente**: Podemos identificar bugs por tipo de issue
- **Faltante**: 
  - Campo `issue_type` en `issues` para identificar bugs vs features
  - O tabla `issue_types` con mapeo
  - Timestamps de creación y resolución de bugs
  - Campo `is_bug` o `issue_type = 'Bug'`

#### ❌ Rework Rate
- **No disponible**: No hay tracking de trabajo rehacer
- **Faltante**: 
  - Campo `rework_count` en `issues`
  - O tabla `issue_rework_history` con:
    - `issue_id`, `rework_date`, `reason`
    - `original_status`, `rework_status`
  - O identificar issues que vuelven a estados anteriores

### Team Health Score

#### ❌ eNPS
- **No disponible**: No hay sistema de encuestas
- **Faltante**: 
  - Tabla `team_surveys` con campos:
    - `id`, `survey_date`, `respondent_id` (developer_id)
    - `nps_score` (0-10)
    - `promoter_score`, `detractor_score`, `passive_score`
    - `comments` (opcional)
  - O tabla `enps_responses` más simple

#### ⚠️ Planning Accuracy
- **Disponible parcialmente**: `total_story_points`, `completed_story_points` en `sprint_metrics`
- **Faltante**: 
  - Distinción entre "Planned" (antes del sprint) vs "Added" (durante el sprint)
  - Campo `planned_story_points` en `sprints` o `sprint_metrics`
  - Campo `added_story_points` para issues agregados durante el sprint
  - Campo `completed_story_points` ya existe ✅

#### ⚠️ Capacity Accuracy
- **Disponible parcialmente**: Podemos calcular desde `sprint_metrics`
- **Faltante**: 
  - Campo `planned_capacity_hours` o `planned_capacity_sp` en `sprints`
  - Campo `actual_capacity_hours` o `actual_capacity_sp` en `sprint_metrics`
  - O cálculo desde `workload_sp` vs `velocity_sp` en `developer_sprint_metrics`

---

## 📋 Resumen: Qué Falta

### Tablas Nuevas Necesarias:

1. **`deployments`** (CRÍTICO para Change Failure Rate y Deploy Frequency preciso)
   ```sql
   CREATE TABLE deployments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     deploy_date TIMESTAMPTZ NOT NULL,
     environment TEXT NOT NULL, -- 'staging', 'production'
     status TEXT NOT NULL, -- 'success', 'failure', 'rollback'
     sprint_id UUID REFERENCES sprints(id),
     deployed_by_id UUID REFERENCES developers(id),
     rollback_date TIMESTAMPTZ,
     failure_reason TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **`pull_requests`** (CRÍTICO para PR Size)
   ```sql
   CREATE TABLE pull_requests (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pr_number INTEGER NOT NULL,
     repository TEXT NOT NULL,
     author_id UUID REFERENCES developers(id),
     lines_added INTEGER,
     lines_deleted INTEGER,
     files_changed INTEGER,
     created_at TIMESTAMPTZ,
     merged_at TIMESTAMPTZ,
     closed_at TIMESTAMPTZ,
     state TEXT, -- 'open', 'merged', 'closed'
     sprint_id UUID REFERENCES sprints(id),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **`team_surveys`** o `enps_responses` (CRÍTICO para eNPS)
   ```sql
   CREATE TABLE enps_responses (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     survey_date DATE NOT NULL,
     respondent_id UUID REFERENCES developers(id),
     nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
     comments TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **`issue_rework_history`** (Para Rework Rate)
   ```sql
   CREATE TABLE issue_rework_history (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     issue_id UUID REFERENCES issues(id),
     rework_date TIMESTAMPTZ NOT NULL,
     original_status TEXT,
     rework_status TEXT,
     reason TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Campos Adicionales Necesarios:

1. **En `issues`:**
   - `issue_type` TEXT -- 'Bug', 'Story', 'Task', 'Epic', etc.
   - `rework_count` INTEGER DEFAULT 0

2. **En `sprints`:**
   - `planned_story_points` INTEGER -- SP planificados antes del sprint
   - `planned_capacity_hours` DECIMAL -- Capacidad planificada en horas

3. **En `sprint_metrics`:**
   - `added_story_points` INTEGER -- SP agregados durante el sprint
   - `actual_capacity_hours` DECIMAL -- Capacidad real utilizada

---

## 🎯 Prioridades de Implementación

### Fase 1: Datos Críticos (Alta Prioridad)
1. ✅ **Cycle Time** - Ya disponible (necesita mejor breakdown)
2. 🔴 **Deployments Table** - Crítico para Change Failure Rate y Deploy Frequency preciso
3. 🔴 **PR Size** - Crítico para Delivery Success Score completo

### Fase 2: Datos Importantes (Media Prioridad)
4. 🟡 **Net Bug Flow** - Necesita identificar bugs en `issues`
5. 🟡 **Planning Accuracy** - Necesita campos `planned_story_points` y `added_story_points`
6. 🟡 **Capacity Accuracy** - Necesita campos de capacidad planificada vs real

### Fase 3: Datos Opcionales (Baja Prioridad)
7. 🟢 **Rework Rate** - Puede calcularse desde historial de estados o necesita tabla
8. 🟢 **eNPS** - Requiere sistema de encuestas (puede ser manual inicialmente)

---

## 📝 Recomendaciones

1. **Integración con CI/CD**: Conectar GitHub Actions/GitLab CI para poblar `deployments`
2. **Integración con Git**: Conectar GitHub/GitLab API para poblar `pull_requests`
3. **Sistema de Encuestas**: Implementar encuesta semanal/mensual para eNPS
4. **Tracking de Rework**: Implementar trigger en `issues` para detectar cambios de estado hacia atrás

---

## 🔄 Próximos Pasos

1. Crear migraciones SQL para tablas faltantes
2. Implementar servicios de sincronización para deployments y PRs
3. Actualizar servicios de KPIs para usar datos reales
4. Implementar sistema de encuestas para eNPS

