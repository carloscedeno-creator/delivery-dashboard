# UI Components Guidelines

**Última actualización:** 2024-12-19

---

## 🎨 Estilos y Diseño

### Framework
- **CSS Framework:** TailwindCSS
- **Icons:** Lucide React
- **Charts:** Recharts 2.12
- **Animations:** Framer Motion (opcional)

### Patrones de Estilo

#### Glass Morphism
```jsx
<div className="glass rounded-2xl p-6">
  {/* Contenido */}
</div>
```

#### Cards
```jsx
<div className="bg-slate-800/50 rounded-lg p-4">
  {/* Contenido */}
</div>
```

#### Colores de Estatus
- Ver `src/components/ProjectsMetrics.jsx` para mapeo completo
- Usar colores consistentes para estatus normalizados

---

## 📦 Componentes Principales

### Authentication
- **Login:** `src/components/Login.jsx`
- **ForgotPassword:** `src/components/ForgotPassword.jsx`
- **ResetPassword:** `src/components/ResetPassword.jsx`

### Metrics Views
- **OverallView:** Vista general de métricas
- **ProjectsMetrics:** Métricas por proyecto/sprint
- **DeveloperMetrics:** Métricas por desarrollador
- **TeamCapacity:** Capacidad del equipo
- **DeliveryKPIs:** KPIs de delivery
- **QualityKPIs:** KPIs de calidad

### Navigation
- **Sidebar:** Navegación principal con módulos
- **Navbar:** Barra superior (si aplica)

---

## 🔄 Patrones de Componentes

### Lazy Loading
```jsx
const Component = lazy(() => import('./components/Component.jsx'));

<Suspense fallback={<div>Loading...</div>}>
  <Component />
</Suspense>
```

### Estado y Loading
```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData();
}, [dependencies]);
```

### Manejo de Errores
```jsx
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  console.error('[COMPONENT_NAME] Error:', error);
  // Mostrar mensaje de error al usuario
}
```

---

## 📊 Charts (Recharts)

### Patrón Básico
```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="value" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>
```

---

## ⚠️ Anti-Patterns

### ❌ NO Hacer
- Importar `react-router-dom` si no se usa routing
- Hardcodear valores de estatus
- Crear componentes sin manejo de loading/error
- Usar imports relativos profundos

### ✅ SIEMPRE Hacer
- Lazy load componentes grandes
- Manejar estados de loading y error
- Usar alias `@/` para imports
- Logging con prefijos `[COMPONENT_NAME]`

---

## 🔗 Referencias

- Componentes: `src/components/`
- Estilos: `src/index.css`
- Config: `tailwind.config.js`
