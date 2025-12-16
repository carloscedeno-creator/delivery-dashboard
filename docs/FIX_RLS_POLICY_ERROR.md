# 🔒 Solucionar Error de RLS Policy

## ❌ Error Común

```
❌ Error syncing metrics: new row violates row-level security policy for table "notion_extracted_metrics"
```

## 🔍 Causa

El script de sincronización está usando la **anon key** (`VITE_SUPABASE_ANON_KEY`), pero las políticas RLS (Row Level Security) solo permiten **lectura** para usuarios anónimos. Para **insertar o actualizar** datos, necesitas usar la **service role key**.

## ✅ Solución: Usar Service Role Key

### Paso 1: Obtener Service Role Key

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Busca la sección **Project API keys**
5. Copia la **`service_role` key** (⚠️ **NO** la `anon` key)
   - La service role key empieza con `eyJ...` (similar a la anon key)
   - ⚠️ **MANTÉN ESTA KEY SECRETA** - tiene acceso completo a tu base de datos

### Paso 2: Configurar en `.env`

Agrega la service role key a tu archivo `.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key  # Para el frontend (solo lectura)

# IMPORTANTE: Service role key para scripts del servidor (lectura + escritura)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Paso 3: Verificar Configuración

El script ahora prioriza `SUPABASE_SERVICE_ROLE_KEY` sobre `VITE_SUPABASE_ANON_KEY`:

```javascript
// El script ahora usa service_role key primero
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
```

### Paso 4: Probar Sincronización

```bash
npm run sync:notion
```

**Debería funcionar sin errores de RLS.**

## 🔐 Seguridad

### ⚠️ IMPORTANTE: Nunca Expongas la Service Role Key

- ❌ **NO** la pongas en código del frontend
- ❌ **NO** la commitees a Git
- ❌ **NO** la compartas públicamente
- ✅ **SÍ** úsala solo en scripts del servidor
- ✅ **SÍ** agrégala a `.env` (que está en `.gitignore`)
- ✅ **SÍ** úsala en variables de entorno del servidor

### Diferencia entre Keys

| Key | Uso | Permisos | Seguridad |
|-----|-----|----------|-----------|
| **anon key** | Frontend, APIs públicas | Solo lectura (según RLS) | ✅ Segura para exponer |
| **service_role key** | Scripts del servidor | Acceso completo (bypass RLS) | ⚠️ **MANTENER SECRETA** |

## 🐛 Troubleshooting

### Error: "Missing Supabase configuration"

**Solución:**
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté en tu `.env`
- Verifica que el archivo `.env` esté en la raíz del proyecto
- Reinicia el proceso si ya estaba corriendo

### Error: "Invalid API key"

**Solución:**
- Verifica que copiaste la key completa (son muy largas)
- Verifica que no haya espacios al inicio/final
- Verifica que estés usando la **service_role** key, no la anon key

### Error: "RLS policy violation" (aún con service_role key)

**Solución:**
1. Verifica que estás usando `SUPABASE_SERVICE_ROLE_KEY` (no `VITE_SUPABASE_ANON_KEY`)
2. Verifica que el script esté leyendo el `.env` correctamente
3. Ejecuta el script SQL de nuevo para asegurar que las políticas estén correctas:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Ver docs/supabase/04_create_notion_metrics_table.sql
   ```

## 📝 Políticas RLS Actuales

Las políticas RLS configuradas son:

1. **service_role**: Acceso completo (INSERT, UPDATE, DELETE, SELECT)
2. **authenticated**: Solo lectura (SELECT)
3. **anon**: Solo lectura (SELECT)

Por eso necesitas la **service_role key** para insertar/actualizar desde scripts.

## ✅ Checklist

- [ ] Service role key obtenida de Supabase Dashboard
- [ ] `SUPABASE_SERVICE_ROLE_KEY` agregada a `.env`
- [ ] `.env` está en `.gitignore` (no commiteado)
- [ ] Script de sincronización funciona sin errores RLS
- [ ] Datos se insertan correctamente en Supabase

---

**Una vez configurada la service role key, el error de RLS debería desaparecer.**
