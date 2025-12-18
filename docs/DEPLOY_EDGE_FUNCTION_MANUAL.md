# Desplegar Edge Function Manualmente desde Supabase Dashboard

## Opción 1: Desplegar desde Dashboard (Recomendado)

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/functions
2. Haz clic en "Create a new function"
3. Nombre: `execute-sync-sql`
4. Copia el contenido de `supabase/functions/execute-sync-sql/index.ts`
5. Pega el código en el editor
6. Haz clic en "Deploy"

## Opción 2: Ejecutar Sincronización (Funciona sin Edge Function)

El script de sincronización puede funcionar de dos formas:

### Si la Edge Function está desplegada:
- Ejecutará el SQL automáticamente

### Si la Edge Function NO está desplegada:
- Guardará el SQL en `insert_all_squads.sql`
- Puedes ejecutarlo manualmente en Supabase SQL Editor

## Ejecutar Sincronización Ahora

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery"
node scripts/sincronizar-squads-db.js
```

El script:
1. ✅ Obtendrá épicas con fechas desde Jira
2. ✅ Generará SQL con las fechas
3. ✅ Intentará llamar a la Edge Function (si está desplegada)
4. ✅ Si no está desplegada, guardará el SQL en `insert_all_squads.sql`
5. ✅ Puedes ejecutar el SQL manualmente en Supabase SQL Editor

## Ejecutar SQL Manualmente

Si el script guarda el SQL en `insert_all_squads.sql`:

1. Abre: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new
2. Abre el archivo `insert_all_squads.sql`
3. Copia y pega el contenido
4. Haz clic en "Run"

## Nota

La Edge Function es opcional. El script funcionará guardando el SQL para ejecución manual.
