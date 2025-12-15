# 🚀 Guía de Despliegue: Notion Edge Function

## 📋 Prerequisitos

1. **Supabase CLI instalado:**
   ```bash
   npm install -g supabase
   ```

2. **Autenticado en Supabase:**
   ```bash
   supabase login
   ```

3. **Linkeado a tu proyecto:**
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   (El project-ref se encuentra en la URL de tu proyecto: `https://supabase.com/dashboard/project/[project-ref]`)

## 🔧 Pasos de Despliegue

### 1. Verificar Estructura

Asegúrate de que existe la carpeta:
```
supabase/functions/notion-proxy/index.ts
```

### 2. Configurar Secrets en Supabase

**Opción A: Desde Dashboard (Recomendado)**

1. Ir a: https://supabase.com/dashboard/project/[tu-project-ref]/settings/functions
2. Ir a la sección "Secrets"
3. Agregar los siguientes secrets:
   - `NOTION_API_TOKEN` = Tu token de API de Notion
   - `NOTION_DATABASE_ID` = ID de tu base de datos de Notion

**Opción B: Desde CLI**

```bash
supabase secrets set NOTION_API_TOKEN=tu-token-aqui
supabase secrets set NOTION_DATABASE_ID=tu-database-id-aqui
```

### 3. Obtener Credenciales de Notion

Si no las tienes:

1. **Crear integración en Notion:**
   - Ir a: https://www.notion.so/my-integrations
   - Click en "New integration"
   - Nombre: "Delivery Dashboard"
   - Tipo: Internal
   - Click "Submit"
   - **Copiar el "Internal Integration Token"** (esto es `NOTION_API_TOKEN`)

2. **Obtener Database ID:**
   - Abrir tu base de datos en Notion
   - La URL será algo como: `https://www.notion.so/workspace/[DATABASE_ID]?v=...`
   - El `DATABASE_ID` es la parte larga antes del `?v=`
   - También puedes copiar el link y extraer el ID (32 caracteres hexadecimales)

3. **Compartir base de datos con la integración:**
   - En tu base de datos de Notion
   - Click en "..." (tres puntos) > "Connections"
   - Buscar tu integración "Delivery Dashboard"
   - Agregarla

### 4. Desplegar la Función

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
supabase functions deploy notion-proxy
```

### 5. Verificar Despliegue

La función estará disponible en:
```
https://[tu-project-ref].supabase.co/functions/v1/notion-proxy
```

Puedes probarla con:
```bash
curl "https://[tu-project-ref].supabase.co/functions/v1/notion-proxy?action=getDatabasePages" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{}"
```

### 6. Actualizar Configuración del Proyecto

Actualizar `src/config/notionConfig.js`:

```javascript
proxyUrl: process.env.VITE_SUPABASE_URL + '/functions/v1/notion-proxy'
```

O directamente en el código:
```javascript
proxyUrl: 'https://[tu-project-ref].supabase.co/functions/v1/notion-proxy'
```

## 🧪 Probar la Función

### Desde el navegador (consola):

```javascript
// Probar getDatabasePages
fetch('https://[tu-project-ref].supabase.co/functions/v1/notion-proxy?action=getDatabasePages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(console.log)

// Probar searchPages
fetch('https://[tu-project-ref].supabase.co/functions/v1/notion-proxy?action=searchPages&initiativeName=Strata', {
  method: 'GET'
})
.then(r => r.json())
.then(console.log)
```

### Desde Node.js:

```bash
node scripts/test-notion-worker.js
```

(Actualizar la URL en el script primero)

## ⚠️ Troubleshooting

### Error: "Notion credentials not configured"
- Verificar que los secrets estén configurados en Supabase
- Verificar que los nombres sean exactos: `NOTION_API_TOKEN` y `NOTION_DATABASE_ID`

### Error: "Notion API error: 401"
- Verificar que el token de Notion sea correcto
- Verificar que la integración tenga acceso a la base de datos

### Error: "Notion API error: 404"
- Verificar que el Database ID sea correcto
- Verificar que la base de datos esté compartida con la integración

### Error: "Invalid action"
- Verificar que el parámetro `action` sea uno de: `getDatabasePages`, `searchPages`, `getPageBlocks`

## 📝 Notas Importantes

1. **Propiedad "Initiative"**: El código busca en una propiedad llamada `'Initiative'`. Si tu base de datos usa otro nombre, actualiza la línea 70 en `index.ts`:
   ```typescript
   property: 'Initiative', // Cambiar por el nombre real de tu propiedad
   ```

2. **CORS**: La función ya tiene CORS configurado para permitir peticiones desde cualquier origen. Si necesitas restringirlo, actualiza los headers.

3. **Cache**: Las respuestas tienen cache de 5 minutos. Puedes ajustarlo en el header `Cache-Control`.

## ✅ Checklist de Despliegue

- [ ] Supabase CLI instalado y autenticado
- [ ] Proyecto linkeado con `supabase link`
- [ ] Secrets configurados en Supabase Dashboard
- [ ] Integración de Notion creada y token obtenido
- [ ] Base de datos compartida con la integración
- [ ] Database ID obtenido
- [ ] Función desplegada con `supabase functions deploy`
- [ ] Función probada y funcionando
- [ ] Configuración actualizada en `notionConfig.js`
- [ ] Scripts de prueba ejecutados exitosamente
