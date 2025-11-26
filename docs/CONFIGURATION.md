# Guía de Configuración del Dashboard

## 🔗 URLs de Google Sheets

### Delivery Roadmap
- **Base URL**: `https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8`
- **Projects Sheet**: `gid=1503252593`
- **Allocation Sheet**: `gid=1194298779`

### Product Roadmap
- **Base URL**: `https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN`
- **Initiatives Sheet**: `gid=933125518`
- **Bug/Release Sheet**: `gid=1707343419`

## 🌐 CORS Proxy

### Cloudflare Worker (Recomendado)
- **URL**: `https://sheets-proxy.carlos-cedeno.workers.dev/`
- **Código**: Ver `cloudflare-worker.js`
- **Uso**: Agrega `?url=` seguido de la URL del Google Sheet

**Ventajas:**
- ✅ Gratis hasta 100,000 requests/día
- ✅ Muy rápido (edge computing)
- ✅ Sin configuración adicional
- ✅ Compatible con GitHub Pages

## 🎨 Personalización

### Colores (Tailwind)
Los colores principales están definidos en `tailwind.config.js`:
- **Background**: `#020617`
- **Card**: `rgba(30, 41, 59, 0.5)`
- **Accent**: Cyan (`#00D9FF`)

### Fuentes
- **Principal**: Outfit (Google Fonts)
- **Fallback**: sans-serif

## 📊 Estructura de Datos

### Projects Sheet (Delivery Roadmap)
Columnas esperadas:
- Squad
- Initiatives
- Start
- Current Status (%)
- Estimated Delivery
- SPI (Schedule Performance Index)
- Team Allocation
- Comments
- Scope

### Allocation Sheet
Columnas esperadas:
- Squad
- Initiatives
- Dev
- Percentage

### Initiatives Sheet (Product Roadmap)
Columnas esperadas:
- Initiative
- BA
- Designer
- Team
- Quarter
- Status
- Effort (days)
- Completion (%)

## 🚀 Deployment

### GitHub Pages (Recomendado)
**Configuración automática:**
1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main` / Folder: `/ (root)`
5. Save

**URL del dashboard:**
- `https://[tu-usuario].github.io/delivery-dashboard/`
- Ejemplo: `https://carloscedeno-creator.github.io/delivery-dashboard/`

**Ventajas:**
- ✅ Completamente gratis
- ✅ SSL/HTTPS automático
- ✅ Deploy automático con cada push a main
- ✅ CDN global (muy rápido)
- ✅ Sin límites de ancho de banda
- ✅ No requiere configuración adicional

**Notas:**
- El archivo `index.html` debe estar en la raíz del repositorio
- Los cambios se reflejan en 1-2 minutos después del push
- Compatible con el CORS proxy de Cloudflare Worker

## 🔧 Troubleshooting

### Error: "React is not defined"
- Verifica que los scripts de React se carguen antes del código de la app
- Revisa la consola del navegador para errores de carga de scripts

### Error: "Failed to fetch"
- Verifica que el CORS proxy esté funcionando
- Comprueba que las URLs de Google Sheets sean correctas
- Asegúrate de que las hojas estén publicadas públicamente

### Datos no se cargan
- Verifica la estructura de las columnas en Google Sheets
- Revisa la consola para errores de parsing
- Comprueba que los datos mock se muestren correctamente

## 📝 Notas

- El dashboard tiene fallback a datos mock si falla la carga desde Google Sheets
- Los cambios en Google Sheets se reflejan automáticamente al recargar
- El dashboard es responsive y funciona en móviles
