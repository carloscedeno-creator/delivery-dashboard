# Sprint Velocity Report - Guía de Implementación

## 📋 Resumen

Este módulo permite obtener y almacenar datos del Velocity Report de Jira, calculando:
- **Commitment**: Story points comprometidos al inicio del sprint
- **Completed**: Story points completados al final del sprint

Los datos se calculan desde los tickets en `issue_sprints` y su historial en `issue_history`.

## 🎯 Objetivo

Garantizar que tenemos datos precisos del velocity de cada sprint, mostrando:
- Story points comprometidos (al inicio del sprint)
- Story points completados (al final del sprint)
- Número de tickets comprometidos y completados

## 📊 Estructura de Datos

### Tabla Creada

**`sprint_velocity`**: Datos del velocity report por sprint
   - `sprint_id`: ID del sprint (FK a sprints)
   - `sprint_name`: Nombre del sprint
   - `start_date`: Fecha de inicio del sprint
   - `end_date`: Fecha de fin del sprint
   - `complete_date`: Fecha de cierre del sprint
   - `commitment`: Story points comprometidos al inicio
   - `completed`: Story points completados al final
   - `commitment_tickets`: Número de tickets con SP al inicio
   - `completed_tickets`: Número de tickets completados
   - `total_tickets`: Total de tickets en el sprint
   - `calculated_at`: Timestamp del cálculo
   - `updated_at`: Timestamp de última actualización

## 🚀 Uso

### 1. Aplicar Migración

Primero, aplicar la migración para crear la tabla:

```bash
# Desde Supabase Dashboard o usando psql
psql -h <supabase-host> -U postgres -d postgres -f jira-supabase-sync/migrations/create_sprint_velocity_table.sql
```

O desde el SQL Editor de Supabase, ejecutar el contenido del archivo `create_sprint_velocity_table.sql`.

### 2. Procesar Velocity Report

Procesar todos los sprints:

```bash
cd jira-supabase-sync
node scripts/process-sprint-velocity.js
```

Este script:
- Obtiene todos los sprints con "Sprint" en el nombre
- Calcula commitment desde `story_points_at_start` de `issue_sprints`
- Calcula completed desde `status_at_sprint_close` y estados completados
- Si no hay `status_at_sprint_close`, busca en `issue_history`
- Guarda los datos en `sprint_velocity`

### 3. Integración Automática

El procesamiento de velocity se ejecuta automáticamente después de cada sincronización completa de issues, asegurando que los datos estén siempre actualizados.

## 🔍 Cómo Funciona

### Cálculo de Commitment

1. Obtiene todos los tickets del sprint desde `issue_sprints`
2. Suma los `story_points_at_start` de todos los tickets
3. Si `story_points_at_start` no está disponible, usa `story_points` del issue

### Cálculo de Completed

1. Obtiene todos los tickets del sprint desde `issue_sprints`
2. Para cada ticket, verifica `status_at_sprint_close`
3. Si el estado es "completado" (DONE, CLOSED, etc.), suma sus story points
4. Si no hay `status_at_sprint_close`, busca en `issue_history` el último estado antes del cierre del sprint
5. Suma los story points de todos los tickets completados

### Estados Completados

Un ticket se considera completado si su estado es:
- `DONE`
- `DEVELOPMENT DONE`
- `DEV DONE`
- `CLOSED`
- `RESOLVED`
- `COMPLETED`
- Cualquier estado que contenga "DONE" (excepto "TO DO")

## 📈 Consultar Datos

### Obtener velocity de un sprint:

```sql
SELECT * FROM sprint_velocity 
WHERE sprint_id = '<sprint-id>';
```

### Obtener velocity de todos los sprints ordenados por fecha:

```sql
SELECT 
  sprint_name,
  start_date,
  end_date,
  commitment,
  completed,
  commitment_tickets,
  completed_tickets,
  total_tickets
FROM sprint_velocity 
ORDER BY end_date DESC;
```

### Comparar con datos de Jira Velocity Report:

```sql
SELECT 
  sv.sprint_name,
  sv.commitment as supabase_commitment,
  sv.completed as supabase_completed,
  -- Aquí puedes agregar los valores de Jira para comparar
  -- jira_commitment,
  -- jira_completed
FROM sprint_velocity sv
ORDER BY sv.end_date DESC;
```

## ⚠️ Limitaciones

1. **Dependencia de datos**: Requiere que `issue_sprints` tenga `story_points_at_start` y `status_at_sprint_close` completos
2. **Historial**: Si no hay `status_at_sprint_close`, depende de que `issue_history` esté completo
3. **Estados**: La detección de estados "completados" puede variar según la configuración de Jira
4. **Rendimiento**: El procesamiento puede ser lento para sprints con muchos tickets si necesita buscar en `issue_history`

## 🔧 Troubleshooting

### Los datos no se están generando

1. Verificar que la migración se aplicó correctamente
2. Verificar que `issue_sprints` tiene datos para los sprints
3. Verificar que `issue_sprints` tiene `story_points_at_start` y `status_at_sprint_close`

### Los datos parecen incorrectos

1. Verificar que `issue_sprints` tiene `story_points_at_start` correctos
2. Verificar que `status_at_sprint_close` refleja el estado real al cierre
3. Verificar que `issue_history` tiene todos los cambios de estado si se usa como fallback
4. Comparar con el Velocity Report nativo de Jira

### Commitment es 0 pero debería tener valor

1. Verificar que los tickets tienen story points asignados
2. Verificar que `story_points_at_start` está siendo capturado durante la sincronización
3. Verificar que los tickets estaban en el sprint al inicio

### Completed es 0 pero debería tener valor

1. Verificar que `status_at_sprint_close` está siendo capturado
2. Verificar que los estados "completados" están correctamente identificados
3. Verificar que `issue_history` tiene datos si se usa como fallback
4. Comparar con el Velocity Report nativo de Jira

## 📝 Notas

- Los datos se regeneran cada vez que se ejecuta el procesamiento
- Los datos antiguos se actualizan (upsert) en lugar de eliminarse
- El procesamiento es idempotente (puede ejecutarse múltiples veces sin problemas)
- Se procesan los últimos 20 sprints durante la sincronización automática para no sobrecargar

## 🔄 Comparación con Jira

Para comparar los datos con el Velocity Report de Jira, puedes usar el script:

```bash
npm run compare-velocity
```

Este script compara los datos de `sprint_velocity` con los valores del Velocity Report de Jira que proporcionaste.
