# 🚀 Desplegar Edge Function desde Dashboard (SIN CLI)

## ✅ Método Más Fácil: Dashboard de Supabase

No necesitas instalar nada, solo copiar y pegar en el Dashboard.

## 📋 Pasos Detallados

### Paso 1: Abrir Supabase Dashboard

1. Ve a: https://supabase.com/dashboard
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Ir a Edge Functions

1. En el menú lateral izquierdo, busca **Edge Functions**
2. Haz clic en **Edge Functions**

### Paso 3: Crear o Editar la Función

**Si la función `notion-proxy` NO existe:**

1. Haz clic en **Create a new function**
2. Nombre: `notion-proxy` (exactamente así, sin espacios)
3. Haz clic en **Create function**
4. Se abrirá el editor de código

**Si la función `notion-proxy` YA existe:**

1. Busca `notion-proxy` en la lista
2. Haz clic en ella
3. Haz clic en **Edit code** o el ícono de editar
4. Se abrirá el editor de código

### Paso 4: Copiar el Código

1. Abre el archivo: `supabase/functions/notion-proxy/index.ts`
2. **Selecciona TODO el contenido** (Ctrl+A)
3. **Copia** (Ctrl+C)

### Paso 5: Pegar en el Editor

1. En el editor del Dashboard, **selecciona TODO** (Ctrl+A)
2. **Pega** el código copiado (Ctrl+V)
3. Reemplaza completamente el contenido existente

### Paso 6: Desplegar

1. Haz clic en **Deploy** o **Save and deploy**
2. Espera a que aparezca el mensaje de éxito
3. Debería decir algo como "Function deployed successfully"

### Paso 7: Configurar Secret (IMPORTANTE)

1. En el Dashboard, ve a **Settings** (Configuración)
2. Busca **Edge Functions** en el menú
3. Haz clic en **Secrets**
4. Haz clic en **Add new secret** o **New secret**
5. **Nombre**: `NOTION_API_TOKEN` (exactamente así, case-sensitive)
6. **Valor**: Pega tu token de Notion
7. Haz clic en **Save** o **Add**

**Obtener token de Notion:**
1. Ve a: https://www.notion.so/my-integrations
2. Si no tienes una integración, haz clic en **+ New integration**
3. Dale un nombre (ej: "Delivery Dashboard")
4. Haz clic en **Submit**
5. Copia el **Internal Integration Token** (empieza con `secret_`)
6. **IMPORTANTE**: Comparte las páginas/bases de datos de Notion con esta integración

## 🧪 Verificar que Funciona

### Opción 1: Script de Diagnóstico

```bash
node scripts/diagnose-notion-connection.js
```

**Debería mostrar:**
```
✅ Success! Edge Function is working
Found X pages for "Test"
```

### Opción 2: Probar Sincronización

```bash
npm run sync:notion
```

**Debería:**
- Encontrar páginas en Notion
- Sincronizar con Supabase
- Mostrar métricas extraídas

## 📝 Código Completo

El código está en: `supabase/functions/notion-proxy/index.ts`

**Características:**
- ✅ Acepta `action` y `initiativeName` en body JSON
- ✅ También acepta query params como fallback
- ✅ Búsqueda global en todas las bases de datos
- ✅ Filtra páginas que coincidan con el nombre
- ✅ Manejo de errores completo
- ✅ CORS configurado

## 🐛 Troubleshooting

### Error: "Function not found"
- Verifica que el nombre sea exactamente `notion-proxy`
- Verifica que esté desplegada (debe aparecer en la lista)

### Error: "NOTION_API_TOKEN not configured"
- Verifica que el secret esté configurado
- El nombre debe ser exactamente `NOTION_API_TOKEN` (mayúsculas)
- Verifica que el valor sea el token correcto de Notion

### Error: "Invalid action"
- Verifica que el código esté actualizado
- Revisa los logs en Dashboard → Edge Functions → notion-proxy → Logs

### Error: "Unauthorized" desde Notion
- Verifica que el token de Notion sea válido
- Verifica que las páginas estén compartidas con la integración
- Ve a Notion → Settings & members → Connections → Tu integración
- Asegúrate de que tenga acceso a las páginas/bases de datos

## 📊 Ver Logs

Para ver qué está pasando:

1. Ve a **Edge Functions** → `notion-proxy`
2. Haz clic en **Logs**
3. Revisa los logs recientes
4. Busca errores o mensajes informativos

## ✅ Checklist

- [ ] Edge Function `notion-proxy` creada/actualizada
- [ ] Código pegado correctamente
- [ ] Función desplegada exitosamente
- [ ] Secret `NOTION_API_TOKEN` configurado
- [ ] Token de Notion válido
- [ ] Páginas de Notion compartidas con la integración
- [ ] Script de diagnóstico funciona
- [ ] Sincronización funciona

---

**Este método es más fácil que usar CLI y no requiere instalación adicional.**
