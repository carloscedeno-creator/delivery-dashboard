# 📋 PRD: Delivery Dashboard

**Versión:** 2.0  
**Última actualización:** 2024-12-19  
**Estado:** Activo  
**Framework:** Ralph-Compounding / Agentic Engineering

---

## 🎯 Mission Statement

Dashboard React para visualizar métricas de delivery en tiempo real, sincronizado automáticamente desde Jira a Supabase. **Objetivo:** Abrir el dashboard y ver la data actualizada automáticamente, sin ejecutar nada manualmente.

**Framework de Desarrollo:** El proyecto utiliza el Framework Ralph-Compounding / Agentic Engineering para desarrollo estructurado con IA, maximizando la efectividad del desarrollo asistido por IA mediante PRD-First Development, arquitectura modular de reglas, y System Evolution tracking.

---

## 👥 Target Users

1. **Product Managers (PMs)** - Visualizar métricas de proyectos y sprints
2. **Engineering Managers** - Monitorear capacidad del equipo y carga de trabajo
3. **Developers** - Ver métricas individuales de performance
4. **Stakeholders** - Vista general de KPIs de delivery
5. **AI Agents** - Desarrollo autónomo usando Ralph agent loop

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

### Development Framework
- **Agentic Engineering:** Framework Ralph-Compounding
- **Autonomous Agent:** Ralph (Amp-based agent loop)
- **PRD-First:** Desarrollo basado en PRD y user stories atomizadas
- **System Evolution:** Tracking de bugs y mejoras continuas
- **Context Reset:** Separación entre planificación y ejecución

### Data Flow
```
Jira API → jira-supabase-sync (cada 30 min) → Supabase → Dashboard (React)
```

### Development Workflow
```
PRD → User Stories → Ralph Agent Loop → Implementation → System Evolution
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

### 9. Autonomous Development
- **Ralph Agent Loop:** Desarrollo autónomo usando Amp
- **PRD Management:** Generación y conversión de PRDs a formato ejecutable
- **System Evolution:** Tracking automático de bugs y mejoras
- **Progress Tracking:** Logs de iteraciones y aprendizajes

---

## 📊 Data Sources

### Primary: Supabase
- `sprints` - Sprints de Jira
- `issues` - Issues/tickets de Jira
- `squads` - Equipos/squads
- `developers` - Desarrolladores
- `v_sprint_metrics_complete` - Vista de métricas de sprint
- `v_developer_sprint_metrics_complete` - Vista de métricas por desarrollador
- `status_definitions` - Definiciones centralizadas de estatus (usado por funciones RPC)
- `sprint_scope_changes` - Tracking de cambios de scope durante sprints

### Sync: Jira API
- Sincronización automática cada 30 minutos
- Servicio: `jira-supabase-sync`
- Retry con exponential backoff para resiliencia ante rate limiting
- Scope change detection automático durante sync

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

## 🧠 Development Architecture

### Framework Ralph-Compounding

El proyecto utiliza el Framework Ralph-Compounding / Agentic Engineering para maximizar la efectividad del desarrollo asistido por IA:

#### 1. PRD-First Development
- **Fuente de Verdad:** `/specs/prd.md` - PRD principal del proyecto
- **User Stories:** `/specs/stories.json` - Stories atomizadas con Acceptance Criteria binarios
- **Constitución Global:** `.cursorrules` - Tech stack, estándares, referencias (<200 líneas)

#### 2. Modular Rules Architecture
- **Referencias On-Demand:** `/reference/` - Reglas especializadas cargadas solo cuando son relevantes
  - `api_guidelines.md` - Patrones de API y Supabase
  - `ui_components.md` - Componentes React y patrones UI
  - `database_schema.md` - Esquema Supabase y funciones RPC
  - `deployment.md` - GitHub Pages y Edge Functions
  - `configuration.md` - Variables de entorno y setup
  - `troubleshooting.md` - Errores comunes y soluciones
  - `metrics_calculations.md` - Fórmulas de KPIs
  - `jira_integration.md` - Sync process y Jira API

#### 3. Memory Architecture
- **Corto Plazo:** `/logs/progress.txt` - Iteraciones recientes y progreso
- **Largo Plazo:** `/src/**/agents.md` - Conocimiento tácito por carpeta
  - `src/services/agents.md` - Patrones de servicios y bugs evitados
  - `src/components/agents.md` - Patrones de componentes
  - `src/utils/agents.md` - Utilidades y helpers
  - `jira-supabase-sync/src/agents.md` - Patrones de sync

#### 4. System Evolution
- **Bug Tracking:** Cada bug documentado en `docs/ERROR_*.md`
- **Rule Updates:** Reglas actualizadas en `.cursorrules` y `agents.md`
- **Prevention:** Checklist de verificación para prevenir recurrencia

#### 5. Context Reset Workflow
- **PPRE Cycle:** Prime → Plan → RESET → Execute
- **Separación:** Planificación y ejecución en conversaciones separadas
- **Fresh Context:** Cada ejecución con contexto limpio

### Ralph Autonomous Agent

Sistema de desarrollo autónomo usando Amp:

- **Location:** `scripts/ralph/`
- **Scripts:** `ralph.sh` (bash) y `ralph.ps1` (PowerShell)
- **Skills:** Instaladas globalmente en `~/.config/amp/skills/`
  - `prd` - Generación de PRDs
  - `ralph` - Conversión de PRDs a formato ejecutable
- **Workflow:**
  1. Crear PRD usando skill `prd`
  2. Convertir a `prd.json` usando skill `ralph` (guardar en `scripts/ralph/prd.json`)
  3. Ejecutar `ralph.ps1` para desarrollo autónomo
  4. Ralph implementa stories una por una
  5. Actualiza `progress.txt` y `prd.json` automáticamente

---

## 📈 Success Metrics

### Funcionalidad
- ✅ Sincronización automática funcionando
- ✅ Métricas calculadas automáticamente
- ✅ Dashboard carga data sin intervención manual
- ✅ Usuarios pueden acceder y ver métricas relevantes

### Desarrollo
- ✅ Framework Ralph-Compounding implementado
- ✅ Ralph agent configurado y funcional
- ✅ System Evolution tracking activo
- ✅ Documentación estructurada y accesible
- ✅ Bugs documentados y prevención implementada

---

## 🔗 Referencias

### Proyecto
- **Sync Service:** `jira-supabase-sync/README.md`
- **Database Schema:** `/reference/database_schema.md`
- **API Guidelines:** `/reference/api_guidelines.md`
- **Deployment:** `/reference/deployment.md`

### Framework
- **Constitución:** `.cursorrules` y `AGENTS.md`
- **PRD:** `/specs/prd.md` (este archivo)
- **Stories:** `/specs/stories.json`
- **Ralph Setup:** `docs/RALPH_SETUP.md`
- **System Evolution:** `docs/SYSTEM_EVOLUTION.md`
- **PPRE Workflow:** `docs/WORKFLOW_PPRE.md`
- **Context Reset:** `docs/CONTEXT_RESET_WORKFLOW.md`

---

## 📋 Cambios desde v1.0

### Arquitecturales
1. **Framework Ralph-Compounding:** Implementación completa del framework de desarrollo asistido por IA
2. **Ralph Agent:** Sistema de desarrollo autónomo configurado
3. **System Evolution:** Tracking de bugs y mejoras continuas
4. **Modular Rules:** Arquitectura de reglas on-demand

### Funcionales
1. **Status Unification:** Sistema centralizado de estatus usando funciones RPC que consultan `status_definitions`
2. **Scope Changes Tracking:** Detección automática de cambios de scope en sprints (tabla `sprint_scope_changes`)
3. **Retry Logic:** Exponential backoff para llamadas a Jira API (implementado en `retry-helper.js`)
4. **Error Documentation:** Documentación completa de errores y fixes en `docs/ERROR_*.md`

### Estructurales
1. **Nueva estructura:** `/specs/`, `/reference/`, `/logs/`
2. **Agents.md files:** Memoria a largo plazo en carpetas clave
3. **Documentación:** Reorganización y consolidación de documentación
