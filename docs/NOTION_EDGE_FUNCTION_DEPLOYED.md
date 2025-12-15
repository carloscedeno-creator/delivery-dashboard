# ✅ Notion Edge Function Desplegada

## 🎉 Estado

La Edge Function `notion-proxy` ha sido **desplegada exitosamente** en Supabase.

**Proyecto:** Delivery Metrics  
**Project ID:** `sywkskwkexwwdzrbwinp`  
**URL de la función:** `https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy`

## ⚠️ IMPORTANTE: Configurar Secrets

La función está desplegada pero **necesita los secrets configurados** para funcionar:

### Secrets Requeridos:

1. **`NOTION_API_TOKEN`**
   - Tu Internal Integration Token de Notion
   - Obtener en: https://www.notion.so/my-integrations

2. **`NOTION_DATABASE_ID`**
   - ID de tu base de datos de Notion
   - Se encuentra en la URL de la base de datos

### Cómo Configurar Secrets:

**Opción 1: Desde Supabase Dashboard (Recomendado)**

1. Ir a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions
2. Ir a la sección **"Secrets"**
3. Click en **"Add new secret"**
4. Agregar:
   - **Name:** `NOTION_API_TOKEN`
   - **Value:** Tu token de Notion
   - Click **"Add secret"**
5. Repetir para:
   - **Name:** `NOTION_DATABASE_ID`
   - **Value:** Tu Database ID

**Opción 2: Desde CLI (si tienes Supabase CLI instalado)**

```bash
supabase secrets set NOTION_API_TOKEN=tu-token-aqui --project-ref sywkskwkexwwdzrbwinp
supabase secrets set NOTION_DATABASE_ID=tu-database-id-aqui --project-ref sywkskwkexwwdzrbwinp
```

## 🧪 Probar la Función

Una vez configurados los secrets, puedes probar:

```bash
# Probar getDatabasePages
curl "https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy?action=getDatabasePages" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{}"
```

O desde el navegador (consola):
```javascript
fetch('https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy?action=getDatabasePages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(console.log)
```

## 📝 Próximos Pasos

1. ✅ **Función desplegada** (COMPLETADO)
2. ⏳ **Configurar secrets** (PENDIENTE - hacerlo ahora)
3. ⏳ **Probar la función** (después de configurar secrets)
4. ⏳ **Ejecutar análisis de Notion** (`node scripts/analyze-notion-for-initiatives.js`)

## 🔍 Obtener Credenciales de Notion

Si no tienes las credenciales:

1. **Crear integración:**
   - Ir a: https://www.notion.so/my-integrations
   - Click "New integration"
   - Nombre: "Delivery Dashboard"
   - Tipo: Internal
   - Click "Submit"
   - **Copiar el token** (esto es `NOTION_API_TOKEN`)

2. **Obtener Database ID:**
   - Abrir tu base de datos en Notion
   - La URL será: `https://www.notion.so/workspace/[DATABASE_ID]?v=...`
   - El `DATABASE_ID` es la parte larga (32 caracteres hexadecimales)

3. **Compartir base de datos:**
   - En tu base de datos de Notion
   - Click "..." > "Connections"
   - Buscar "Delivery Dashboard"
   - Agregarla

## ✅ Checklist

- [x] Edge Function creada y desplegada
- [ ] Secrets configurados en Supabase Dashboard
- [ ] Integración de Notion creada
- [ ] Base de datos compartida con la integración
- [ ] Función probada y funcionando
- [ ] Análisis de Notion ejecutado
