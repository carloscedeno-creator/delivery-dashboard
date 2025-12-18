# ⚠️ EJECUTAR MIGRACIÓN AHORA - INSTRUCCIONES INMEDIATAS

## Problema Actual

La tabla `issues` **NO tiene los nuevos campos históricos** todavía. Por eso cuando intentas hacer SELECT de esas columnas, obtienes "No rows returned" o errores de "column does not exist".

## Solución: Aplicar la Migración SQL Manualmente

### Opción 1: Usar el Script de Verificación (RECOMENDADO)

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
npm run apply-migration
```

Este script:
1. ✅ Verifica si las columnas existen
2. ✅ Crea la función `exec_sql` si no existe
3. ✅ Aplica la migración automáticamente
4. ✅ Verifica que todo se creó correctamente

### Opción 2: Ejecutar SQL Directamente en Supabase Dashboard

1. **Ve a Supabase Dashboard** → **SQL Editor**
2. **Ejecuta PRIMERO** este SQL (crea la función exec_sql):

```sql
-- Crear función exec_sql si no existe
CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result TEXT;
BEGIN
    EXECUTE p_sql;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;
```

3. **Luego ejecuta** la migración completa:

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

## Verificar que la Migración se Aplicó

Ejecuta este SQL en Supabase:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN ('sprint_history', 'status_by_sprint', 'story_points_by_sprint', 'status_history_days', 'epic_name')
ORDER BY column_name;
```

**Deberías ver 5 filas** con las columnas nuevas.

## Después de Aplicar la Migración

1. ✅ La tabla `issues` tendrá los nuevos campos
2. ✅ El próximo workflow de GitHub Actions sincronizará y poblará estos campos
3. ✅ Los datos históricos estarán disponibles en tiempo real

## Archivos de Migración

- `docs/supabase/00_create_exec_sql_function.sql` - Función para ejecutar SQL
- `docs/supabase/06_add_issue_historical_fields.sql` - Migración de campos históricos

## Nota Importante

**Los workflows de GitHub Actions ahora aplicarán migraciones automáticamente**, pero necesitas aplicar esta primera migración manualmente porque la tabla aún no tiene la estructura actualizada.
