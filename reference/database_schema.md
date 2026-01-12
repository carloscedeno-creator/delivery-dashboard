# Database Schema - Supabase

**Última actualización:** 2024-12-19

---

## 📊 Tablas Principales

### Core Tables
- **`squads`** - Equipos/squads
- **`sprints`** - Sprints de Jira
- **`issues`** - Issues/tickets de Jira
- **`developers`** - Desarrolladores
- **`initiatives`** - Iniciativas/épicas

### Relationship Tables
- **`issue_sprints`** - Relación issues-sprints
- **`sprint_scope_changes`** - Cambios de scope durante sprints

### Configuration Tables
- **`status_definitions`** - Definiciones de estatus (fuente de verdad)
- **`app_users`** - Usuarios de la aplicación
- **`role_permissions`** - Permisos por rol

---

## 🔧 Funciones RPC Importantes

### `calculate_squad_sprint_sp_done(squad_id UUID, sprint_id UUID)`
- **Propósito:** Calcular Story Points "Done" para un squad y sprint
- **Lógica:** Usa `is_status_completed()` que consulta `status_definitions`
- **Retorna:** NUMERIC (SP Done)
- **Migración:** `docs/supabase/update_calculate_sp_done_function.sql`

### `is_status_completed(status_name TEXT, include_dev_done BOOLEAN)`
- **Propósito:** Verificar si un estatus es "completed"
- **Lógica:** Consulta `status_definitions` table
- **Retorna:** BOOLEAN
- **Migración:** Incluida en `create_status_definitions_table.sql`

### `calculate_rework_rate(squad_id UUID, sprint_id UUID)`
- **Propósito:** Calcular tasa de rework
- **Retorna:** NUMERIC

---

## 📋 Vistas Útiles

### `v_sprint_metrics_complete`
- Métricas completas de sprint
- Incluye cálculos automáticos

### `v_developer_sprint_metrics_complete`
- Métricas completas por desarrollador y sprint
- Incluye cálculos automáticos

### `sprint_scope_changes_summary`
- Resumen de cambios de scope por sprint
- Agregados, removidos, cambios en SP

---

## 🔄 Triggers y Automatización

### Auto-calculation Triggers
- Métricas se calculan automáticamente cuando hay cambios
- Ver: `docs/supabase/05_auto_calculate_metrics_trigger.sql`

---

## 📝 Migraciones Importantes

### Status Definitions
- **Archivo:** `jira-supabase-sync/migrations/create_status_definitions_table.sql`
- **Propósito:** Tabla centralizada de definiciones de estatus

### Scope Changes
- **Archivo:** `jira-supabase-sync/migrations/create_sprint_scope_changes_table.sql`
- **Propósito:** Tracking de cambios de scope

### Calculate SP Done Function
- **Archivo:** `docs/supabase/update_calculate_sp_done_function.sql`
- **Propósito:** Actualizar función RPC para usar `status_definitions`

---

## ⚠️ Notas Importantes

- **Siempre usar** funciones RPC para cálculos complejos
- **No calcular manualmente** SP Done (usar `calculate_squad_sprint_sp_done`)
- **Consultar** `status_definitions` para verificar estatus (no hardcodear)
- **Verificar** que migraciones están aplicadas antes de usar funciones RPC

---

## 🔗 Referencias

- Migraciones: `docs/supabase/` y `jira-supabase-sync/migrations/`
- Supabase API: `src/utils/supabaseApi.js`
- Status Helper: `src/utils/statusHelper.js`
