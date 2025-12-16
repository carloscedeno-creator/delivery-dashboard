# 🔧 Fix: Actualizar Cloudflare Worker para Notion

## ❌ Problema Actual

El error `Missing url parameter` indica que el Cloudflare Worker desplegado no tiene la versión actualizada que maneja la ruta `/notion`.

**Error observado:**
```
[NOTION] Error searching for "AI Acknowledgement": Notion API error: Bad Request - Missing url parameter
```

## ✅ Solución: Actualizar el Worker

### Opción 1: Actualizar vía Cloudflare Dashboard (Recomendado)

1. **Abre Cloudflare Dashboard**
   - Ve a: https://dash.cloudflare.com/
   - Selecciona tu cuenta
   - Ve a **Workers & Pages** → **sheets-proxy** (o el nombre de tu worker)

2. **Edita el Worker**
   - Haz clic en **Edit code**
   - Copia TODO el contenido de `cloudflare-worker-jira-notion.js` del proyecto
   - Pega y reemplaza el código actual
   - Haz clic en **Save and deploy**

3. **Configura Variables de Entorno**
   - Ve a **Settings** → **Variables**
   - Asegúrate de tener configurado:
     - `NOTION_API_TOKEN_ENV` - Tu token de Notion
     - `NOTION_DATABASE_ID_ENV` - (Opcional) ID de base de datos
   - Guarda los cambios

### Opción 2: Actualizar vía Wrangler CLI

Si tienes Wrangler CLI instalado:

```bash
# Instalar Wrangler si no lo tienes
npm install -g wrangler

# Login en Cloudflare
wrangler login

# Desplegar el worker
wrangler deploy cloudflare-worker-jira-notion.js --name sheets-proxy
```

**Configurar secrets:**
```bash
wrangler secret put NOTION_API_TOKEN_ENV
# Pega tu token cuando se solicite

# Opcional: Database ID
wrangler secret put NOTION_DATABASE_ID_ENV
```

### Opción 3: Verificar Código del Worker

El worker debe tener estas secciones:

1. **Manejo de rutas** (líneas 64-72):
```javascript
// Endpoint para Jira
if (path === '/jira') {
    return handleJiraRequest(request, url)
}

// Endpoint para Notion
if (path === '/notion') {
    return handleNotionRequest(request, url)
}
```

2. **Función handleNotionRequest** (líneas 175-404):
   - Debe manejar `action=searchPages`
   - Debe tener búsqueda global si no hay `NOTION_DATABASE_ID`

## 🧪 Verificar que Funciona

Después de actualizar, prueba:

```bash
curl "https://sheets-proxy.carlos-cedeno.workers.dev/notion?action=searchPages&initiativeName=Test"
```

**Respuesta esperada:**
- Si funciona: JSON con `{ results: [...] }` o `{ results: [] }`
- Si no funciona: `Missing url parameter` o `NOTION_API_TOKEN not configured`

## 🔑 Variables de Entorno Necesarias

En Cloudflare Worker → Settings → Variables:

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `NOTION_API_TOKEN_ENV` | Token de integración de Notion | ✅ Sí |
| `NOTION_DATABASE_ID_ENV` | ID de base de datos (opcional) | ❌ No |

**Obtener NOTION_API_TOKEN:**
1. Ve a https://www.notion.so/my-integrations
2. Crea o selecciona una integración
3. Copia el **Internal Integration Token**
4. Configúralo en Cloudflare Worker como `NOTION_API_TOKEN_ENV`

## 📝 Notas Importantes

- El worker debe tener acceso a las páginas de Notion
- Comparte las páginas/bases de datos con la integración de Notion
- El worker busca en todas las bases de datos si no se especifica `NOTION_DATABASE_ID`

## 🚀 Después de Actualizar

Una vez actualizado el worker:

1. **Probar sincronización:**
   ```bash
   npm run sync:notion
   ```

2. **Verificar que funciona:**
   - Debe encontrar páginas en Notion
   - Debe sincronizar con Supabase
   - No debe mostrar "Missing url parameter"

## 🐛 Troubleshooting

### Error: "NOTION_API_TOKEN not configured"
- Verifica que `NOTION_API_TOKEN_ENV` esté configurado en Cloudflare
- Asegúrate de que el nombre de la variable sea exactamente `NOTION_API_TOKEN_ENV`

### Error: "Missing url parameter" (después de actualizar)
- Verifica que el código del worker se haya desplegado correctamente
- Espera unos minutos para que el cambio se propague
- Limpia la caché del navegador si estás probando desde el browser

### Error: "No Notion pages found"
- Verifica que las páginas estén compartidas con la integración
- Verifica que los nombres de las iniciativas coincidan exactamente
- Prueba con un nombre de iniciativa que sepas que existe

---

**Una vez actualizado el worker, la sincronización debería funcionar correctamente.**
