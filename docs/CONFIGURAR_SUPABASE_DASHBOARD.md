# ⚙️ Configurar Supabase en el Dashboard

## 📋 Pasos para Configurar

### Paso 1: Obtener Anon Key de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona el proyecto **"Delivery Metrics"**
3. Ve a **Settings** → **API**
4. En la sección **"Project API keys"**, copia el **"anon" public** key
   - ⚠️ **NO uses el service_role key** (ese es para backend)
   - ✅ Usa el **anon public** key

### Paso 2: Crear Archivo `.env`

En la raíz del proyecto `delivery-dashboard`, crea un archivo `.env`:

```env
VITE_SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**Importante:**
- El prefijo `VITE_` es necesario para que Vite exponga estas variables al frontend
- Reemplaza `tu_anon_key_aqui` con el anon key que copiaste

### Paso 3: Reiniciar el Servidor

Después de crear/editar el `.env`, reinicia el servidor de desarrollo:

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
# Detén el servidor (Ctrl+C) si está corriendo
npm run dev
```

## ✅ Verificación

### 1. Verificar en Consola del Navegador

Abre el dashboard y ve a la consola del navegador (F12). Deberías ver:

```
[APP] Cargando datos desde Supabase...
[APP] ✅ Datos de delivery cargados desde Supabase: { projects: X, allocations: Y }
```

### 2. Si Ves Error

Si ves:
```
⚠️ Supabase no está configurado. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
```

**Solución:**
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que las variables empiecen con `VITE_`
- Reinicia el servidor de desarrollo

## 🔍 Diferencia entre Anon Key y Service Role Key

| Key | Uso | Dónde |
|-----|-----|-------|
| **anon public** | Frontend (dashboard) | ✅ Usa este en el dashboard |
| **service_role secret** | Backend (sync service) | ❌ NO uses este en el dashboard |

## 📝 Resumen

**Para que el dashboard consuma Supabase:**

1. ✅ Obtén el **anon public key** de Supabase
2. ✅ Crea `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. ✅ Reinicia el servidor de desarrollo

**El dashboard usará Supabase automáticamente.** 🚀

