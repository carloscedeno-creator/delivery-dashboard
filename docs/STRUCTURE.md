# Estructura del Proyecto

```
delivery-dashboard/
│
├── 📄 index.html                    # Dashboard principal (standalone)
├── 📄 README.md                     # Documentación principal
├── 📄 .gitignore                    # Archivos ignorados por git
├── 📄 package.json                  # Dependencias npm
│
├── ⚙️ Configuración
│   ├── vite.config.js              # Configuración de Vite
│   ├── tailwind.config.js          # Configuración de Tailwind
│   └── postcss.config.js           # Configuración de PostCSS
│
├── 🎨 Assets
│   ├── logo.png                    # Logo PNG
│   └── logo.svg                    # Logo SVG
│
├── 🔧 Backend
│   └── cloudflare-worker.js        # CORS Proxy (Cloudflare)
│
├── 📁 src/                          # Código fuente (Vite build)
│   ├── main.jsx                    # Punto de entrada
│   ├── App.jsx                     # Componente raíz
│   ├── index.css                   # Estilos globales
│   ├── data.js                     # Datos mock
│   └── components/                 # Componentes React
│       ├── Dashboard.jsx           # Dashboard principal
│       ├── KPICard.jsx            # Tarjetas de KPI
│       ├── GanttChart.jsx         # Gráfico Gantt
│       └── AllocationChart.jsx    # Gráfico de asignación
│
├── 📁 netlify/                      # Configuración Netlify
│   └── functions/
│       └── proxy.js                # CORS Proxy (Netlify)
│
├── 📁 docs/                         # Documentación
│   ├── CONFIGURATION.md            # Guía de configuración
│   └── STRUCTURE.md                # Este archivo
│
├── 📁 backup-old-files/             # Archivos antiguos (14 archivos)
│   ├── dashboard.html
│   ├── *.backup
│   ├── temp_*.js
│   └── ...
│
└── 📁 .git/                         # Repositorio git
    └── .netlify/                    # Cache de Netlify

```

## 📊 Componentes del Dashboard

### Vista Overall
- KPIs generales
- Métricas de rendimiento
- Estado del proyecto

### Vista Product Roadmap
- Iniciativas de producto
- Tracking de bugs
- Calendario de releases
- Filtros por BA, Designer, Team, Quarter

### Vista Delivery Roadmap
- Proyectos activos
- Asignación de recursos
- Timeline (Gantt)
- Workload de desarrolladores

## 🔄 Flujo de Datos

```
Google Sheets
     ↓
CORS Proxy (Cloudflare/Netlify)
     ↓
Dashboard (React)
     ↓
Recharts (Visualización)
     ↓
Usuario
```

## 🎯 Archivos Clave

| Archivo | Propósito | Tipo |
|---------|-----------|------|
| `index.html` | Dashboard standalone | Producción |
| `src/main.jsx` | Entry point para Vite | Desarrollo |
| `cloudflare-worker.js` | CORS proxy | Backend |
| `README.md` | Documentación | Docs |
| `tailwind.config.js` | Estilos | Config |

## 📦 Dependencias

### Runtime
- React 18
- React DOM 18
- Recharts 2.12.0
- Babel Standalone

### Development
- Vite
- Tailwind CSS
- PostCSS

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Limpiar backups
rm -rf backup-old-files/

# Restaurar desde git
git checkout -- <file>
```

## 📝 Notas

- **index.html** es standalone y no requiere build
- **src/** es para desarrollo con Vite (opcional)
- **backup-old-files/** contiene 14 archivos antiguos
- El proyecto usa Tailwind CSS para estilos
- Los datos se cargan desde Google Sheets vía CORS proxy
