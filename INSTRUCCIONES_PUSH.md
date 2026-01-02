# 🚀 Instrucciones para Subir el Workflow

El workflow "Deploy to GitHub Pages" no aparece en GitHub porque aún no se ha subido al repositorio.

## 📋 Pasos para Subirlo:

### 1. Abre PowerShell en la carpeta del proyecto:
```powershell
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
```

### 2. Verifica que estás en la rama V1.06:
```powershell
git branch --show-current
```

Si no estás en V1.06:
```powershell
git checkout V1.06
```

### 3. Agrega el workflow:
```powershell
git add .github/workflows/deploy.yml
```

### 4. Verifica que se agregó:
```powershell
git status
```

Deberías ver `.github/workflows/deploy.yml` en la lista de archivos agregados.

### 5. Haz commit:
```powershell
git commit -m "Add GitHub Pages deployment workflow"
```

### 6. Haz push:
```powershell
git push origin V1.06
```

### 7. Verifica en GitHub:
1. Ve a: https://github.com/carloscedeno-creator/delivery-dashboard/actions
2. Espera unos segundos y refresca la página
3. Deberías ver "Deploy to GitHub Pages" en el menú lateral izquierdo

### 8. Ejecuta el workflow:
1. Click en "Deploy to GitHub Pages"
2. Click en "Run workflow" (botón verde arriba)
3. Selecciona rama `V1.06`
4. Click "Run workflow"

## ✅ Checklist:

- [ ] Estás en la rama V1.06
- [ ] El archivo `.github/workflows/deploy.yml` existe localmente
- [ ] Los secrets están configurados en GitHub:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
- [ ] Hiciste commit del workflow
- [ ] Hiciste push a GitHub
- [ ] El workflow aparece en Actions
- [ ] Ejecutaste el workflow manualmente

