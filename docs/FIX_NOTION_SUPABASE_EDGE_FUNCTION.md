# 🔧 Fix: Configurar Supabase Edge Function para Notion

## ✅ Solución: Usar Supabase Edge Function

El script ahora está configurado para usar la **Supabase Edge Function** (`notion-proxy`) en lugar de Cloudflare Worker.

## 🔧 Configuración Necesaria

### 1. Verificar que la Edge Function Existe

La Edge Function debe estar desplegada en Supabase:
- Nombre: `notion-proxy`
- Ruta: `{VITE_SUPABASE_URL}/functions/v1/notion-proxy`

### 2. Configurar Secret en Supabase

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Configura el Secret**
   - Ve a **Settings** → **Edge Functions** → **Secrets**
   - Agrega: `NOTION_API_TOKEN` = tu token de Notion
   - Guarda

**Obtener NOTION_API_TOKEN:**
1. Ve a https://www.notion.so/my-integrations
2. Crea o selecciona una integración
3. Copia el **Internal Integration Token**
4. Configúralo en Supabase como `NOTION_API_TOKEN`

### 3. Verificar Variables de Entorno

Asegúrate de tener en tu `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

El script automáticamente usará:
```
${VITE_SUPABASE_URL}/functions/v1/notion-proxy
```

## 🧪 Verificar que Funciona

### Opción 1: Usar Script de Diagnóstico

```bash
node scripts/diagnose-notion-connection.js
```

Este script verifica:
- ✅ Que la Edge Function responde
- ✅ Que el token está configurado
- ✅ Que puede acceder a Notion

### Opción 2: Probar Sincronización

```bash
npm run sync:notion
```

**Si funciona correctamente:**
- Debe encontrar páginas en Notion
- Debe sincronizar con Supabase
- No debe mostrar errores de "Missing url parameter"

## 📝 Notas Importantes

- La Edge Function debe estar desplegada en Supabase
- El secret `NOTION_API_TOKEN` debe estar configurado
- Las páginas de Notion deben estar compartidas con la integración
- El script ahora usa POST con JSON en lugar de GET con query params

## 🐛 Troubleshooting

### Error: "NOTION_API_TOKEN not configured"
**Solución:**
1. Ve a Supabase Dashboard → Settings → Edge Functions → Secrets
2. Agrega `NOTION_API_TOKEN` con tu token de Notion
3. Guarda y espera unos segundos para que se propague

### Error: "Function not found" o 404
**Solución:**
- Verifica que la Edge Function `notion-proxy` esté desplegada
- Verifica que la URL sea: `{SUPABASE_URL}/functions/v1/notion-proxy`
- Revisa en Supabase Dashboard → Edge Functions

### Error: "Unauthorized" o 401
**Solución:**
- Verifica que `VITE_SUPABASE_ANON_KEY` esté correcto
- Verifica que el token de Notion sea válido
- Verifica que la integración tenga acceso a las páginas

### Error: "No Notion pages found"
**Solución:**
- Verifica que las páginas estén compartidas con la integración
- Verifica que los nombres de iniciativas coincidan exactamente
- Prueba con un nombre que sepas que existe

## 🚀 Después de Configurar

Una vez configurado:

1. **Probar sincronización:**
   ```bash
   npm run sync:notion
   ```

2. **Verificar datos:**
   - Abre Supabase Dashboard → Table Editor
   - Revisa la tabla `notion_extracted_metrics`
   - Deberías ver los registros sincronizados

---

**El script ahora usa Supabase Edge Function correctamente.**
