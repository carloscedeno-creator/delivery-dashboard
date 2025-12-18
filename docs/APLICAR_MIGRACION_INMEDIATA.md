# Aplicar Migración de Campos Históricos - INMEDIATO

## ⚠️ IMPORTANTE

**Los workflows de GitHub Actions corren desde `main`, no desde `v1.04`.**

Antes de que los workflows puedan usar los nuevos campos históricos, necesitas:

## Paso 1: Aplicar la Migración SQL Manualmente

Ejecuta este SQL en Supabase Dashboard (SQL Editor):

```sql
-- Migración: Agregar campos históricos a la tabla issues
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS sprint_history TEXT NULL,
ADD COLUMN IF NOT EXISTS status_by_sprint JSONB NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS story_points_by_sprint JSONB NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status_history_days TEXT NULL,
ADD COLUMN IF NOT EXISTS epic_name VARCHAR(255) NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.issues.sprint_history IS 'Historial de todos los sprints del ticket, separado por "; "';
COMMENT ON COLUMN public.issues.status_by_sprint IS 'JSON con el estado histórico por sprint';
COMMENT ON COLUMN public.issues.story_points_by_sprint IS 'JSON con SP iniciales por sprint';
COMMENT ON COLUMN public.issues.status_history_days IS 'Tiempo en cada estado en formato legible';
COMMENT ON COLUMN public.issues.epic_name IS 'Nombre de la épica asociada';

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_issues_sprint_history ON public.issues USING gin (status_by_sprint jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_issues_story_points_by_sprint ON public.issues USING gin (story_points_by_sprint jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_issues_epic_name ON public.issues USING btree (epic_name) WHERE epic_name IS NOT NULL;

-- Actualizar epic_name desde la tabla epics para datos existentes
UPDATE public.issues i
SET epic_name = e.epic_name
FROM public.epics e
WHERE i.epic_id = e.id
  AND i.epic_name IS NULL;
```

**O usa el script Node.js:**
```bash
cd jira-supabase-sync
node scripts/apply-migrations.js
```

## Paso 2: Verificar que la Migración se Aplicó

Ejecuta en Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN ('sprint_history', 'status_by_sprint', 'story_points_by_sprint', 'status_history_days', 'epic_name');
```

Deberías ver las 5 columnas nuevas.

## Paso 3: Hacer Merge a Main

Una vez aplicada la migración, los workflows de GitHub Actions (que corren desde `main`) aplicarán automáticamente las migraciones en el futuro y sincronizarán los nuevos campos.

## Archivo Completo

El archivo completo está en: `docs/supabase/06_add_issue_historical_fields.sql`
