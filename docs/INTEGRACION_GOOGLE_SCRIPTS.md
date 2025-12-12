# Integración con Google Scripts Delivery

## 📋 Resumen

Este documento describe la integración entre el proyecto **GooglescriptsDelivery** (scripts de Google Apps Script y base de datos Supabase) y el **delivery-dashboard** (dashboard React/Vite).

## 🏗️ Arquitectura de los Proyectos

### 1. GooglescriptsDelivery
**Ubicación:** `D:\Agile Dream Team\Cursor\GooglescriptsDelivery`

#### Componentes Principales:

1. **Google Apps Script (`Code.gs`)**
   - Scripts que se conectan directamente a Jira API
   - Genera reportes en Google Sheets:
     - `JiraData` - Datos crudos de Jira
     - `MetricasSprint` - Métricas por sprint
     - `MetricasDesarrollador` - Métricas por desarrollador
     - `MetricasGlobales` - Métricas globales del equipo
     - `Data_Looker_Sprints` - Datos para Looker Studio (sprints)
     - `Data_Looker_Devs` - Datos para Looker Studio (desarrolladores)
     - `Data_Looker_Epics` - Datos para Looker Studio (epics)
     - `Data_Capacity_Planning` - Datos de planificación de capacidad

2. **Base de Datos Supabase**
   - Esquema normalizado en PostgreSQL
   - Tablas principales:
     - `projects` - Proyectos de Jira
     - `developers` - Desarrolladores
     - `epics` - Epics de Jira
     - `sprints` - Sprints
     - `issues` - Tickets (Stories, Bugs)
     - `issue_sprints` - Relación tickets-sprints
     - `issue_history` - Historial de cambios
     - `sprint_metrics` - Métricas por sprint
     - `developer_sprint_metrics` - Métricas por desarrollador
     - `global_metrics` - Métricas globales

3. **Servicio de Sincronización (`jira-supabase-sync/`)**
   - Servicio Node.js que sincroniza Jira → Supabase
   - Ejecuta cada 30 minutos
   - Procesa issues, sprints, developers, epics
   - Calcula métricas automáticamente

### 2. Delivery Dashboard
**Ubicación:** `d:\Agile Dream Team\Antigravity\delivery-dashboard`

#### Componentes Principales:

1. **Dashboard React/Vite**
   - Visualización de métricas de delivery
   - Componentes:
     - `Dashboard.jsx` - Dashboard principal
     - `DeliveryRoadmapView.jsx` - Vista de roadmap de delivery
     - `ProductRoadmapView.jsx` - Vista de roadmap de producto
     - `GanttChart.jsx` - Gráfico de Gantt
     - `KPICard.jsx` - Tarjetas de KPIs
     - `DeveloperWorkload.jsx` - Carga de trabajo por desarrollador
     - `AllocationChart.jsx` - Gráfico de asignación

2. **Fuentes de Datos Actuales:**
   - Google Sheets (Delivery Roadmap, Product Roadmap)
   - Jira API (a través de proxy backend)
   - Notion API

## 🔗 Oportunidades de Integración

### Opción 1: Integración Directa con Supabase (Recomendada)

**Ventajas:**
- ✅ Datos normalizados y estructurados
- ✅ Consultas SQL eficientes
- ✅ Historial completo de cambios
- ✅ Métricas pre-calculadas
- ✅ Escalable y performante

**Implementación:**

1. **Agregar cliente de Supabase al dashboard:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Crear servicio de Supabase:**
   ```javascript
   // src/utils/supabaseApi.js
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   
   // Funciones para obtener métricas
   export const getSprintMetrics = async (projectKey = 'OBD') => {
     const { data, error } = await supabase
       .from('v_sprint_metrics_complete')
       .select('*')
       .eq('project_name', projectKey)
       .order('end_date', { ascending: false });
     
     if (error) throw error;
     return data;
   };
   
   export const getDeveloperMetrics = async (projectKey = 'OBD') => {
     const { data, error } = await supabase
       .from('v_developer_sprint_metrics_complete')
       .select('*')
       .eq('project_name', projectKey)
       .order('sprint_name', { ascending: false });
     
     if (error) throw error;
     return data;
   };
   ```

3. **Actualizar componentes para usar Supabase:**
   - Reemplazar llamadas a Google Sheets con consultas a Supabase
   - Usar las vistas pre-calculadas para mejor performance

### Opción 2: Integración con Google Sheets (Actual)

**Ventajas:**
- ✅ Ya implementado
- ✅ Fácil de visualizar y editar manualmente
- ✅ Compatible con Looker Studio

**Desventajas:**
- ❌ Datos no normalizados
- ❌ Limitaciones de Google Sheets API
- ❌ Más lento para grandes volúmenes

### Opción 3: Integración Híbrida

**Estrategia:**
- Usar Supabase para métricas y datos históricos
- Usar Google Sheets para roadmaps y planificación
- Sincronizar ambos cuando sea necesario

## 📊 Flujo de Datos Propuesto

```
┌─────────────────┐
│   Jira API      │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Google Apps      │  │ Jira-Supabase   │
│ Script           │  │ Sync Service    │
│ (Code.gs)        │  │ (Node.js)       │
└────────┬────────┘  └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌─────────────────┐
│ Google Sheets    │  │ Supabase DB     │
│ (Reportes)       │  │ (Normalizado)   │
└────────┬────────┘  └────────┬────────┘
         │                     │
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Delivery Dashboard│
         │   (React/Vite)    │
         └──────────────────┘
```

## 🚀 Plan de Implementación

### Fase 1: Configuración Inicial
- [ ] Agregar Supabase al dashboard
- [ ] Configurar variables de entorno
- [ ] Crear servicio de Supabase API
- [ ] Configurar Row Level Security (RLS) en Supabase

### Fase 2: Migración de Datos
- [ ] Migrar datos de Google Sheets a Supabase (si es necesario)
- [ ] Verificar integridad de datos
- [ ] Configurar sincronización automática

### Fase 3: Actualización de Componentes
- [ ] Actualizar `Dashboard.jsx` para usar Supabase
- [ ] Actualizar `DeveloperWorkload.jsx` para usar métricas de Supabase
- [ ] Actualizar `GanttChart.jsx` para usar datos de sprints
- [ ] Mantener Google Sheets para roadmaps

### Fase 4: Optimización
- [ ] Implementar caché de datos
- [ ] Agregar paginación para grandes volúmenes
- [ ] Optimizar consultas SQL
- [ ] Agregar indicadores de carga

## 📝 Configuración Requerida

### Variables de Entorno

Agregar al archivo `.env` del dashboard:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Jira (si se mantiene integración directa)
VITE_JIRA_PROXY_URL=https://tu-proxy.com/api/jira

# Google Sheets (mantener para roadmaps)
VITE_GOOGLE_SHEETS_PROXY=https://sheets-proxy.carlos-cedeno.workers.dev
```

### Configuración de Supabase RLS

Asegurarse de que las políticas RLS permitan lectura pública (o autenticada) de las vistas de métricas:

```sql
-- Permitir lectura pública de métricas (ajustar según necesidades de seguridad)
CREATE POLICY "Allow public read access to sprint metrics"
ON v_sprint_metrics_complete
FOR SELECT
USING (true);
```

## 🔍 Consultas Útiles

### Obtener métricas de sprint actual

```sql
SELECT * FROM v_sprint_metrics_complete
WHERE project_name = 'OBD'
  AND state = 'active'
ORDER BY start_date DESC
LIMIT 1;
```

### Obtener velocidad por desarrollador

```sql
SELECT 
    developer_name,
    sprint_name,
    workload_sp,
    velocity_sp,
    carryover_sp,
    avg_lead_time_days
FROM v_developer_sprint_metrics_complete
WHERE project_name = 'OBD'
ORDER BY sprint_name DESC, developer_name;
```

### Obtener issues por estado

```sql
SELECT 
    current_status,
    COUNT(*) as count,
    SUM(current_story_points) as total_sp
FROM issues
WHERE project_id = (SELECT id FROM projects WHERE project_key = 'OBD')
GROUP BY current_status
ORDER BY count DESC;
```

## 📚 Referencias

- [Documentación de Supabase](https://supabase.com/docs)
- [Esquema de Base de Datos](./GooglescriptsDelivery/docs/supabase/README.md)
- [Servicio de Sincronización](./GooglescriptsDelivery/jira-supabase-sync/README.md)
- [Google Apps Script](./GooglescriptsDelivery/Code.gs)

## ⚠️ Notas Importantes

1. **Seguridad:**
   - Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend
   - Usar `SUPABASE_ANON_KEY` con políticas RLS apropiadas
   - Validar todas las consultas en el backend si es necesario

2. **Performance:**
   - Usar las vistas pre-calculadas en lugar de calcular métricas en el frontend
   - Implementar caché para consultas frecuentes
   - Considerar paginación para grandes datasets

3. **Sincronización:**
   - El servicio `jira-supabase-sync` debe ejecutarse regularmente
   - Monitorear logs de sincronización en `data_sync_log`
   - Verificar que los datos estén actualizados antes de mostrar

4. **Compatibilidad:**
   - Mantener Google Sheets para roadmaps y planificación
   - Usar Supabase para métricas y datos históricos
   - Sincronizar ambos cuando sea necesario

## 🎯 Próximos Pasos

1. Revisar y aprobar este plan de integración
2. Configurar Supabase en el dashboard
3. Crear servicio de Supabase API
4. Migrar componentes uno por uno
5. Probar y optimizar


