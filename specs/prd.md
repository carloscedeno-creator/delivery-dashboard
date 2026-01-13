# 📋 PRD: Delivery Dashboard

**Versión:** 1.0  
**Última actualización:** 2024-12-19  
**Estado:** Activo

---

## 🎯 Mission Statement

Dashboard React para visualizar métricas de delivery en tiempo real, sincronizado automáticamente desde Jira a Supabase. **Objetivo:** Abrir el dashboard y ver la data actualizada automáticamente, sin ejecutar nada manualmente.

---

## 👥 Target Users

1. **Product Managers (PMs)** - Visualizar métricas de proyectos y sprints
2. **Engineering Managers** - Monitorear capacidad del equipo y carga de trabajo
3. **Developers** - Ver métricas individuales de performance
4. **Stakeholders** - Vista general de KPIs de delivery

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** React 18.2 + Vite 5.1
- **Styling:** TailwindCSS
- **Charts:** Recharts 2.12
- **Icons:** Lucide React
- **PDF:** jsPDF + html2canvas

### Backend Stack
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Sync Service:** Node.js (jira-supabase-sync)
- **Deployment:** GitHub Pages

### Data Flow
```
Jira API → jira-supabase-sync (cada 30 min) → Supabase → Dashboard (React)
```

---

## 🎯 Core Features

### 1. Authentication & Authorization
- Login con email/password (Supabase Auth)
- Password recovery flow
- Role-based access control (RBAC)
- Permisos por módulo

### 2. Overall View
- **KPIs Principales (Cards):**
  - Delivery Success Score (promedio de todos los squads)
  - Development Quality Score (promedio de todos los squads)
  - Team Health Score (promedio de todos los squads)
  - Velocity promedio (últimos 6 sprints)
- **Resumen de Sprints Activos:**
  - Lista de sprints activos por squad
  - Progreso de cada sprint (SP Done / SP Goal)
  - Días restantes en sprint
  - Alertas visuales para sprints en riesgo
- **Timeline Unificado:**
  - Vista combinada de iniciativas de producto y sprints activos
  - Gantt chart simplificado con items críticos
- **Alertas Rápidas:**
  - Sprints con baja velocidad (< 70% del goal)
  - Issues bloqueados por squad
  - Sprints próximos a cerrar (últimos 3 días)

### 3. Delivery Metrics
- Delivery KPIs (Velocity, Cycle Time, Throughput)
- Quality KPIs (Rework Rate, Defect Rate)
- Team Health KPIs

### 4. Projects Metrics
- Métricas por squad y sprint
- Breakdown por Board State
- Scope Changes tracking
- PDF export

### 5. Developer Metrics
- Performance individual
- Dev Done Rate
- Story Points completados
- Workload visualization

### 6. Team Capacity
- Capacidad por squad
- SP Done tracking
- Sprint velocity
- Burndown charts

### 7. Product Roadmap
- Gantt Chart de iniciativas
- Product Department KPIs
- Timeline visualization

### 8. ENPS Survey
- Employee Net Promoter Score
- Survey management
- Results visualization

---

## 📊 Data Sources

### Primary: Supabase
- `sprints` - Sprints de Jira
- `issues` - Issues/tickets de Jira
- `squads` - Equipos/squads
- `developers` - Desarrolladores
- `v_sprint_metrics_complete` - Vista de métricas de sprint
- `v_developer_sprint_metrics_complete` - Vista de métricas por desarrollador

### Sync: Jira API
- Sincronización automática cada 30 minutos
- Servicio: `jira-supabase-sync`

---

## 🔐 Security & Permissions

### Roles
- **Admin** - Acceso completo
- **PM** - Delivery, Product, Projects Metrics
- **Developer** - Developer Metrics, Team Capacity
- **Viewer** - Solo lectura

### Permisos por Módulo
- Ver `src/config/permissions.js` para detalles

---

## 🚀 Deployment

- **Frontend:** GitHub Pages (`/delivery-dashboard/`)
- **Sync Service:** Vercel/Railway/Render (cron cada 30 min)
- **Database:** Supabase (PostgreSQL)

---

## 📈 Success Metrics

- ✅ Sincronización automática funcionando
- ✅ Métricas calculadas automáticamente
- ✅ Dashboard carga data sin intervención manual
- ✅ Usuarios pueden acceder y ver métricas relevantes

---

## 🔗 Referencias

- **Sync Service:** `jira-supabase-sync/README.md`
- **Database Schema:** `/reference/database_schema.md`
- **API Guidelines:** `/reference/api_guidelines.md`
- **Deployment:** `/reference/deployment.md`
