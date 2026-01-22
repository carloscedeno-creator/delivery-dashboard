# Jira Integration - Sync Process

**Última actualización:** 2024-12-19

---

## 🔄 Sync Flow

### Proceso Automático
```
Jira API → jira-supabase-sync (cada 30 min) → Supabase → Dashboard
```

### Frecuencia
- **Automático:** Cada 30 minutos
- **Manual:** Ejecutar sync cuando sea necesario

---

## 📦 Sync Service

### Ubicación
- **Código:** `jira-supabase-sync/`
- **Deploy:** Vercel/Railway/Render
- **Config:** `PROJECTS_CONFIG_LOCAL.json`

### Componentes Principales

#### Sync Multi
- **Archivo:** `src/sync/sync-multi.js`
- **Propósito:** Sync de múltiples proyectos
- **Integra:** Sprint closure processor, scope change detector

#### Issue Processor
- **Archivo:** `src/processors/issue-processor.js`
- **Propósito:** Transformar issues de Jira a formato Supabase
- **Detecta:** Scope changes automáticamente

#### Sprint Closure Processor
- **Archivo:** `src/processors/sprint-closure-processor.js`
- **Propósito:** Validar y procesar cierre de sprints
- **Valida:** Estado en Jira antes de marcar como cerrado

#### Scope Change Detector
- **Archivo:** `src/processors/scope-change-detector.js`
- **Propósito:** Detectar cambios de scope durante sprints
- **Tipos:** Added, Removed, Story Points Changed

---

## 🔁 Retry Logic

### Retry Helper
- **Archivo:** `jira-supabase-sync/src/utils/retry-helper.js`
- **Propósito:** Manejar rate limiting y errores temporales
- **Características:**
  - Exponential backoff
  - Respeta header `retry-after` (429)
  - Logging detallado

### Uso
```javascript
import { retryWithBackoff } from './utils/retry-helper.js';

const result = await retryWithBackoff(
  () => jiraClient.fetchAllIssues(projectKey),
  { maxRetries: 5 }
);
```

---

## 📊 Data Processing

### Issue Transformation
1. Obtener issues de Jira API
2. Transformar a formato Supabase (`issue-processor.js`)
3. Batch upsert en Supabase
4. Guardar relaciones (issue_sprints)
5. Detectar scope changes

### Sprint Processing
1. Obtener sprints de Jira
2. Validar cierre (sprint-closure-processor)
3. Guardar en Supabase
4. Actualizar métricas automáticamente (triggers)

---

## ⚠️ Anti-Patterns

### ❌ NO Hacer
- Llamar Jira API sin retry helper
- Procesar sprints sin validar cierre
- Ignorar rate limiting (429)

### ✅ SIEMPRE Hacer
- Usar retry helper para llamadas a Jira
- Validar estado de sprint antes de procesar
- Detectar scope changes durante sync
- Logging detallado de operaciones

---

## 🔗 Referencias

- Sync Service: `jira-supabase-sync/README.md`
- Retry Helper: `jira-supabase-sync/src/utils/retry-helper.js`
- Issue Processor: `jira-supabase-sync/src/processors/issue-processor.js`
