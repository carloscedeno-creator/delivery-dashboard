# 🚀 Desplegar Edge Function Manualmente (Sin CLI)

Si tienes problemas con Supabase CLI, puedes desplegar la Edge Function directamente desde el Dashboard de Supabase.

## 📋 Opción 1: Dashboard de Supabase (Más Fácil)

### Paso 1: Abrir Supabase Dashboard

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions** en el menú lateral

### Paso 2: Crear/Editar Edge Function

1. Si ya existe `notion-proxy`:
   - Haz clic en ella
   - Haz clic en **Edit code**
   - Reemplaza todo el código con el contenido de `supabase/functions/notion-proxy/index.ts`

2. Si no existe:
   - Haz clic en **Create a new function**
   - Nombre: `notion-proxy`
   - Copia el contenido de `supabase/functions/notion-proxy/index.ts`
   - Pega en el editor

### Paso 3: Desplegar

1. Haz clic en **Deploy** o **Save and deploy**
2. Espera a que se complete el despliegue

### Paso 4: Configurar Secret

1. Ve a **Settings** → **Edge Functions** → **Secrets**
2. Haz clic en **Add new secret**
3. Nombre: `NOTION_API_TOKEN`
4. Valor: Tu token de Notion
5. Guarda

**Obtener token de Notion:**
1. Ve a https://www.notion.so/my-integrations
2. Crea o selecciona una integración
3. Copia el **Internal Integration Token**

## 📋 Opción 2: Usar MCP de Supabase (Si está disponible)

Si tienes MCP de Supabase configurado, puedes usar:

```javascript
// Usar MCP para desplegar
// (depende de cómo esté configurado tu MCP)
```

## 📋 Opción 3: Solucionar Problema de Instalación CLI

### Error Común: Permisos

Si el error es de permisos:

```powershell
# Ejecutar PowerShell como Administrador
npm install -g supabase --force
```

### Error Común: Versión de Node

Verifica tu versión de Node:

```powershell
node --version
# Debe ser >= 18
```

Si es menor, actualiza Node.js.

### Error Común: Cache de npm

Limpiar cache:

```powershell
npm cache clean --force
npm install -g supabase
```

### Instalación Alternativa

```powershell
# Usar npx en lugar de instalar globalmente
npx supabase@latest functions deploy notion-proxy
```

## 🧪 Verificar que Funciona

Después de desplegar (cualquier método):

```bash
node scripts/diagnose-notion-connection.js
```

O prueba la sincronización:

```bash
npm run sync:notion
```

## 📝 Código de la Edge Function

El código completo está en:
- `supabase/functions/notion-proxy/index.ts`

Copia todo el contenido y pégalo en el editor del Dashboard.

## 🔍 Verificar Logs

Si hay errores, revisa los logs:

1. Ve a Supabase Dashboard → Edge Functions → `notion-proxy`
2. Haz clic en **Logs**
3. Revisa los errores recientes

## 🐛 Troubleshooting

### Error: "Function not found"
- Verifica que el nombre sea exactamente `notion-proxy`
- Verifica que esté desplegada (debe aparecer en la lista)

### Error: "NOTION_API_TOKEN not configured"
- Verifica que el secret esté configurado
- El nombre debe ser exactamente `NOTION_API_TOKEN` (case-sensitive)

### Error: "Invalid action"
- Verifica que el código de la Edge Function esté actualizado
- Revisa los logs para ver qué está recibiendo

---

**Recomendación: Usa el Dashboard de Supabase (Opción 1) - es la más fácil y no requiere CLI.**
