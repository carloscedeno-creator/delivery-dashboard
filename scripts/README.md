# Scripts de Utilidad

## 📊 calculate-metrics.js

Script para calcular métricas analíticas en Supabase, replicando la lógica de cálculo de Google Apps Script.

### Descripción

Este script calcula y guarda las métricas analíticas en Supabase:
- **Métricas de Sprint**: Tickets por estado, SP completados, carryover, impedimentos, lead time
- **Métricas de Desarrollador**: Workload, velocity, carryover por sprint

### Requisitos

1. Variables de entorno configuradas en `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

2. Base de datos con:
   - Esquema aplicado (ver `D:\Agile Dream Team\Cursor\GooglescriptsDelivery\docs\supabase\`)
   - Datos sincronizados desde Jira

### Uso

```bash
# Calcular métricas para proyecto OBD (default)
node scripts/calculate-metrics.js

# Calcular métricas para proyecto específico
node scripts/calculate-metrics.js OBD
```

### Qué Calcula

#### Métricas de Sprint (`sprint_metrics`):
- Total Story Points
- SP Completados
- SP Carryover
- Total Tickets
- Tickets Completados
- Tickets Pendientes
- Impedimentos
- Lead Time Promedio
- Tickets por estado (To Do, In Progress, QA, Blocked, Done, Reopen)
- Tickets con SP / sin SP

#### Métricas de Desarrollador (`developer_sprint_metrics`):
- Workload (SP iniciales asignados)
- Velocity (SP completados)
- Carryover (SP no completados)
- Tickets Asignados
- Tickets Completados
- Lead Time Promedio
- Tickets por estado

### Lógica de Cálculo

El script replica la lógica de Google Apps Script:

1. **Mapeo de Estados**: Normaliza estados de Jira a estados objetivo
2. **Estado Histórico**: Usa `status_at_sprint_close` para sprints cerrados
3. **SP Iniciales**: Usa `story_points_at_start` de `issue_sprints`
4. **Lead Time**: Calcula desde `dev_start_date` hasta `dev_close_date`

### Integración con Sincronización

Este script debe ejecutarse **después** de cada sincronización de Jira:

```bash
# En el servicio de sincronización, después de sync:
node scripts/calculate-metrics.js OBD
```

O integrarlo en el servicio de sincronización para que se ejecute automáticamente.

### Troubleshooting

**Error: "Proyecto no encontrado"**
- Verifica que el proyecto existe en Supabase
- Verifica que el `project_key` es correcto (case-sensitive)

**Error: "No se encontraron sprints"**
- Verifica que hay sprints en la base de datos
- Verifica que los sprints están asociados al proyecto correcto

**Métricas en 0 o incorrectas**
- Verifica que `issue_sprints` tiene datos
- Verifica que `status_at_sprint_close` y `story_points_at_start` están poblados
- Revisa los logs del script para ver qué está procesando


