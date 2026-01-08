# 🔧 Troubleshooting del Workflow de GitHub Pages

## ❌ Errores Comunes y Soluciones

### Error 1: "Secret VITE_SUPABASE_URL not found"

**Solución:**
1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Click en **"New repository secret"**
3. Name: `VITE_SUPABASE_URL`
4. Secret: `https://sywkskwkexwwdzrbwinp.supabase.co`
5. Click **"Add secret"**

### Error 2: "Secret VITE_SUPABASE_ANON_KEY not found"

**Solución:**
1. Obtén el anon key de Supabase Dashboard → Settings → API → anon public key
2. Ve a **Settings** → **Secrets and variables** → **Actions**
3. Click en **"New repository secret"**
4. Name: `VITE_SUPABASE_ANON_KEY`
5. Secret: (pega el anon key)
6. Click **"Add secret"**

### Error 3: "npm ci failed" o "Install dependencies failed"

**Posibles causas:**
- Problemas con `package-lock.json`
- Versión de Node.js incompatible

**Solución:**
```bash
# Localmente, regenera el package-lock.json
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push origin V1.06
```

### Error 4: "Build failed" o errores de compilación

**Verifica:**
1. Que el código compile localmente: `npm run build`
2. Que no haya errores de TypeScript/ESLint
3. Que todas las dependencias estén en `package.json`

**Solución:**
```bash
# Ejecuta localmente primero
npm run build

# Si hay errores, corrígelos antes de hacer push
```

### Error 5: "Upload artifact failed" o "Deploy failed"

**Posibles causas:**
- El directorio `dist/` no existe después del build
- Permisos insuficientes

**Solución:**
1. Verifica que `vite.config.js` tenga `base: '/delivery-dashboard/'` para producción
2. Verifica que el build genere archivos en `dist/`
3. Asegúrate de que el workflow tenga los permisos correctos (ya están configurados)

### Error 6: "Workflow not found" o no aparece en Actions

**Solución:**
1. Verifica que el archivo esté en `.github/workflows/deploy.yml`
2. Verifica que esté en la rama correcta (`V1.06` o `main`)
3. Haz push del archivo:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add deployment workflow"
   git push origin V1.06
   ```

## ✅ Checklist Antes de Ejecutar el Workflow

- [ ] Secrets configurados en GitHub:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Workflow existe en `.github/workflows/deploy.yml`
- [ ] Código compila localmente: `npm run build`
- [ ] No hay errores de lint: `npm run lint`
- [ ] `package-lock.json` está actualizado
- [ ] Cambios están en la rama `V1.06` o `main`

## 🔍 Cómo Ver los Logs de Error

1. Ve a **Actions** en GitHub
2. Click en el workflow que falló ("Deploy to GitHub Pages")
3. Click en la ejecución que falló (marcada con ❌)
4. Expande el step que falló para ver los logs detallados
5. Los errores aparecerán en rojo con el mensaje específico

## 🚀 Ejecutar el Workflow Manualmente

Si el workflow no se ejecuta automáticamente:

1. Ve a **Actions** → **Deploy to GitHub Pages**
2. Click en **"Run workflow"** (botón verde arriba a la derecha)
3. Selecciona la rama `V1.06`
4. Click **"Run workflow"**
5. Espera a que se ejecute (puede tomar 2-5 minutos)

## 📝 Notas Importantes

- Los secrets son **case-sensitive**: `VITE_SUPABASE_URL` no es lo mismo que `vite_supabase_url`
- Los secrets solo están disponibles en workflows de GitHub Actions, no en el código del frontend directamente
- El workflow usa `npm ci` que requiere `package-lock.json` actualizado
- El build se hace en un entorno limpio cada vez, así que todas las dependencias deben estar en `package.json`

