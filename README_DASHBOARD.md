# 📊 Delivery Dashboard

Dashboard React para visualizar métricas de delivery desde Supabase, sincronizado automáticamente desde Jira.

## 🎯 Objetivo

**Abrir el dashboard y ver la data actualizada automáticamente. Sin ejecutar nada manualmente.**

## 🔄 Flujo Automático

```
┌─────────────────────────────────────────────────────────┐
│  CADA 30 MINUTOS (Automático)                          │
│                                                         │
│  1. Servicio sincroniza Jira → Supabase                │
│  2. Trigger calcula métricas automáticamente            │
│  3. Dashboard consume métricas directamente            │
│  4. Solo abres el dashboard y todo funciona            │
└─────────────────────────────────────────────────────────┘
```

## ⚡ Setup Inicial (Solo Una Vez)

### 1. Instalar Funciones SQL en Supabase

**Una sola vez - 5 minutos:**

1. Ve a [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Ejecuta `docs/supabase/04_calculate_metrics_functions.sql`
3. Ejecuta `docs/supabase/05_auto_calculate_metrics_trigger.sql`

**✅ Listo - Nunca más se necesita hacer esto**

### 2. Desplegar Servicio de Sincronización

El servicio `jira-supabase-sync` debe estar desplegado y corriendo automáticamente cada 30 minutos.

**Ver:** `D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync\README.md`

**Opciones de deploy:**
- Vercel (gratis) con cron job
- Railway ($5/mes) - automático
- Render (gratis) con cron job

### 3. Configurar Variables de Entorno

Crea `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## 🚀 Uso

### Desarrollo Local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

### Build para Producción

```bash
npm run build
npm run preview
```

## 📊 Vistas Disponibles

- **Overall** - Vista general de métricas
- **Delivery Roadmap** - Roadmap de entregas
- **Product Roadmap** - Roadmap de productos
- **Developer Workload** - Carga de trabajo por desarrollador

## 🔧 Integración con Supabase

El dashboard consume automáticamente:

- **Métricas de Sprint** desde `v_sprint_metrics_complete`
- **Métricas de Desarrollador** desde `v_developer_sprint_metrics_complete`
- **Métricas Globales** desde `global_metrics`
- **Issues** desde `issues`

**Archivo:** `src/utils/supabaseApi.js`

## 📚 Documentación

- [Flujo Automático Completo](docs/FLUJO_AUTOMATICO.md) - Cómo funciona todo automáticamente
- [Setup Automático](docs/SETUP_AUTOMATICO_COMPLETO.md) - Guía de setup inicial
- [Quick Start Métricas](docs/QUICK_START_METRICS.md) - Setup rápido de métricas
- [Integración Sync Service](docs/INTEGRACION_SYNC_SERVICE.md) - Cómo se integra con el servicio de sync

## ✅ Checklist de Setup

- [ ] Funciones SQL instaladas en Supabase (una vez)
- [ ] Trigger automático instalado (una vez)
- [ ] Servicio de sincronización desplegado
- [ ] Variables de entorno configuradas
- [ ] Dashboard probado localmente

**Una vez completado, TODO es automático.** 🚀

## 🎉 Resultado

**Después del setup:**
- ✅ Sincronización automática cada 30 min
- ✅ Métricas calculadas automáticamente
- ✅ Dashboard consume data automáticamente
- ✅ **Solo abres el dashboard y todo funciona**

**No más ejecuciones manuales. Todo automático.** ✨


