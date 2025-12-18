# Configuración Completa del Sincronizador Automático

## Estado Actual

✅ **Completado:**
- Supabase CLI instalado
- Función Edge `execute-sync-sql` creada
- Script de sincronización actualizado para usar Edge Function
- SQL para función RPC `exec_sql` preparado
- Script de despliegue creado

## Pasos Restantes

### Paso 1: Crear función RPC en PostgreSQL

Ejecuta este SQL en Supabase SQL Editor:

**Archivo:** `docs/supabase/CREATE_EXEC_SQL_FUNCTION.sql`

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error ejecutando SQL: %', SQLERRM;
END;
$$;
```

### Paso 2: Agregar columnas de fechas (si no se hizo)

Ejecuta este SQL en Supabase SQL Editor:

**Archivo:** `docs/supabase/ADD_EPIC_DATES.sql`

```sql
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);
```

### Paso 3: Hacer login en Supabase CLI

Abre una terminal nueva (PowerShell) y ejecuta:

```powershell
supabase login
```

Esto abrirá tu navegador para autenticarte.

### Paso 4: Desplegar función Edge

Después del login, ejecuta:

```powershell
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
.\scripts\deploy-edge-function.ps1
```

O manualmente:

```powershell
supabase link --project-ref sywkskwkexwwdzrbwinp
supabase functions deploy execute-sync-sql
```

### Paso 5: Configurar Service Role Key

En el directorio `GooglescriptsDelivery`, crea o actualiza el archivo `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Para obtener la Service Role Key:**
1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/settings/api
2. Copia la "service_role" key (⚠️ **NO** la anon key)

### Paso 6: Ejecutar sincronización

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery"
node scripts/sincronizar-squads-db.js
```

El script ahora:
- ✅ Obtendrá épicas con fechas desde Jira
- ✅ Generará SQL con las fechas
- ✅ Llamará automáticamente a la Edge Function
- ✅ Ejecutará el SQL en Supabase
- ✅ Actualizará los datos automáticamente

### Paso 7: Verificar en el Dashboard

1. Recarga el Delivery Roadmap
2. Las épicas deberían mostrar sus barras de timeline con fechas correctas
3. Revisa la consola del navegador para ver logs de fechas

## Troubleshooting

### Error: "function exec_sql does not exist"
→ Ejecuta el SQL del Paso 1

### Error: "Edge Function not available"
→ Despliega la función (Paso 4)

### Error: "Service role key no configurada"
→ Configura `SUPABASE_SERVICE_ROLE_KEY` en `.env` (Paso 5)

### Error: "No se puede ejecutar SQL automáticamente"
→ El SQL se guardó en `insert_all_squads.sql` para ejecución manual

## Orden de Ejecución Recomendado

1. **Primero:** Ejecutar SQLs en Supabase (Pasos 1 y 2)
2. **Segundo:** Desplegar Edge Function (Pasos 3 y 4)
3. **Tercero:** Configurar Service Role Key (Paso 5)
4. **Cuarto:** Ejecutar sincronización (Paso 6)
5. **Quinto:** Verificar en dashboard (Paso 7)

## Notas

- La función RPC `exec_sql` es necesaria para que la Edge Function pueda ejecutar SQL
- La Service Role Key es necesaria para autenticarse con la Edge Function
- El script guardará el SQL en archivo como backup incluso si la ejecución automática falla




