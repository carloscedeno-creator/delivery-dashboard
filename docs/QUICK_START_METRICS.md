# 🚀 Quick Start: Cálculo Automático de Métricas

Guía rápida para activar el cálculo automático de métricas analíticas en Supabase.

## ⚡ Instalación en 3 Pasos

### Paso 1: Aplicar Funciones SQL

1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu Proyecto → **SQL Editor**
2. Crea una nueva query
3. Copia y pega el contenido completo de:
   ```
   docs/supabase/04_calculate_metrics_functions.sql
   ```
4. Haz clic en **Run** (o `Ctrl+Enter`)

✅ **Verificación:** Deberías ver mensajes de éxito para cada función creada.

### Paso 2: Activar Trigger Automático

1. En el mismo **SQL Editor**
2. Copia y pega el contenido completo de:
   ```
   docs/supabase/05_auto_calculate_metrics_trigger.sql
   ```
3. Haz clic en **Run**

✅ **Verificación:** Deberías ver "CREATE TRIGGER" exitoso.

### Paso 3: Probar la Instalación

```bash
# Desde la raíz del proyecto
npm run test-metrics OBD
```

O manualmente:

```bash
node scripts/test-metrics-calculation.js OBD
```

✅ **Resultado esperado:**
- ✅ Todas las funciones requeridas están instaladas
- ✅ Datos verificados (sprints, issues, relaciones)
- ✅ Métricas calculadas exitosamente
- ✅ Métricas de sprint y desarrollador mostradas

## 🎯 ¿Qué Hace Esto?

### Funciones SQL Creadas

1. **`map_to_target_status()`** - Normaliza estados de Jira
2. **`get_historical_status_for_sprint()`** - Obtiene estado histórico
3. **`get_initial_sp_for_sprint()`** - Calcula SP iniciales
4. **`calculate_sprint_metrics()`** - Calcula métricas de sprint
5. **`calculate_developer_sprint_metrics()`** - Calcula métricas de desarrollador
6. **`calculate_all_metrics()`** - Calcula todas las métricas de un proyecto

### Trigger Automático

El trigger `after_sync_complete` se ejecuta **automáticamente e inmediatamente** cuando:
- Una sincronización de Jira se completa exitosamente
- El servicio de sincronización inserta un registro en `data_sync_log` con `status = 'completed'`

**Resultado:** 
- ✅ Las métricas se calculan **automáticamente** sin intervención manual
- ✅ Se ejecutan **inmediatamente** después de la sincronización
- ✅ Están **disponibles al instante** para el dashboard
- ✅ Funciona para **cualquier servicio** que sincronice datos (no solo el servicio Node.js)

**Nota:** El trigger funciona en la misma transacción, por lo que las métricas están disponibles tan pronto como se completa la sincronización.

## 📊 Métricas Calculadas

### Por Sprint:
- Total Story Points
- SP Completados / Carryover
- Total Tickets / Completados / Pendientes
- Impedimentos
- Lead Time Promedio
- Tickets por estado (To Do, In Progress, QA, Blocked, Done, Reopen)
- Tickets con SP / sin SP

### Por Desarrollador:
- Workload (SP iniciales)
- Velocity (SP completados)
- Carryover
- Tickets Asignados / Completados
- Lead Time Promedio
- Tickets por estado

## 🔍 Verificar que Funciona

### 1. Ver Métricas Recientes

```sql
-- En Supabase SQL Editor
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points,
  sm.total_tickets
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
ORDER BY sm.calculated_at DESC
LIMIT 10;
```

### 2. Verificar Trigger

```sql
-- Ver últimas sincronizaciones
SELECT 
  sync_type,
  status,
  sync_completed_at,
  issues_imported
FROM data_sync_log
ORDER BY sync_started_at DESC
LIMIT 5;
```

Si `status = 'completed'`, las métricas deberían haberse calculado automáticamente.

### 3. Calcular Manualmente (si es necesario)

```sql
-- Calcular métricas para un proyecto
SELECT * FROM calculate_all_metrics('OBD');
```

## 🛠️ Troubleshooting

### "function does not exist"

**Solución:** Ejecuta `04_calculate_metrics_functions.sql` nuevamente.

### "trigger does not exist"

**Solución:** Ejecuta `05_auto_calculate_metrics_trigger.sql` nuevamente.

### Las métricas no se calculan automáticamente

**Verifica:**
1. El trigger existe: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'after_sync_complete';`
2. La sincronización marca `status = 'completed'`
3. Hay datos en `issue_sprints`

**Solución manual:**
```sql
SELECT * FROM calculate_all_metrics('OBD');
```

### Métricas en 0 o incorrectas

**Verifica:**
- `issue_sprints` tiene datos
- `status_at_sprint_close` está poblado
- Los sprints tienen fechas correctas

## 📚 Documentación Completa

- [Instalación Detallada](supabase/INSTALL_METRICS.md)
- [Documentación de Cálculo](CALCULO_METRICAS_SUPABASE.md)
- [Script Node.js Alternativo](../scripts/calculate-metrics.js)

## ✅ Listo!

Una vez instalado:
- ✅ Las métricas se calcularán **automáticamente** después de cada sincronización
- ✅ Estarán **disponibles inmediatamente** para el dashboard
- ✅ No necesitas hacer nada más - todo es automático

### Verificar que Funciona

Después de la próxima sincronización, verifica:

```sql
-- Ver métricas más recientes (deberían ser de hace menos de 5 minutos)
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
WHERE sm.calculated_at > NOW() - INTERVAL '5 minutes'
ORDER BY sm.calculated_at DESC;
```

### Calcular Manualmente (si es necesario)

Si necesitas recalcular métricas manualmente en cualquier momento:

```bash
npm run calculate-metrics OBD
```

O desde SQL:

```sql
SELECT * FROM calculate_all_metrics('OBD');
```

## 📚 Documentación Adicional

- [Integración con Servicio de Sincronización](INTEGRACION_SYNC_SERVICE.md) - Cómo funciona la integración automática
- [Instalación Detallada](supabase/INSTALL_METRICS.md) - Guía completa con troubleshooting
- [Documentación de Cálculo](CALCULO_METRICAS_SUPABASE.md) - Detalles técnicos


