# 🚀 Quick Start: Sincronización Notion → Supabase

## ✅ Paso 1: Tabla Creada

La tabla `notion_extracted_metrics` ya está creada en Supabase con:
- ✅ Estructura completa
- ✅ Índices optimizados
- ✅ RLS configurado
- ✅ Triggers funcionando

## 🔧 Paso 2: Verificar Configuración

Asegúrate de tener en tu archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

**Verificar:**
```bash
# En PowerShell
$env:VITE_SUPABASE_URL
$env:VITE_SUPABASE_ANON_KEY
```

## 🧪 Paso 3: Probar Sincronización Manual

Ejecuta una sincronización de prueba:

```bash
npm run sync:notion
```

**Qué esperar:**
1. ✅ Obtiene iniciativas del CSV de productos
2. ✅ Busca cada iniciativa en Notion (vía Cloudflare Worker)
3. ✅ Extrae métricas de propiedades
4. ✅ Sincroniza con Supabase
5. ✅ Muestra resumen con estadísticas

**Salida esperada:**
```
🚀 Starting Notion data synchronization
============================================================

📊 Fetching initiatives from Product CSV...
✅ Found X unique initiatives

📋 Syncing X initiatives...

[1/X]
📊 Processing: Nombre de Iniciativa
------------------------------------------------------------
   ✅ Found 1 page(s)
   📈 Metrics from "Título de Página":
      - Status: in_progress
      - Completion: 50%
      - Story Points: 5/10
   ✅ Synced to Supabase

============================================================
📊 Synchronization Summary
============================================================
✅ Successful: X/X
❌ Failed: 0/X
⏱️  Duration: X.Xs
📈 Success rate: 100%
```

## 🔍 Paso 4: Verificar Datos en Supabase

1. Abre Supabase Dashboard
2. Ve a **Table Editor** → `notion_extracted_metrics`
3. Deberías ver los registros sincronizados con:
   - `initiative_name`: Nombre de la iniciativa
   - `extraction_date`: Fecha de hoy
   - `status`: Estado extraído
   - `completion_percentage`: Porcentaje
   - `story_points_done` / `story_points_total`: Story points
   - `raw_metrics`: JSON con todas las propiedades

**Query de verificación:**
```sql
SELECT 
  initiative_name,
  extraction_date,
  status,
  completion_percentage,
  story_points_done,
  story_points_total
FROM notion_extracted_metrics
ORDER BY extraction_date DESC, initiative_name;
```

## ⚡ Paso 5: Iniciar Servicio Automático

Si la sincronización manual funciona correctamente:

```bash
npm run sync:notion:service
```

**El servicio:**
- ⏰ Ejecuta sincronización inicial en 5 segundos
- 🔄 Programa sincronizaciones cada 30 minutos
- 📊 Muestra estado cada hora
- 🛑 Se detiene con Ctrl+C

**Salida esperada:**
```
🚀 Notion Sync Service Starting...
📅 Schedule: Every 30 minutes (*/30 * * * *)
⏰ Initial sync will run in 5 seconds...

✅ Service started. Press Ctrl+C to stop.

============================================================
🔄 Starting automatic sync #1
============================================================
[... sincronización ...]
✅ Sync completed successfully
⏱️  Duration: X.Xs
🕐 Completed at: 2024-XX-XX...
```

## ⚠️ IMPORTANTE: Configurar Supabase Edge Function

**Antes de continuar**, asegúrate de que:
1. La Edge Function `notion-proxy` esté desplegada en Supabase
2. El secret `NOTION_API_TOKEN` esté configurado en Supabase
3. Las páginas de Notion estén compartidas con la integración

Si ves errores, sigue las instrucciones en [FIX_NOTION_SUPABASE_EDGE_FUNCTION.md](./FIX_NOTION_SUPABASE_EDGE_FUNCTION.md)

## 🐛 Troubleshooting Rápido

### Error: Missing url parameter o Function not found
**Causa:** La Supabase Edge Function no está configurada correctamente.

**Solución:** 
1. Ve a [FIX_NOTION_SUPABASE_EDGE_FUNCTION.md](./FIX_NOTION_SUPABASE_EDGE_FUNCTION.md)
2. Verifica que la Edge Function `notion-proxy` esté desplegada
3. Configura `NOTION_API_TOKEN` en Supabase Secrets
4. Prueba nuevamente con: `node scripts/diagnose-notion-connection.js`

### Error: Missing Supabase configuration
```bash
# Verificar variables
echo $env:VITE_SUPABASE_URL
echo $env:VITE_SUPABASE_ANON_KEY

# Si faltan, agregar al .env o exportar:
$env:VITE_SUPABASE_URL="https://..."
$env:VITE_SUPABASE_ANON_KEY="..."
```

### Error: Table does not exist
- Verifica que ejecutaste el script SQL completo
- Revisa en Supabase Dashboard → Table Editor

### Error: No Notion pages found
**Posibles causas:**
- Nombre de iniciativa no coincide exactamente
- Página no compartida con integración de Notion
- Proxy de Notion no configurado

**Solución:**
1. Verifica nombres en CSV vs Notion (deben coincidir)
2. Asegúrate que las páginas estén compartidas con la integración
3. Prueba el proxy: 
   ```bash
   curl "https://sheets-proxy.carlos-cedeno.workers.dev/notion?action=searchPages&initiativeName=Test"
   ```

### Sincronización muy lenta
- Normal si hay muchas iniciativas
- El script incluye pausas de 1 segundo entre iniciativas
- Considera ejecutar en horarios de menor carga

## 📊 Monitoreo

### Ver últimas sincronizaciones:
```sql
SELECT 
  initiative_name,
  extraction_date,
  status,
  completion_percentage,
  created_at
FROM notion_extracted_metrics
ORDER BY created_at DESC
LIMIT 20;
```

### Verificar éxito de sincronización:
```sql
SELECT 
  extraction_date,
  COUNT(*) as total_initiatives,
  COUNT(DISTINCT initiative_name) as unique_initiatives,
  AVG(completion_percentage) as avg_completion
FROM notion_extracted_metrics
WHERE extraction_date = CURRENT_DATE
GROUP BY extraction_date;
```

## 🎯 Próximos Pasos

1. ✅ Tabla creada
2. ✅ Variables de entorno configuradas
3. ⏳ **Probar sincronización manual** ← Estás aquí
4. ⏳ **Verificar datos en Supabase**
5. ⏳ **Iniciar servicio automático**
6. ⏳ **Configurar despliegue** (opcional: GitHub Actions, Railway, etc.)

## 📚 Documentación Completa

- [Guía Completa](./NOTION_AUTO_SYNC.md)
- [Estado del Sistema](./NOTION_SYNC_READY.md)
- [Pendientes](./NOTION_SUPABASE_PENDIENTE.md)

---

**¿Listo para probar?** Ejecuta: `npm run sync:notion`
