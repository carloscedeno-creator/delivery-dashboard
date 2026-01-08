# 🔐 Cómo Agregar Secrets en GitHub para GitHub Pages

## 📋 Secrets que Necesitas Agregar

Según tu configuración actual, ya tienes estos secrets:
- ✅ `PROJECTS_CONFIG`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_URL`

**Faltan estos secrets para que GitHub Pages funcione:**

### ❌ Secrets Faltantes:

1. **`VITE_SUPABASE_URL`**
2. **`VITE_SUPABASE_ANON_KEY`**

## 🚀 Pasos para Agregar los Secrets

### Paso 1: Obtener el Anon Key de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto: **Delivery Metrics**
3. Ve a **Settings** → **API**
4. En la sección **Project API keys**, copia el **"anon public"** key
   - ⚠️ **NO uses el "service_role" key** (ese es secreto y solo para backend)
   - ✅ Usa el **"anon public"** key (es público y seguro para frontend)

### Paso 2: Agregar Secrets en GitHub

1. Ve a tu repositorio: `https://github.com/carloscedeno-creator/delivery-dashboard`
2. Click en **Settings** (arriba a la derecha)
3. En el menú lateral izquierdo, ve a **Secrets and variables** → **Actions**
4. Click en **"New repository secret"** (botón verde)

#### Secret 1: VITE_SUPABASE_URL
- **Name:** `VITE_SUPABASE_URL`
- **Secret:** `https://sywkskwkexwwdzrbwinp.supabase.co`
- Click **"Add secret"**

#### Secret 2: VITE_SUPABASE_ANON_KEY
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Secret:** (pega el anon public key que copiaste de Supabase)
- Click **"Add secret"**

### Paso 3: Verificar que se Agregaron

Deberías ver ahora 5 secrets en total:
- ✅ `PROJECTS_CONFIG`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_URL`
- ✅ `VITE_SUPABASE_URL` (nuevo)
- ✅ `VITE_SUPABASE_ANON_KEY` (nuevo)

## 🔄 Cómo Funciona Ahora

### Workflow Actual: `pages-build-deployment`

GitHub Pages está usando su workflow automático. Para que use el nuevo workflow con secrets:

1. **Opción A: Usar el workflow que creamos** (`.github/workflows/deploy.yml`)
   - Este workflow usa los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   - Se ejecuta cuando haces push a `V1.06` o `main`
   - Construye con las variables de entorno correctas

2. **Opción B: Deshabilitar el workflow automático**
   - Ve a **Settings** → **Pages**
   - Cambia **Source** de "Deploy from a branch" a **"GitHub Actions"**
   - Esto hará que use el workflow `.github/workflows/deploy.yml`

## ✅ Verificación

Después de agregar los secrets:

1. Haz un push a la rama `V1.06`:
   ```bash
   git add .
   git commit -m "Update workflow"
   git push origin V1.06
   ```

2. Ve a **Actions** en GitHub
3. Deberías ver el workflow "Deploy to GitHub Pages" ejecutándose
4. Una vez completado, verifica: `https://carloscedeno-creator.github.io/delivery-dashboard/`

## 🔍 Troubleshooting

### El workflow falla con "Secret not found"
- Verifica que los nombres de los secrets sean exactamente: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Los nombres son case-sensitive

### El workflow no se ejecuta
- Verifica que estés haciendo push a `V1.06` o `main`
- O ejecuta manualmente desde **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### La aplicación carga pero no conecta a Supabase
- Abre la consola del navegador (F12)
- Verifica que no haya errores de conexión
- Revisa que el anon key sea el correcto (anon public, no service_role)

