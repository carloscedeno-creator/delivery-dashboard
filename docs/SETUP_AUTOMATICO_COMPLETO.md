# 🚀 Setup Automático Completo - Sin Intervención Manual

Este documento explica cómo configurar el sistema para que **todo funcione automáticamente** - solo necesitas abrir el dashboard y ver la data actualizada.

## 🎯 Objetivo Final

**Cuando abras el dashboard:**
- ✅ La data está sincronizada (última sync hace < 30 min)
- ✅ Las métricas están calculadas y disponibles
- ✅ Todo funciona sin intervención manual
- ✅ **No necesitas ejecutar nada - solo abres el dashboard**

## 📋 Setup Inicial (Solo Una Vez)

### Paso 1: Instalar Funciones SQL en Supabase (Una Sola Vez)

**Esto solo se hace UNA VEZ al inicio:**

1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu Proyecto → **SQL Editor**
2. Copia y pega el contenido de `docs/supabase/04_calculate_metrics_functions.sql`
3. Haz clic en **Run**
4. Copia y pega el contenido de `docs/supabase/05_auto_calculate_metrics_trigger.sql`
5. Haz clic en **Run**

**✅ Listo - Esto nunca más se necesita hacer**

### Paso 2: Desplegar Servicio de Sincronización (Una Sola Vez)

El servicio `jira-supabase-sync` debe estar desplegado y corriendo automáticamente cada 30 minutos.

**Opciones de deploy:**

#### Opción A: Vercel (Gratis) ⭐ Recomendado

1. Ve a [Vercel](https://vercel.com)
2. Conecta el repositorio `GooglescriptsDelivery/jira-supabase-sync`
3. Configura variables de entorno:
   - `JIRA_DOMAIN`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PROJECT_KEY=OBD`
4. Crea `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/sync",
       "schedule": "*/30 * * * *"
     }]
   }
   ```
5. Deploy

**✅ Listo - Se ejecutará automáticamente cada 30 minutos**

#### Opción B: Railway ($5/mes)

1. Conecta repositorio a Railway
2. Configura variables de entorno
3. Railway detecta automáticamente el cron job

#### Opción C: Render (Gratis con límites)

1. Crea "Cron Job" en Render
2. Schedule: `*/30 * * * *`
3. Command: `npm start`

### Paso 3: Configurar Dashboard (Una Sola Vez)

El dashboard ya está configurado para consumir datos de Supabase. Solo necesitas:

1. Variables de entorno en `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

2. El dashboard consumirá automáticamente:
   - Métricas de sprint desde `sprint_metrics`
   - Métricas de desarrollador desde `developer_sprint_metrics`
   - Datos de issues desde `issues`

**✅ Listo - El dashboard está listo**

## 🔄 Flujo Automático (Después del Setup)

Una vez configurado, **todo funciona automáticamente**:

```
┌─────────────────────────────────────────────────────────┐
│  1. Servicio de Sincronización (cada 30 min)          │
│     ↓                                                    │
│  2. Sincroniza Jira → Supabase                          │
│     ↓                                                    │
│  3. Inserta registro en data_sync_log                  │
│     con status='completed'                               │
│     ↓                                                    │
│  4. Trigger automático detecta sync completada          │
│     ↓                                                    │
│  5. Calcula métricas automáticamente                   │
│     (sprint_metrics, developer_sprint_metrics)         │
│     ↓                                                    │
│  6. Métricas disponibles en Supabase                   │
│     ↓                                                    │
│  7. Dashboard consume métricas directamente            │
│     (cuando el usuario abre el dashboard)              │
└─────────────────────────────────────────────────────────┘
```

**No necesitas hacer NADA más** - Todo es automático.

## ✅ Verificar que Todo Funciona

### 1. Verificar Sincronización Automática

```sql
-- En Supabase SQL Editor
SELECT 
  sync_type,
  status,
  sync_completed_at,
  issues_imported,
  sync_started_at
FROM data_sync_log
ORDER BY sync_started_at DESC
LIMIT 5;
```

**Resultado esperado:**
- Deberías ver syncs cada ~30 minutos
- `status = 'completed'`
- `sync_completed_at` reciente

### 2. Verificar Métricas Calculadas Automáticamente

```sql
-- Ver métricas más recientes
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
WHERE sm.calculated_at > NOW() - INTERVAL '1 hour'
ORDER BY sm.calculated_at DESC;
```

**Resultado esperado:**
- Métricas calculadas en los últimos 60 minutos
- `calculated_at` coincide con `sync_completed_at`

### 3. Verificar Dashboard

1. Abre el dashboard localmente: `npm run dev`
2. Navega a las vistas que consumen métricas
3. Deberías ver data actualizada

## 🎯 Resumen: Qué Hacer Solo Una Vez

### ✅ Setup Inicial (Solo Una Vez)

1. **Instalar funciones SQL en Supabase** (5 minutos)
   - Ejecutar `04_calculate_metrics_functions.sql`
   - Ejecutar `05_auto_calculate_metrics_trigger.sql`

2. **Desplegar servicio de sincronización** (10 minutos)
   - Vercel/Railway/Render con cron job cada 30 min

3. **Configurar variables de entorno del dashboard** (2 minutos)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### ✅ Después del Setup (Automático)

- ✅ Sincronización cada 30 minutos
- ✅ Cálculo de métricas automático
- ✅ Data disponible en dashboard
- ✅ **No necesitas hacer nada más**

## 🐛 Troubleshooting

### Las métricas no se calculan automáticamente

**Verificar:**
1. ¿El trigger está instalado?
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'after_sync_complete';
   ```

2. ¿La sincronización marca `status = 'completed'`?
   ```sql
   SELECT * FROM data_sync_log 
   ORDER BY sync_started_at DESC LIMIT 1;
   ```

**Solución:**
- Si el trigger no existe, ejecuta `05_auto_calculate_metrics_trigger.sql` nuevamente
- Si la sync no marca 'completed', revisa el servicio de sincronización

### El dashboard no muestra data

**Verificar:**
1. ¿Las variables de entorno están configuradas?
2. ¿Hay métricas en Supabase?
   ```sql
   SELECT COUNT(*) FROM sprint_metrics;
   ```

**Solución:**
- Verifica `.env` tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Verifica que las métricas existen en Supabase

### La sincronización no se ejecuta automáticamente

**Verificar:**
1. ¿El servicio está desplegado?
2. ¿El cron job está configurado?
3. ¿Las variables de entorno están configuradas en el servicio?

**Solución:**
- Revisa los logs del servicio desplegado
- Verifica que el cron job está activo en Vercel/Railway/Render

## 📝 Notas Importantes

- **El setup inicial solo se hace UNA VEZ**
- **Después de eso, todo es automático**
- **No necesitas ejecutar nada manualmente**
- **Solo abre el dashboard y verás la data actualizada**

## 🎉 Resultado Final

Una vez configurado:

1. ✅ El servicio sincroniza Jira → Supabase cada 30 min
2. ✅ Las métricas se calculan automáticamente después de cada sync
3. ✅ El dashboard consume la data directamente
4. ✅ **Solo abres el dashboard y todo funciona**

**No más ejecuciones manuales. Todo automático.** 🚀


