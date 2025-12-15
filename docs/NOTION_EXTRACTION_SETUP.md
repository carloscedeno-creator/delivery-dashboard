# 📊 Setup de Extracción de Datos de Notion

## 🎯 Objetivo

Configurar y ejecutar la extracción de datos de Notion para iniciativas, sin usar IA, solo extracción estructurada.

## 📋 Prerequisitos

1. **Notion Integration configurada**
   - Token de API de Notion
   - Database ID de Notion
   - Base de datos compartida con la integración

2. **Supabase configurado**
   - Tablas creadas (ejecutar `01_create_notion_extraction_tables.sql`)
   - Service Role Key disponible

3. **Cloudflare Worker actualizado**
   - Worker con soporte para `getPageBlocks`

## 🚀 Pasos de Setup

### 1. Crear Tablas en Supabase

```bash
# Ejecutar en Supabase SQL Editor
# Archivo: docs/supabase/01_create_notion_extraction_tables.sql
```

O copiar y pegar el contenido del archivo SQL en el editor de Supabase.

### 2. Actualizar Cloudflare Worker

El worker necesita soportar la acción `getPageBlocks`. 

**Actualizar `cloudflare-worker-jira-notion.js`** con el código que incluye:
- Soporte para `action=getPageBlocks`
- Paginación de bloques
- Manejo de bloques anidados

**Variables de entorno del Worker:**
- `NOTION_API_TOKEN_ENV` - Token de Notion
- `NOTION_DATABASE_ID_ENV` - ID de la base de datos

### 3. Configurar Variables de Entorno

```env
# .env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key)
VITE_NOTION_PROXY_URL=https://sheets-proxy.carlos-cedeno.workers.dev/notion
```

### 4. Probar Extracción

```bash
# Probar con una iniciativa
node scripts/sync-notion-data.js "Strata Public API"
```

## 📊 Uso del Script de Sincronización

### Sincronizar una iniciativa

```bash
node scripts/sync-notion-data.js "Strata Public API"
```

### Sincronizar múltiples iniciativas

```bash
node scripts/sync-notion-data.js "Strata Public API" "DataLake" "Kibana Observability"
```

### Sincronizar desde lista de iniciativas

Puedes modificar el script para leer desde un archivo CSV o desde Google Sheets.

## 🔍 Qué se Extrae

### Contenido Completo
- Todo el texto de la página
- Estructura (headings, listas, tablas)
- Propiedades de Notion

### Métricas Extraídas (usando patrones)
- **Completación**: Porcentaje encontrado en texto
- **Tareas**: De checkboxes/listas
- **Story Points**: De texto o tareas
- **Estado**: Detectado de texto o propiedades
- **Bloqueos**: De secciones de bloqueos
- **Dependencias**: Referencias a otras iniciativas
- **Fechas**: Inicio, entrega, hitos

## 📝 Estructura de Datos en Supabase

### `notion_content_extraction`
- Contenido completo extraído
- Datos estructurados (headings, lists, todos)
- Propiedades de Notion
- URLs y metadata

### `notion_extracted_metrics`
- Métricas procesadas por fecha
- Estado, completación, tareas, story points
- Bloqueos y dependencias
- Historial temporal

## 🔄 Flujo de Sincronización

1. **Buscar página en Notion** por nombre de iniciativa
2. **Extraer bloques** de la página (con paginación)
3. **Extraer texto** de todos los bloques
4. **Procesar contenido** para extraer métricas
5. **Guardar en Supabase** (contenido + métricas)

## 💡 Integración en Dashboard

Los datos extraídos se pueden usar en:
- **Strata Mapping View**: Mostrar métricas de Notion
- **Comparación**: Comparar con datos de CSV
- **Historial**: Ver evolución de métricas
- **Análisis**: Usar contenido para análisis futuro

## 🧪 Testing

```javascript
// Probar extracción manual
import { extractInitiativeData } from './src/services/notionContentExtractor.js';
import { processExtractedData } from './src/services/notionDataProcessor.js';

const data = await extractInitiativeData("Strata Public API");
const processed = processExtractedData(data, ["DataLake", "Kibana"]);
console.log(processed);
```

## 📝 Notas Importantes

- **Rate Limits**: Notion API tiene límites, usar cache cuando sea posible
- **Paginación**: Los bloques se obtienen con paginación automática
- **Bloques anidados**: Se procesan recursivamente
- **Validación**: Siempre validar datos extraídos antes de guardar
- **Fallback**: Si no se encuentra en Notion, usar datos de CSV
