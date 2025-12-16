# 🚀 Desplegar Supabase Edge Function para Notion

## 📋 Prerequisitos

1. Supabase CLI instalado
2. Autenticado en Supabase
3. Proyecto vinculado

## 🔧 Pasos para Desplegar

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

### 2. Login en Supabase

```bash
supabase login
```

### 3. Vincular Proyecto

```bash
supabase link --project-ref tu-project-ref
```

Obtén el `project-ref` de la URL de tu proyecto Supabase:
- URL: `https://xxxxx.supabase.co`
- Project ref: `xxxxx`

### 4. Desplegar Edge Function

```bash
supabase functions deploy notion-proxy
```

### 5. Configurar Secret

```bash
supabase secrets set NOTION_API_TOKEN=tu-token-de-notion
```

**Obtener token de Notion:**
1. Ve a https://www.notion.so/my-integrations
2. Crea o selecciona una integración
3. Copia el **Internal Integration Token**
4. Úsalo en el comando anterior

## 🧪 Verificar Despliegue

### Opción 1: Desde Supabase Dashboard

1. Ve a **Edge Functions** en el dashboard
2. Deberías ver `notion-proxy` listada
3. Haz clic para ver logs y detalles

### Opción 2: Probar con curl

```bash
curl -X POST \
  "https://tu-proyecto.supabase.co/functions/v1/notion-proxy" \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"action":"searchPages","initiativeName":"Test"}'
```

### Opción 3: Usar Script de Diagnóstico

```bash
node scripts/diagnose-notion-connection.js
```

## 📝 Estructura de Archivos

```
supabase/
└── functions/
    └── notion-proxy/
        └── index.ts  ← Código de la Edge Function
```

## 🔑 Acciones Soportadas

La Edge Function soporta las siguientes acciones:

1. **listDatabases** - Lista todas las bases de datos accesibles
2. **getDatabasePages** - Obtiene páginas de una base de datos específica
3. **searchPages** - Busca páginas por nombre de iniciativa (búsqueda global)
4. **getPageBlocks** - Obtiene bloques de contenido de una página

## 📤 Formato de Petición

### POST con Body JSON (Recomendado)

```javascript
fetch('https://tu-proyecto.supabase.co/functions/v1/notion-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer tu-anon-key'
  },
  body: JSON.stringify({
    action: 'searchPages',
    initiativeName: 'Nombre de Iniciativa'
  })
})
```

### GET con Query Params (Alternativo)

```javascript
fetch('https://tu-proyecto.supabase.co/functions/v1/notion-proxy?action=searchPages&initiativeName=Nombre', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer tu-anon-key'
  }
})
```

## 🐛 Troubleshooting

### Error: "Function not found"
- Verifica que la función esté desplegada: `supabase functions list`
- Verifica que el nombre sea exactamente `notion-proxy`

### Error: "NOTION_API_TOKEN not configured"
- Configura el secret: `supabase secrets set NOTION_API_TOKEN=tu-token`
- Verifica en Dashboard → Edge Functions → Secrets

### Error: "Invalid action"
- Verifica que el action sea uno de los soportados
- Verifica que el formato del body sea JSON válido
- Revisa los logs de la Edge Function en Supabase Dashboard

### Error: "Unauthorized"
- Verifica que el `Authorization` header tenga el anon key correcto
- Verifica que el anon key sea válido en Supabase

## 📚 Referencias

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Notion API Docs](https://developers.notion.com/)

---

**Una vez desplegada, la sincronización debería funcionar correctamente.**
