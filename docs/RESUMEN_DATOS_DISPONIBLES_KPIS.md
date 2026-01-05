# 📊 Resumen: Datos Disponibles vs Necesarios para KPIs

## Estado Actual de los Datos

### ✅ **Delivery Success Score** - Parcialmente Disponible

| Métrica | Estado | Disponible | Falta |
|---------|--------|------------|-------|
| **Cycle Time** (40%) | ✅ **Disponible** | `avg_lead_time_days` en `v_sprint_metrics_complete`<br>`dev_start_date`, `dev_close_date` en `issues` | Breakdown preciso de fases (Coding, Pickup, Review, Deploy) |
| **Deploy Frequency** (30%) | ⚠️ **Estimado** | Se estima desde sprints completados | Tabla `deployments` con timestamps reales |
| **PR Size** (30%) | ❌ **No Disponible** | - | Tabla `pull_requests` + Integración GitHub/GitLab |

---

### ❌ **Development Quality Score** - No Disponible

| Métrica | Estado | Disponible | Falta |
|---------|--------|------------|-------|
| **Change Failure Rate** (50%) | ❌ **No Disponible** | - | Tabla `deployments` con campo `status` (success/failure) |
| **Net Bug Flow** (30%) | ⚠️ **Parcial** | Campo `issue_type` existe (según esquema) | Verificar si está poblado y calcular ratio bugs resueltos/creados |
| **Rework Rate** (20%) | ❌ **No Disponible** | - | Tracking de rework (tabla o campo `rework_count`) |

---

### ⚠️ **Team Health Score** - Parcialmente Disponible

| Métrica | Estado | Disponible | Falta |
|---------|--------|------------|-------|
| **eNPS** (40%) | ❌ **No Disponible** | - | Tabla `enps_responses` + Sistema de encuestas |
| **Planning Accuracy** (30%) | ⚠️ **Parcial** | `total_story_points`, `completed_story_points` en `sprint_metrics` | Campos `planned_story_points` y `added_story_points` |
| **Capacity Accuracy** (30%) | ⚠️ **Parcial** | `workload_sp`, `velocity_sp` en `developer_sprint_metrics` | Campos `planned_capacity` vs `actual_capacity` |

---

## 🔴 Tablas Críticas Faltantes

### 1. **`deployments`** (ALTA PRIORIDAD)
**Necesaria para:** Change Failure Rate + Deploy Frequency preciso

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

**Fuente de datos:** Integración con CI/CD (GitHub Actions, GitLab CI, etc.)

---

### 2. **`pull_requests`** (ALTA PRIORIDAD)
**Necesaria para:** PR Size

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

**Fuente de datos:** Integración con GitHub/GitLab API

---

### 3. **`enps_responses`** (MEDIA PRIORIDAD)
**Necesaria para:** eNPS

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

**Fuente de datos:** Sistema de encuestas (manual o automatizado)

---

## 🟡 Campos Adicionales Necesarios

### En `sprints`:
- `planned_story_points` INTEGER -- SP planificados antes del sprint
- `planned_capacity_hours` DECIMAL -- Capacidad planificada

### En `sprint_metrics`:
- `added_story_points` INTEGER -- SP agregados durante el sprint
- `actual_capacity_hours` DECIMAL -- Capacidad real utilizada

### En `issues`:
- Verificar si `issue_type` está poblado (para Net Bug Flow)
- `rework_count` INTEGER DEFAULT 0 (opcional, puede calcularse desde historial)

---

## ✅ Lo Que SÍ Podemos Calcular Ahora

1. **Cycle Time** - ✅ Disponible (con breakdown aproximado)
2. **Deploy Frequency** - ⚠️ Estimado desde sprints
3. **Planning Accuracy** - ⚠️ Parcial (falta distinguir planned vs added)
4. **Capacity Accuracy** - ⚠️ Parcial (puede calcularse desde `workload_sp` vs `velocity_sp`)
5. **Net Bug Flow** - ⚠️ Parcial (si `issue_type` está poblado)

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Verificar Datos Existentes
1. ✅ Verificar si `issue_type` está poblado en `issues`
2. ✅ Verificar campos disponibles en `sprint_metrics` y `developer_sprint_metrics`
3. ✅ Verificar si podemos calcular Planning Accuracy desde datos existentes

### Fase 2: Implementar Tablas Críticas
1. 🔴 Crear tabla `deployments` y sincronizar desde CI/CD
2. 🔴 Crear tabla `pull_requests` y sincronizar desde GitHub/GitLab
3. 🟡 Agregar campos faltantes en `sprints` y `sprint_metrics`

### Fase 3: Implementar Sistema de Encuestas
1. 🟢 Crear tabla `enps_responses`
2. 🟢 Implementar UI para encuestas de eNPS

---

## 📝 Notas Importantes

- **Cycle Time**: Ya funciona pero necesita mejor breakdown de fases
- **Deploy Frequency**: Actualmente se estima, necesita datos reales de deployments
- **PR Size**: Completamente faltante, requiere integración con Git
- **Change Failure Rate**: Depende de tabla `deployments`
- **Net Bug Flow**: Depende de que `issue_type` esté poblado correctamente
- **Rework Rate**: Puede calcularse desde historial de estados o necesita tracking explícito
- **eNPS**: Requiere sistema de encuestas (puede empezar manual)
- **Planning Accuracy**: Casi completo, solo falta distinguir planned vs added
- **Capacity Accuracy**: Puede calcularse desde métricas existentes

