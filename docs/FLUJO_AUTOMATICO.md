# 🔄 Flujo Automático Completo

## 🎯 Objetivo

**Cuando abras el dashboard, la data está ahí, sincronizada y lista para usar. Sin ejecutar nada manualmente.**

## ✅ Setup Inicial (Solo Una Vez - 15 minutos)

### 1. Instalar Funciones SQL en Supabase (5 min)

**Solo se hace UNA VEZ:**

1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega `docs/supabase/04_calculate_metrics_functions.sql` → Run
3. Copia y pega `docs/supabase/05_auto_calculate_metrics_trigger.sql` → Run

**✅ Listo - Nunca más se necesita hacer esto**

### 2. Desplegar Servicio de Sincronización (10 min)

El servicio `jira-supabase-sync` debe estar desplegado y corriendo automáticamente.

**Opciones:**
- **Vercel** (gratis): Conecta repo, configura env vars, crea `vercel.json` con cron
- **Railway** ($5/mes): Conecta repo, configura env vars, automático
- **Render** (gratis): Crea Cron Job, schedule `*/30 * * * *`

**✅ Listo - Se ejecutará automáticamente cada 30 minutos**

### 3. Configurar Dashboard (2 min)

Solo necesitas variables de entorno en `.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

**✅ Listo - El dashboard está listo**

## 🔄 Flujo Automático (Después del Setup)

Una vez configurado, **TODO funciona automáticamente**:

```
┌─────────────────────────────────────────────────────────────┐
│  CADA 30 MINUTOS (Automático)                              │
│                                                             │
│  1. Servicio de Sincronización se ejecuta                  │
│     ↓                                                        │
│  2. Sincroniza Jira → Supabase                              │
│     (issues, sprints, developers, epics, historial)         │
│     ↓                                                        │
│  3. Inserta registro en data_sync_log                       │
│     con status='completed'                                   │
│     ↓                                                        │
│  4. Trigger automático detecta sync completada             │
│     ↓                                                        │
│  5. Calcula métricas automáticamente                       │
│     (sprint_metrics, developer_sprint_metrics)              │
│     ↓                                                        │
│  6. Métricas guardadas en Supabase                         │
│     ↓                                                        │
│  7. Dashboard consume métricas directamente                │
│     (cuando el usuario abre el dashboard)                  │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Cómo Consume el Dashboard

El dashboard ya está configurado para consumir automáticamente:

### Archivo: `src/utils/supabaseApi.js`

**Funciones disponibles:**
- `getSprintMetrics()` - Métricas de sprints desde `v_sprint_metrics_complete`
- `getDeveloperMetrics()` - Métricas de desarrolladores desde `v_developer_sprint_metrics_complete`
- `getGlobalMetrics()` - Métricas globales
- `getActiveSprint()` - Sprint activo actual
- `getIssuesByStatus()` - Issues agrupados por estado

**Todas estas funciones:**
- ✅ Se conectan automáticamente a Supabase
- ✅ Consumen las métricas calculadas automáticamente
- ✅ No requieren intervención manual

## 🎯 Resultado Final

**Después del setup inicial:**

1. ✅ **Sincronización automática** cada 30 minutos
2. ✅ **Cálculo de métricas automático** después de cada sync
3. ✅ **Data disponible** en Supabase
4. ✅ **Dashboard consume** la data automáticamente
5. ✅ **Solo abres el dashboard** y todo funciona

**No necesitas:**
- ❌ Ejecutar scripts manualmente
- ❌ Calcular métricas manualmente
- ❌ Sincronizar manualmente
- ❌ Hacer nada más

## ✅ Checklist de Setup

- [ ] Funciones SQL instaladas en Supabase (una vez)
- [ ] Trigger automático instalado en Supabase (una vez)
- [ ] Servicio de sincronización desplegado y corriendo
- [ ] Variables de entorno del dashboard configuradas
- [ ] Dashboard probado localmente

**Una vez completado, TODO es automático.** 🚀

## 🔍 Verificar que Todo Funciona

### Verificar Sincronización Automática

```sql
-- En Supabase SQL Editor
SELECT 
  sync_completed_at,
  status,
  issues_imported
FROM data_sync_log
ORDER BY sync_started_at DESC
LIMIT 5;
```

**Deberías ver:** Syncs cada ~30 minutos con `status = 'completed'`

### Verificar Métricas Calculadas

```sql
-- Ver métricas recientes
SELECT 
  calculated_at,
  sprint_name,
  total_story_points,
  completed_story_points
FROM v_sprint_metrics_complete
WHERE calculated_at > NOW() - INTERVAL '1 hour'
ORDER BY calculated_at DESC;
```

**Deberías ver:** Métricas calculadas automáticamente después de cada sync

### Verificar Dashboard

1. Abre dashboard: `npm run dev`
2. Navega a vistas que usan métricas
3. Deberías ver data actualizada

## 📝 Resumen

**Setup inicial:** 15 minutos (solo una vez)
**Después:** Todo automático, solo abres el dashboard

**No más ejecuciones manuales. Todo funciona solo.** ✨


