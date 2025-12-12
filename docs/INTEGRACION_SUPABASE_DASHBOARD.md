# 🔄 Integración del Dashboard con Supabase

## 📋 Resumen

El dashboard de delivery ahora consume datos directamente desde Supabase en lugar de Google Sheets CSV.

## ✅ Cambios Realizados

### 1. Nuevas Funciones en `supabaseApi.js`

#### `getDeliveryRoadmapData()`
- Obtiene squads, initiatives, issues y métricas desde Supabase
- Calcula SPI, porcentaje de completitud, y asignaciones
- Retorna datos en formato compatible con el dashboard

#### `getDeveloperAllocationData()`
- Obtiene asignaciones de desarrolladores por iniciativa
- Calcula porcentajes basados en Story Points
- Retorna datos en formato compatible con el dashboard

### 2. Actualización de `App.jsx`

- **Prioridad Supabase**: Intenta cargar desde Supabase primero
- **Fallback a CSV**: Si falla Supabase, usa CSV como respaldo
- **Product Roadmap**: Sigue usando CSV (por ahora)

## 🔄 Flujo de Datos

```
Dashboard inicia
  ↓
Intenta cargar desde Supabase
  ├─ ✅ Éxito → Usa datos de Supabase
  └─ ❌ Error → Fallback a CSV
```

## 📊 Datos que Consume desde Supabase

### Delivery Roadmap:
- **Squads** → `squads` table
- **Initiatives** → `initiatives` table
- **Issues** → `issues` table
- **Métricas** → `v_sprint_metrics_complete` view
- **Desarrolladores** → `developers` table

### Cálculos:
- **SPI**: Basado en SP completados vs total
- **Status**: Porcentaje de completitud
- **Allocation**: Número de desarrolladores asignados
- **Fechas**: Del sprint más reciente

## ⚙️ Configuración Requerida

### Variables de Entorno

El dashboard necesita estas variables en `.env`:

```env
VITE_SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Obtener Anon Key

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona el proyecto
3. **Settings** → **API**
4. Copia el **"anon" public** key (NO el service_role)

## ✅ Verificación

### 1. Verificar Variables de Entorno

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
# Verificar que .env tenga las variables
```

### 2. Ejecutar Dashboard

```bash
npm run dev
```

### 3. Verificar en Consola del Navegador

Deberías ver:
```
[APP] Cargando datos desde Supabase...
[APP] ✅ Datos de delivery cargados desde Supabase: { projects: X, allocations: Y }
```

## 🔍 Troubleshooting

### Error: "Supabase no está configurado"
- Verifica que `.env` tenga `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Reinicia el servidor de desarrollo después de cambiar `.env`

### Error: "No se encontraron datos"
- Verifica que el servicio de sync haya ejecutado al menos una vez
- Verifica en Supabase que haya datos en `squads`, `initiatives`, `issues`

### Fallback a CSV
- Si ves "Error cargando desde Supabase, usando CSV", verifica:
  - Variables de entorno correctas
  - Conexión a Supabase
  - Datos en las tablas

## 📝 Próximos Pasos

1. ✅ Delivery Roadmap → Supabase (completado)
2. ⏳ Product Roadmap → Supabase (pendiente)
3. ⏳ Optimizar consultas y agregar caché
4. ⏳ Agregar indicador visual de fuente de datos (Supabase vs CSV)

## 🎯 Resumen

**El dashboard ahora consume datos desde Supabase automáticamente.**

- ✅ Datos actualizados cada 30 minutos (automático)
- ✅ Sin necesidad de ejecutar nada manualmente
- ✅ Fallback a CSV si Supabase no está disponible
- ✅ Métricas calculadas automáticamente

**¡Todo funciona automáticamente!** 🚀

