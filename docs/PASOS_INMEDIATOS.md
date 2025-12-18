# 🚀 Pasos Inmediatos para Completar la Configuración

## Paso 1: Ejecutar SQLs en Supabase (HACER PRIMERO)

### 1.1 Agregar columnas de fechas

**Abre:** https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new

**Copia y pega este SQL:**

```sql
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

COMMENT ON COLUMN initiatives.start_date IS 'Fecha de inicio de la épica desde el timeline de Jira';
COMMENT ON COLUMN initiatives.end_date IS 'Fecha de fin de la épica desde el timeline de Jira';
```

**Haz clic en "Run"**

### 1.2 Crear función RPC

**En el mismo SQL Editor, copia y pega:**

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

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Ejecuta SQL dinámico. Usar con precaución. Requiere permisos de service_role.';
```

**Haz clic en "Run"**

## Paso 2: Obtener Service Role Key

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/settings/api
2. Busca "Project API keys"
3. Haz clic en "Reveal" en la fila de **"service_role"** (no la anon)
4. Copia la key completa

## Paso 3: Configurar en .env

Crea o actualiza: `d:\Agile Dream Team\Cursor\GooglescriptsDelivery\.env`

```env
SUPABASE_SERVICE_ROLE_KEY=pega-aqui-tu-service-role-key
```

## Paso 4: Login y Despliegue

Abre PowerShell y ejecuta:

```powershell
# Login (abrirá navegador)
supabase login

# Vincular proyecto
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
supabase link --project-ref sywkskwkexwwdzrbwinp

# Desplegar función
supabase functions deploy execute-sync-sql
```

## Paso 5: Ejecutar Sincronización

```powershell
cd "d:\Agile Dream Team\Cursor\GooglescriptsDelivery"
node scripts/sincronizar-squads-db.js
```

## ✅ Listo!

Después de estos pasos, el sincronizador ejecutará automáticamente el SQL con las fechas de épicas.




