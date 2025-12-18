# Guía Rápida de Configuración - Sincronizador Automático

## 🎯 Objetivo
Configurar el sincronizador para que ejecute automáticamente el SQL con las fechas de épicas en Supabase.

## 📋 Checklist de Pasos

### ✅ Paso 1: Ejecutar SQLs en Supabase (CRÍTICO)

Abre Supabase SQL Editor: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new

#### 1.1 Agregar columnas de fechas
Copia y pega este SQL:

```sql
-- Agregar campos start_date y end_date a initiatives
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

-- Comentarios
COMMENT ON COLUMN initiatives.start_date IS 'Fecha de inicio de la épica desde el timeline de Jira';
COMMENT ON COLUMN initiatives.end_date IS 'Fecha de fin de la épica desde el timeline de Jira';
```

**Archivo:** `docs/supabase/ADD_EPIC_DATES.sql`

#### 1.2 Crear función RPC para ejecutar SQL
Copia y pega este SQL:

```sql
-- Función RPC para ejecutar SQL dinámicamente
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

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Ejecuta SQL dinámico. Usar con precaución. Requiere permisos de service_role.';
```

**Archivo:** `docs/supabase/CREATE_EXEC_SQL_FUNCTION.sql`

### ✅ Paso 2: Obtener Service Role Key

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/settings/api
2. Busca la sección "Project API keys"
3. Copia la **"service_role"** key (⚠️ NO la anon key, es la que dice "service_role" y está oculta por defecto)
4. Guárdala en un lugar seguro

### ✅ Paso 3: Configurar Service Role Key en el Script

En el directorio `GooglescriptsDelivery`, crea o actualiza el archivo `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Ubicación:** `d:\Agile Dream Team\Cursor\GooglescriptsDelivery\.env`

### ✅ Paso 4: Hacer Login en Supabase CLI

Abre PowerShell y ejecuta:

```powershell
supabase login
```

Esto abrirá tu navegador. Autentícate y vuelve a la terminal.

### ✅ Paso 5: Desplegar Edge Function

Después del login, ejecuta:

```powershell
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
supabase link --project-ref sywkskwkexwwdzrbwinp
supabase functions deploy execute-sync-sql
```

### ✅ Paso 6: Ejecutar Sincronización

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

### ✅ Paso 7: Verificar

1. Recarga el Delivery Roadmap en el dashboard
2. Las épicas deberían mostrar sus barras de timeline con fechas correctas
3. Revisa la consola del navegador (F12) para ver logs de fechas

## 🚨 Si Algo Falla

### El SQL no se ejecuta automáticamente
- El SQL se guarda en `insert_all_squads.sql` como backup
- Puedes ejecutarlo manualmente en Supabase SQL Editor

### Error: "function exec_sql does not exist"
- Ejecuta el SQL del Paso 1.2

### Error: "Edge Function not available"
- Verifica que hiciste login: `supabase login`
- Verifica que desplegaste: `supabase functions deploy execute-sync-sql`

### Error: "Service role key no configurada"
- Verifica que el archivo `.env` existe en `GooglescriptsDelivery`
- Verifica que la key es la correcta (service_role, no anon)

## 📝 Notas Importantes

- ⚠️ La Service Role Key es muy poderosa, no la compartas
- ✅ El script siempre guarda el SQL como backup
- ✅ Si la ejecución automática falla, puedes ejecutar el SQL manualmente
- ✅ Una vez configurado, el sincronizador funcionará automáticamente




