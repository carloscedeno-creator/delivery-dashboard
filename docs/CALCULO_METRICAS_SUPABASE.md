# Cálculo de Métricas Analíticas en Supabase

## 📋 Resumen

Este documento describe cómo replicar la estructura analítica de los Google Sheets en Supabase. Los spreadsheets calculan métricas complejas que necesitan ser replicadas en la base de datos.

## 🔍 Análisis de la Estructura Analítica Actual

### Métricas Calculadas en Google Apps Script

#### 1. **Métricas por Sprint** (`calculateSprintMetrics()`)

**Datos calculados:**
- Tickets por estado (To Do, Reopen, In Progress, QA, Blocked, Done)
  - Todos los tickets
  - Solo tickets con SP > 0
  - Solo tickets sin SP
- Sprint Summary:
  - SP Completados (Done/Dev Done)
  - SP Pendientes (Carryover)
  - SP Totales Planificados
  - Impedimentos No Resueltos
  - Lead Time Promedio (días)
- Contribución por Desarrollador (tickets por estado)

**Lógica clave:**
- Usa `getHistoricalStatusForSprint()` para obtener estado histórico
- Usa `getInitialSPForSprint()` para obtener SP iniciales del sprint
- Mapea estados de Jira a estados normalizados (TARGET_STATUSES)
- Calcula lead time desde "Fecha Inicio Dev" hasta "Fecha Cierre Dev"

#### 2. **Métricas por Desarrollador** (`calculateDeveloperMetrics()`)

**Datos calculados:**
- Carga de Trabajo (SP Inicial) - SP asignados al inicio del sprint
- Velocidad (SP Completados) - SP completados en el sprint
- Tickets Asignados
- Carryover (SP) - SP no completados
- Lead Time Promedio (días)

**Lógica clave:**
- Agrupa tickets por desarrollador y sprint
- Usa SP iniciales del sprint (no SP actuales)
- Calcula velocidad solo de tickets completados

#### 3. **Métricas Globales** (`calculateGlobalMetrics()`)

**Datos calculados:**
- Lead Time Promedio (días)
- MTTR Promedio (días) - Solo para Bugs
- SP Consumidos (Velocity)
- SP por Consumir (Carry-over)
- Métricas por desarrollador (agregadas)

## 🎯 Estrategia de Implementación

### Opción 1: Funciones SQL en Supabase (Recomendada)

**Ventajas:**
- ✅ Ejecución rápida (en la base de datos)
- ✅ Automatizable con triggers o funciones
- ✅ Consistente y confiable
- ✅ No requiere código adicional

**Implementación:**
Crear funciones SQL que calculen las métricas basándose en las tablas existentes.

### Opción 2: Script Node.js Separado

**Ventajas:**
- ✅ Más fácil de mantener y depurar
- ✅ Puede usar la misma lógica de Google Apps Script
- ✅ Más flexible para cambios

**Implementación:**
Crear un módulo `metrics-calculator.js` que se ejecute después de cada sincronización.

### Opción 3: Híbrida (SQL + Node.js)

**Estrategia:**
- Funciones SQL para cálculos simples
- Script Node.js para lógica compleja (mapeo de estados, cálculos históricos)

## 📊 Mapeo de Estados

El código de Google Apps Script mapea estados de Jira a estados normalizados:

```javascript
TARGET_STATUSES = ['To Do', 'Reopen', 'In Progress', 'QA', 'Blocked', 'Done']

function mapToTargetStatus(jiraStatus) {
  // Done: 'done', 'development done', 'resolved', 'closed', 'finished'
  // Blocked: 'blocked', 'impediment'
  // In Progress: 'in progress', 'in development', 'doing', 'desarrollo'
  // Reopen: 'reopen'
  // QA: 'qa', 'test', 'review', 'staging', 'testing', 'compliance check'
  // To Do: 'to do', 'backlog', 'pendiente'
}
```

**Necesitamos:**
- Crear una función SQL equivalente
- O una tabla de mapeo de estados

## 🔧 Funciones Clave a Replicar

### 1. `getHistoricalStatusForSprint(ticket, sprintName, sprintFotoDate)`

**Lógica:**
- Si no hay foto (sprint activo): usa estado actual
- Si hay foto: busca en "Estatus por Sprint (JSON)" o "Historical Statuses (JSON)"
- Fallback: 'N/A (Sin Foto)'

**En Supabase:**
- Usar `issue_sprints.status_at_sprint_close`
- Para sprint activo: usar `issues.current_status`

### 2. `getInitialSPForSprint(ticket, sprintName)`

**Lógica:**
- Busca en "Historical SPs (JSON)" el SP inicial del sprint
- Si el ticket fue creado después del inicio del sprint: 0 SP
- Si no hay histórico: usa SP actual (para tickets antiguos)

**En Supabase:**
- Usar `issue_sprints.story_points_at_start`
- Calcular basándose en `issue_history` si no está disponible

### 3. `mapToTargetStatus(jiraStatus)`

**Lógica:**
- Normaliza estados de Jira a estados estándar
- Case-insensitive
- Múltiples variantes por estado

**En Supabase:**
- Crear función SQL `map_to_target_status(status_name)`
- O tabla de mapeo `status_mapping`

## 📝 Plan de Implementación

### Fase 1: Función de Mapeo de Estados

```sql
CREATE OR REPLACE FUNCTION map_to_target_status(jira_status TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalizar estado
  jira_status := LOWER(TRIM(jira_status));
  
  -- Mapear a estados objetivo
  IF jira_status IN ('done', 'development done', 'resolved', 'closed', 'finished') THEN
    RETURN 'Done';
  ELSIF jira_status IN ('blocked', 'impediment') THEN
    RETURN 'Blocked';
  ELSIF jira_status LIKE '%in progress%' OR jira_status IN ('in development', 'doing', 'desarrollo') THEN
    RETURN 'In Progress';
  ELSIF jira_status LIKE '%reopen%' THEN
    RETURN 'Reopen';
  ELSIF jira_status LIKE '%qa%' OR jira_status LIKE '%test%' OR jira_status LIKE '%review%' OR jira_status LIKE '%staging%' THEN
    RETURN 'QA';
  ELSIF jira_status IN ('to do', 'backlog') OR jira_status LIKE '%pendiente%' THEN
    RETURN 'To Do';
  ELSE
    RETURN 'QA'; -- Default
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Fase 2: Función para Calcular Métricas de Sprint

```sql
CREATE OR REPLACE FUNCTION calculate_sprint_metrics(sprint_uuid UUID)
RETURNS VOID AS $$
DECLARE
  -- Variables para métricas
  total_sp INTEGER := 0;
  completed_sp INTEGER := 0;
  carryover_sp INTEGER := 0;
  total_tickets INTEGER := 0;
  completed_tickets INTEGER := 0;
  -- ... más variables
BEGIN
  -- Calcular métricas basándose en issue_sprints
  -- Insertar en sprint_metrics
END;
$$ LANGUAGE plpgsql;
```

### Fase 3: Script Node.js para Cálculo Complejo

Si la lógica es muy compleja, crear un script que:
1. Obtenga todos los sprints
2. Para cada sprint, calcule métricas
3. Guarde en `sprint_metrics` y `developer_sprint_metrics`

## 🚀 Implementación Completada

1. ✅ Analizar lógica de cálculo (completado)
2. ✅ Crear función SQL de mapeo de estados (ver `04_calculate_metrics_functions.sql`)
3. ✅ Crear función/procedimiento para calcular métricas de sprint
4. ✅ Crear función/procedimiento para calcular métricas de desarrollador
5. ✅ Crear script Node.js (`scripts/calculate-metrics.js`)
6. ⏳ Integrar cálculo después de sincronización
7. ⏳ Probar y validar resultados

## 🚀 Instalación Rápida

**La mejor opción es usar funciones SQL con trigger automático:**

1. **Aplicar funciones SQL:**
   - Ve a Supabase Dashboard → SQL Editor
   - Ejecuta `docs/supabase/04_calculate_metrics_functions.sql`

2. **Aplicar trigger automático:**
   - En el mismo SQL Editor
   - Ejecuta `docs/supabase/05_auto_calculate_metrics_trigger.sql`

3. **Verificar instalación:**
   ```bash
   node scripts/test-metrics-calculation.js OBD
   ```

**¡Listo!** Las métricas se calcularán automáticamente después de cada sincronización.

Ver [INSTALL_METRICS.md](supabase/INSTALL_METRICS.md) para instrucciones detalladas.

## 📝 Cómo Usar

### Opción 1: Usar Funciones SQL (Recomendado)

```sql
-- Calcular métricas para un sprint específico
SELECT calculate_sprint_metrics('sprint-uuid-here');

-- Calcular métricas para un desarrollador en un sprint
SELECT calculate_developer_sprint_metrics('developer-uuid', 'sprint-uuid');

-- Calcular todas las métricas de un proyecto
SELECT * FROM calculate_all_metrics('OBD');
```

### Opción 2: Usar Script Node.js

```bash
# Calcular métricas para proyecto OBD
node scripts/calculate-metrics.js OBD
```

### Aplicar Funciones SQL

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta el archivo `docs/supabase/04_calculate_metrics_functions.sql`
3. Las funciones estarán disponibles para usar

### Integrar con Sincronización

**Opción A: Trigger automático (recomendado)**
```sql
-- Crear trigger que calcule métricas después de sincronización
CREATE OR REPLACE FUNCTION trigger_calculate_metrics_after_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    PERFORM calculate_all_metrics(
      (SELECT project_key FROM projects WHERE id = NEW.project_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_sync_complete
AFTER INSERT OR UPDATE ON data_sync_log
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trigger_calculate_metrics_after_sync();
```

**Opción B: Ejecutar manualmente después de sync**
```bash
# En el servicio de sincronización, después de sync exitoso:
node scripts/calculate-metrics.js OBD
```

## 📚 Referencias

- [Google Apps Script - calculateSprintMetrics()](../../GooglescriptsDelivery/Code.gs#L748)
- [Google Apps Script - calculateDeveloperMetrics()](../../GooglescriptsDelivery/Code.gs#L1009)
- [Esquema Supabase - sprint_metrics](../../GooglescriptsDelivery/docs/supabase/01_create_schema.sql#L174)


