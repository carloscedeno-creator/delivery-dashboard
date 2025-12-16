# 📋 Resumen: Pendiente para Sincronización Notion → Supabase

## 🔍 Estado Actual

### ✅ Lo que YA está listo:
1. **Edge Function de Supabase** (`notion-proxy`) - Desplegada y funcionando
2. **Script de sincronización** (`scripts/sync-notion-initiatives.js`) - Creado y mejorado
3. **Servicio automático** (`scripts/notion-sync-service.js`) - Creado con node-cron
4. **Búsqueda en múltiples bases de datos** - Implementada en Cloudflare Worker
5. **Extracción de métricas mejorada** - Maneja múltiples variaciones de propiedades
6. **Configuración de Notion** - `NOTION_API_TOKEN` configurado en Cloudflare Worker
7. **Script SQL para tabla** - `docs/supabase/04_create_notion_metrics_table.sql` creado

### ❌ Lo que FALTA:

## 1. 🗄️ Crear Tablas en Supabase

El script intenta usar la tabla `notion_extracted_metrics` que **NO EXISTE** en Supabase.

### Tabla requerida: `notion_extracted_metrics`

**✅ Script SQL creado**: Ver `docs/supabase/04_create_notion_metrics_table.sql`

El script incluye:
- Creación de tabla con todos los campos necesarios
- Índices para optimizar consultas
- Trigger para `updated_at` automático
- Políticas RLS (Row Level Security)
- Comentarios de documentación

**Para ejecutar:**
1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `docs/supabase/04_create_notion_metrics_table.sql`
3. Ejecuta el script
4. Verifica que la tabla se creó correctamente

### Tabla opcional: `notion_content_extraction`

Si quieres guardar el contenido completo de las páginas:

```sql
CREATE TABLE IF NOT EXISTS notion_content_extraction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  notion_page_id VARCHAR(255) NOT NULL UNIQUE,
  page_url TEXT,
  extracted_content TEXT,
  structured_data JSONB,
  properties JSONB,
  extraction_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notion_content_initiative ON notion_content_extraction(initiative_name);
CREATE INDEX IF NOT EXISTS idx_notion_content_page_id ON notion_content_extraction(notion_page_id);

-- Trigger updated_at
CREATE TRIGGER notion_content_updated_at
  BEFORE UPDATE ON notion_content_extraction
  FOR EACH ROW
  EXECUTE FUNCTION update_notion_metrics_updated_at();

-- RLS
ALTER TABLE notion_content_extraction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access on notion_content_extraction"
  ON notion_content_extraction
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read access to authenticated users"
  ON notion_content_extraction
  FOR SELECT
  TO authenticated
  USING (true);
```

## 2. 🔧 Configurar Cloudflare Worker (Opcional)

Si prefieres usar Cloudflare Worker en lugar de Supabase Edge Function:

### Variables de entorno necesarias en Cloudflare Worker:
- `NOTION_API_TOKEN_ENV` - Token de Notion
- `NOTION_DATABASE_ID_ENV` - ID de base de datos (opcional, puede buscar en todas)

### Actualizar Worker para soportar búsqueda en múltiples bases de datos:
El Worker actual solo busca en UNA base de datos. Necesita actualizarse para buscar en todas (como la Edge Function).

## 3. ⚙️ Configurar Variables de Entorno

En tu `.env` local:
```env
VITE_SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key (que es igual al service_role)
```

## 4. 🧪 Probar la Sincronización

Una vez creadas las tablas:

```bash
node scripts/sync-notion-initiatives.js
```

## 📊 Resumen de Pendientes

| Tarea | Estado | Prioridad |
|-------|--------|-----------|
| Crear tabla `notion_extracted_metrics` | ⚠️ Script creado | 🔴 Alta |
| Crear tabla `notion_content_extraction` (opcional) | ❌ Pendiente | 🟡 Media |
| Configurar RLS policies | ⚠️ Incluido en script | 🔴 Alta |
| Probar sincronización | ❌ Pendiente | 🔴 Alta |
| Configurar Cloudflare Worker (si se usa) | ✅ Funcionando | 🟢 Baja |
| Crear servicio automático (cron) | ✅ Listo | 🟢 Baja |

## 🚀 Pasos Inmediatos

1. **Ejecutar script SQL** `docs/supabase/04_create_notion_metrics_table.sql` en Supabase
2. **Probar sincronización manual**: `npm run sync:notion`
3. **Verificar datos** en Supabase
4. **Iniciar servicio automático**: `npm run sync:notion:service` (si funciona la manual)

## 🔗 Comandos Útiles

```bash
# Verificar conexión
node scripts/diagnose-notion-connection.js

# Sincronizar todas las iniciativas (manual)
npm run sync:notion

# Iniciar servicio automático (cada 30 minutos)
npm run sync:notion:service

# Ver tablas en Supabase
# (Usar Supabase Dashboard o MCP)
```
