# 🚀 Resumen: Cómo Hacer Deploy a GitHub Pages

## ✅ Paso 1: Agregar Secrets en GitHub (IMPORTANTE)

**ANTES de hacer push**, agrega estos secrets:

1. Ve a: `https://github.com/carloscedeno-creator/delivery-dashboard/settings/secrets/actions`
2. Click en **"New repository secret"**

### Secret 1:
- **Name:** `VITE_SUPABASE_URL`
- **Secret:** `https://sywkskwkexwwdzrbwinp.supabase.co`
- Click **"Add secret"**

### Secret 2:
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Secret:** (Obtén el anon public key de Supabase Dashboard → Settings → API → anon public key)
- Click **"Add secret"**

## ✅ Paso 2: Hacer Push del Workflow

```bash
git add .
git commit -m "Add GitHub Pages deployment workflow with environment variables"
git push origin V1.06
```

## ✅ Paso 3: Ejecutar el Workflow

1. Ve a **Actions** en GitHub
2. Busca **"Deploy to GitHub Pages"** en el menú lateral
3. Click en **"Run workflow"** (botón verde)
4. Selecciona rama `V1.06`
5. Click **"Run workflow"**

## ✅ Paso 4: Verificar

1. Espera 2-5 minutos a que termine el workflow
2. Ve a **Settings** → **Pages**
3. Debería decir "Last deployed by **Deploy to GitHub Pages** workflow"
4. Visita: `https://carloscedeno-creator.github.io/delivery-dashboard/`

## 🔍 Si Hay Errores

Revisa los logs en **Actions** → **Deploy to GitHub Pages** → (ejecución fallida)

Errores comunes:
- ❌ "Secret not found" → Agrega los secrets (Paso 1)
- ❌ "Build failed" → Verifica que compile localmente: `npm run build`
- ❌ "npm ci failed" → Ejecuta `npm install` localmente y haz commit de `package-lock.json`

## 📝 Notas

- El workflow se ejecutará automáticamente en cada push a `V1.06` o `main`
- También puedes ejecutarlo manualmente desde Actions
- Los secrets son necesarios para que Supabase funcione en producción

