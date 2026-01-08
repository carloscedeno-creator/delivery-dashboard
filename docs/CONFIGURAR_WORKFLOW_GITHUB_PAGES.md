# 🔧 Cómo Configurar GitHub Pages para Usar Nuestro Workflow

## 📋 Situación Actual

GitHub Pages está configurado para usar "GitHub Actions" pero está mostrando workflows sugeridos (Jekyll, Static HTML) en lugar de usar nuestro workflow `deploy.yml`.

## ✅ Solución: GitHub Pages Detecta Automáticamente

**¡Buenas noticias!** GitHub Pages detecta automáticamente cualquier workflow que:
1. Use `actions/deploy-pages@v4` o `actions/upload-pages-artifact@v3`
2. Tenga el job `deploy` con `environment: github-pages`

Nuestro workflow **YA cumple estos requisitos**, así que GitHub Pages debería detectarlo automáticamente.

## 🚀 Pasos para Activar

### Opción 1: Ejecutar el Workflow Manualmente (Más Rápido)

1. Ve a la pestaña **Actions** en tu repositorio
2. En el menú lateral izquierdo, busca **"Deploy to GitHub Pages"**
3. Si no lo ves, haz un push del workflow:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Pages deployment workflow"
   git push origin V1.06
   ```
4. Una vez que aparezca, haz click en **"Run workflow"** (botón verde)
5. Selecciona la rama `V1.06` y click **"Run workflow"**

### Opción 2: Esperar a que GitHub Pages lo Detecte

Después de hacer push del workflow, GitHub Pages debería detectarlo automáticamente en unos minutos. Verás en la página de Settings → Pages que dice:

> "Your site was last deployed to the **github-pages** environment by the **Deploy to GitHub Pages** workflow."

## 🔍 Verificación

1. **Verifica que el workflow existe:**
   - Ve a **Actions** → Deberías ver "Deploy to GitHub Pages" en la lista

2. **Verifica que se ejecutó:**
   - Click en "Deploy to GitHub Pages"
   - Deberías ver ejecuciones del workflow

3. **Verifica el despliegue:**
   - Ve a **Settings** → **Pages**
   - Debería decir "Last deployed by **Deploy to GitHub Pages** workflow"

## ⚠️ Importante: Agregar los Secrets Primero

**ANTES de ejecutar el workflow**, asegúrate de tener estos secrets configurados:

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Agrega estos secrets si no los tienes:
   - `VITE_SUPABASE_URL` = `https://sywkskwkexwwdzrbwinp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (tu anon public key de Supabase)

## 🎯 Si GitHub Pages No Lo Detecta

Si después de hacer push y ejecutar el workflow, GitHub Pages sigue mostrando los workflows sugeridos:

1. **Desactiva y reactiva GitHub Pages:**
   - Ve a **Settings** → **Pages**
   - Click en **"Unpublish site"**
   - Espera unos segundos
   - Ve a **Source** → Selecciona **"GitHub Actions"** de nuevo
   - Esto forzará a GitHub Pages a buscar workflows disponibles

2. **Verifica el nombre del workflow:**
   - El workflow debe estar en `.github/workflows/deploy.yml`
   - El nombre puede ser cualquier cosa, pero debe tener el job `deploy` correcto

3. **Ejecuta el workflow manualmente:**
   - Ve a **Actions** → **Deploy to GitHub Pages** → **Run workflow**
   - Esto debería hacer que GitHub Pages lo reconozca

## 📝 Nota sobre "pages-build-deployment"

El workflow "pages-build-deployment" que ves es el workflow automático antiguo de GitHub Pages. Una vez que nuestro workflow se ejecute exitosamente, GitHub Pages debería cambiar automáticamente a usar nuestro workflow personalizado.

