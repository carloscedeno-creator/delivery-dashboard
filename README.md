# Antigravity Delivery Dashboard

Dashboard interactivo para visualizar y gestionar proyectos de entrega, recursos y roadmaps.

## 📁 Estructura del Proyecto

```
delivery-dashboard/
├── index.html              # Dashboard principal (standalone)
├── src/                    # Código fuente para build con Vite
│   ├── main.jsx           # Punto de entrada
│   ├── App.jsx            # Componente principal
│   ├── index.css          # Estilos globales
│   ├── data.js            # Datos mock
│   └── components/        # Componentes React
│       ├── Dashboard.jsx
│       ├── KPICard.jsx
│       ├── GanttChart.jsx
│       └── AllocationChart.jsx
├── cloudflare-worker.js   # Worker de Cloudflare (CORS proxy)
├── logo.png / logo.svg    # Assets del proyecto
├── docs/                  # Documentación
└── backup-old-files/      # Archivos antiguos y backups
```

## 🚀 Configuración

### Archivos de configuración:
- `package.json` - Dependencias npm
- `vite.config.js` - Configuración de Vite
- `tailwind.config.js` - Configuración de Tailwind CSS
- `postcss.config.js` - Configuración de PostCSS

## 📊 Fuentes de Datos

El dashboard consume datos de Google Sheets a través de:
- **CORS Proxy (Cloudflare Worker)**: `https://sheets-proxy.carlos-cedeno.workers.dev/`

### Google Sheets URLs:
- **Delivery Roadmap**: 
  - Projects: `gid=1503252593`
  - Allocation: `gid=1194298779`
- **Product Roadmap**:
  - Initiatives: `gid=933125518`
  - Bug/Release: `gid=1707343419`

## 🛠️ Uso

### Opción 1: Standalone (index.html)
Simplemente abre `index.html` en un navegador. No requiere build.

### Opción 2: Development con Vite
```bash
npm install
npm run dev
```

### Opción 3: Build para producción
```bash
npm run build
```

## 🎨 Tecnologías

- **React 18** - UI Framework
- **Recharts** - Visualización de datos
- **Tailwind CSS** - Estilos
- **Vite** - Build tool
- **Cloudflare Workers** - CORS proxy
- **GitHub Pages** - Hosting gratuito

## 📝 Vistas del Dashboard

1. **Overall Dashboard** - Vista general de métricas
2. **Product Roadmap** - Iniciativas de producto, bugs y releases
3. **Delivery Roadmap** - Proyectos, recursos y timeline

## 🔧 Mantenimiento

- Los archivos antiguos y backups están en `backup-old-files/`
- El repositorio git contiene el historial completo
- Para restaurar versiones anteriores: `git checkout -- <file>`

## 📦 Deployment

### GitHub Pages (Recomendado) ⭐
El proyecto está optimizado para GitHub Pages - deployment gratuito y estable.

**Configuración:**
1. Ve a Settings → Pages en tu repositorio
2. Source: Deploy from a branch
3. Branch: `main` / `root`
4. El dashboard estará disponible en: `https://[username].github.io/delivery-dashboard/`

**Ventajas:**
- ✅ Completamente gratis
- ✅ SSL automático (HTTPS)
- ✅ Deploy automático con cada push
- ✅ Muy estable y rápido
- ✅ No requiere configuración adicional
- ✅ Sin límites de ancho de banda

### Repositorio
GitHub: `https://github.com/carloscedeno-creator/delivery-dashboard`

---

**Última actualización**: Noviembre 2025
