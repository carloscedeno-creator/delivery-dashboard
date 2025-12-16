# Sincronización Automática Notion → Supabase

Este documento describe el sistema de sincronización automática que replica el patrón de sincronización de Jira, actualizando datos de Notion a Supabase cada 30 minutos.

## 📋 Descripción

El sistema sincroniza automáticamente las métricas de iniciativas desde Notion hacia Supabase, extrayendo:
- **Status**: Estado de la iniciativa (planned, in_progress, done, blocked)
- **Completion**: Porcentaje de completación
- **Story Points**: Total y completados
- **Propiedades adicionales**: Todas las propiedades disponibles para análisis

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Product CSV    │  ← Obtiene lista de iniciativas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sync Script     │  ← Procesa cada iniciativa
└────────┬────────┘
         │
         ├──► Notion API (via Proxy) ──► Busca páginas
         │
         └──► Supabase ──► Almacena métricas
              │
              └──► notion_extracted_metrics table
```

## 🚀 Uso

### Sincronización Manual (Una vez)

Ejecuta una sincronización única:

```bash
npm run sync:notion
```

### Servicio Automático (Cada 30 minutos)

Inicia el servicio que se ejecuta automáticamente:

```bash
npm run sync:notion:service
```

El servicio:
- Ejecuta una sincronización inicial después de 5 segundos
- Programa sincronizaciones automáticas cada 30 minutos
- Muestra estado cada hora
- Maneja cierre graceful con Ctrl+C

## ⚙️ Configuración

### Variables de Entorno

Asegúrate de tener en tu `.env`:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Notion (opcional - se usa el proxy)
VITE_NOTION_PROXY_URL=https://sheets-proxy.carlos-cedeno.workers.dev/notion
VITE_PROXY_URL=https://sheets-proxy.carlos-cedeno.workers.dev
```

### Tabla de Supabase

El script espera una tabla `notion_extracted_metrics` con la siguiente estructura:

```sql
CREATE TABLE notion_extracted_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name TEXT NOT NULL,
  extraction_date DATE NOT NULL,
  status TEXT,
  completion_percentage INTEGER,
  story_points_done INTEGER,
  story_points_total INTEGER,
  raw_metrics JSONB,
  source TEXT DEFAULT 'notion_sync',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(initiative_name, extraction_date)
);
```

## 📊 Procesamiento de Datos

### Extracción de Métricas

El sistema extrae métricas de las propiedades de Notion, manejando múltiples variaciones de nombres:

**Status:**
- `Status`, `status`, `Estado`, `estado`
- Mapea a: `planned`, `in_progress`, `done`, `blocked`

**Story Points:**
- `Story Points`, `Story point estimate`, `storyPoints`, `Points`
- Calcula completados basado en status o propiedad específica

**Completion:**
- `Completion`, `Completion %`, `completion`, `Progress`, `Progress %`
- Calcula basado en status si no hay propiedad específica

### Tipos de Propiedades Soportadas

El extractor maneja:
- `title` - Títulos
- `rich_text` - Texto enriquecido
- `number` - Números
- `select` - Selección
- `status` - Estado
- `checkbox` - Checkbox
- `date` - Fechas
- `formula` - Fórmulas

## 🔄 Flujo de Sincronización

1. **Obtener Iniciativas**: Lee el CSV de productos para obtener lista de iniciativas
2. **Buscar en Notion**: Para cada iniciativa, busca páginas en Notion (búsqueda global)
3. **Extraer Métricas**: Procesa propiedades de cada página encontrada
4. **Sincronizar**: Inserta/actualiza métricas en Supabase
5. **Resumen**: Muestra estadísticas de la sincronización

## 📝 Logs

El servicio muestra:
- Inicio de cada sincronización
- Progreso por iniciativa
- Métricas extraídas
- Errores encontrados
- Resumen final con estadísticas
- Estado del servicio cada hora

## 🛠️ Troubleshooting

### Error: Missing Supabase configuration

**Solución**: Asegúrate de tener `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en tu `.env`

### Error: No Notion pages found

**Posibles causas**:
- El nombre de la iniciativa no coincide exactamente
- La página no está compartida con la integración de Notion
- El proxy de Notion no está configurado correctamente

**Solución**: Verifica que:
- Los nombres en el CSV coincidan con los títulos en Notion
- La integración de Notion tenga acceso a las páginas
- El proxy esté funcionando: `curl "https://sheets-proxy.carlos-cedeno.workers.dev/notion?action=searchPages&initiativeName=Test"`

### Error: Table does not exist

**Solución**: Crea la tabla `notion_extracted_metrics` en Supabase con la estructura indicada arriba

### Sincronización muy lenta

**Causa**: Muchas iniciativas o APIs lentas

**Solución**: 
- El script incluye pausas de 1 segundo entre iniciativas
- Considera ejecutar en horarios de menor carga
- Verifica la velocidad del proxy de Notion

## 🚢 Despliegue

### Opción 1: Servidor Local/VM

Ejecuta el servicio como proceso de fondo:

```bash
# Con PM2
pm2 start npm --name "notion-sync" -- run sync:notion:service

# Con nohup
nohup npm run sync:notion:service > notion-sync.log 2>&1 &
```

### Opción 2: GitHub Actions

Crea `.github/workflows/notion-sync.yml`:

```yaml
name: Notion Sync

on:
  schedule:
    - cron: '*/30 * * * *' # Cada 30 minutos
  workflow_dispatch: # Permite ejecución manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run sync:notion
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

### Opción 3: Railway/Render

1. Conecta tu repositorio
2. Configura variables de entorno
3. Usa el comando: `npm run sync:notion:service`
4. El servicio se ejecutará continuamente

### Opción 4: Vercel Cron Jobs

Usa Vercel Cron para ejecutar el script periódicamente:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/notion-sync",
    "schedule": "*/30 * * * *"
  }]
}
```

## 📈 Monitoreo

El servicio muestra:
- Total de sincronizaciones ejecutadas
- Última sincronización
- Estado actual (running/stopped)
- Estadísticas de éxito/fallo

## 🔐 Seguridad

- Las credenciales de Notion se manejan en el Cloudflare Worker (proxy)
- Solo se usa la anon key de Supabase (no service_role)
- Los datos se almacenan de forma segura en Supabase
- No se exponen tokens en el frontend

## 📚 Referencias

- [Notion API Documentation](https://developers.notion.com/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [node-cron Documentation](https://www.npmjs.com/package/node-cron)
