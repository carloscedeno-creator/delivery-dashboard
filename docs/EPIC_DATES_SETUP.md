# Configuración de Fechas de Épicas para Delivery Roadmap

## Problema

El Delivery Roadmap necesita usar las fechas del timeline de Jira para las épicas, pero la tabla `initiatives` actualmente no tiene los campos `start_date` y `end_date`.

## Solución

### Paso 1: Agregar campos a la tabla

Ejecuta el siguiente SQL en Supabase SQL Editor:

```sql
-- Agregar campos start_date y end_date a initiatives
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Crear índices para búsquedas por fechas
CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

-- Comentarios
COMMENT ON COLUMN initiatives.start_date IS 'Fecha de inicio de la épica desde el timeline de Jira';
COMMENT ON COLUMN initiatives.end_date IS 'Fecha de fin de la épica desde el timeline de Jira';
```

O ejecuta el archivo: `docs/supabase/ADD_EPIC_DATES.sql`

### Paso 2: Actualizar script de sincronización

El script de sincronización en `GooglescriptsDelivery` necesita actualizarse para:

1. Obtener las fechas de las épicas desde Jira API (timeline)
2. Guardar `start_date` y `end_date` en la tabla `initiatives`

**Campos de Jira a obtener:**
- `fields.customfield_10015` o similar (Epic Start Date)
- `fields.customfield_10016` o similar (Epic End Date)
- O desde el timeline view de Jira

### Paso 3: Verificar

Una vez que los campos estén agregados y el sync actualizado:

1. El código en `src/utils/supabaseApi.js` ya está preparado para usar estas fechas
2. El Delivery Roadmap mostrará las épicas con sus fechas del timeline
3. Si una épica no tiene fechas, usará fallback a fechas de sprint

## Prioridad de Fechas

El código usa esta prioridad:

1. **Épica**: `initiative.start_date` y `initiative.end_date` (del timeline de Jira) ← **PRIORIDAD**
2. **Sprint**: Fechas del sprint más reciente del squad
3. **Fallback**: `initiative.created_at` para start_date

## Estado Actual

- ✅ Código preparado para usar fechas de épicas
- ⚠️  Campos `start_date` y `end_date` necesitan agregarse a la tabla
- ⚠️  Script de sincronización necesita actualizarse para guardar fechas





