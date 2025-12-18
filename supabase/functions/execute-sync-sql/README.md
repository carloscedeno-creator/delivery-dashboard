# Execute Sync SQL Edge Function

Esta función Edge permite ejecutar el SQL generado por el script de sincronización directamente en Supabase.

## Requisitos Previos

### 1. Crear función RPC en PostgreSQL

Antes de usar esta Edge Function, debes crear la función RPC en PostgreSQL:

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: docs/supabase/CREATE_EXEC_SQL_FUNCTION.sql
```

O ejecuta directamente:

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

## Despliegue

### Opción A: Script Automático (Recomendado)

```powershell
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
.\scripts\deploy-edge-function.ps1
```

### Opción B: Manual

#### 1. Instalar Supabase CLI (si no está instalado)

```powershell
# Instalar Scoop (si no lo tienes)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Agregar bucket de Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Instalar Supabase CLI
scoop install supabase
```

#### 2. Iniciar sesión

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

#### 3. Vincular proyecto

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
supabase link --project-ref sywkskwkexwwdzrbwinp
```

#### 4. Desplegar función

```bash
supabase functions deploy execute-sync-sql
```

## Uso

### Desde el script de sincronización

El script `sincronizar-squads-db.js` llamará automáticamente a esta función si:
- `SUPABASE_SERVICE_ROLE_KEY` está configurada
- La función Edge está desplegada
- La función RPC `exec_sql` existe en PostgreSQL

### Llamada directa (testing)

```bash
curl -X POST https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/execute-sync-sql \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO initiatives ...",
    "batch_size": 50
  }'
```

## Parámetros

- `sql` (requerido): El SQL a ejecutar (puede contener múltiples statements separados por `;`)
- `batch_size` (opcional): Tamaño del lote para ejecutar (default: 50)

## Respuesta

```json
{
  "success": true,
  "results": {
    "total": 100,
    "success": 98,
    "errors": 2,
    "errorDetails": [
      {
        "statement": 5,
        "error": "duplicate key value"
      }
    ]
  }
}
```

## Notas de Seguridad

⚠️ **IMPORTANTE**: Esta función ejecuta SQL arbitrario y debe:
- Solo ser llamada con `SUPABASE_SERVICE_ROLE_KEY`
- Estar protegida por autenticación adecuada
- Usarse solo desde scripts de sincronización confiables

## Troubleshooting

### Error: "function exec_sql does not exist"
- Ejecuta el SQL en `docs/supabase/CREATE_EXEC_SQL_FUNCTION.sql`

### Error: "Edge Function not available"
- Asegúrate de que la función esté desplegada: `supabase functions deploy execute-sync-sql`

### Error: "Authorization required"
- Verifica que estés usando `SUPABASE_SERVICE_ROLE_KEY` (no anon key)




