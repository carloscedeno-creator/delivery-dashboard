# Ejecutar Migración - Paso a Paso

## ⚠️ IMPORTANTE: Configurar Variables de Entorno Primero

El script necesita acceso a Supabase. Tienes dos opciones:

### Opción 1: Crear archivo .env (RECOMENDADO)

1. **Crea el archivo** `jira-supabase-sync/.env` (copia de `env.example`):

```bash
cd jira-supabase-sync
copy env.example .env
```

2. **Edita el archivo** `.env` y configura:
   - `SUPABASE_URL` - Tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` - Tu Service Role Key de Supabase

3. **Ejecuta la migración**:
```bash
npm run apply-migrations
```

### Opción 2: Variables de Entorno del Sistema

Configura las variables antes de ejecutar:

**PowerShell:**
```powershell
$env:SUPABASE_URL="https://tu-url.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
npm run apply-migrations
```

**CMD:**
```cmd
set SUPABASE_URL=https://tu-url.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
npm run apply-migrations
```

## Ejecutar la Migración

Una vez configuradas las variables:

```bash
cd jira-supabase-sync
npm run apply-migrations
```

## Verificar que Funcionó

Ejecuta en Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN ('sprint_history', 'status_by_sprint', 'story_points_by_sprint', 'status_history_days', 'epic_name')
ORDER BY column_name;
```

Deberías ver **5 filas** con las nuevas columnas.

## Si el Script Falla

1. **Verifica que el archivo .env existe** en `jira-supabase-sync/.env`
2. **Verifica las credenciales** de Supabase
3. **Ejecuta manualmente** en Supabase Dashboard:
   - `docs/supabase/00_create_exec_sql_function.sql`
   - `docs/supabase/06_add_issue_historical_fields.sql`
