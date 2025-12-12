# 🔍 Análisis: Por qué ODSO-328 no está en Supabase

## 📊 Resumen del Problema

**Situación:**
- Jira muestra **13 work items** para Himani en el sprint actual de Core
- Supabase tiene **11 issues** de Himani en el sprint
- **ODSO-328** ("Incomplete data in Redshift ETL") **NO está en Supabase**

## 🔍 Análisis Realizado

### 1. Configuración de Sincronización

**JQL Query configurado para Core:**
```jql
Project = "ODSO" AND issuetype != "Sub-task" ORDER BY created DESC
```

Este query debería capturar ODSO-328 si:
- ✅ Pertenece al proyecto ODSO
- ✅ No es una Sub-task
- ✅ Fue creado/actualizado después de la última sincronización

### 2. Tickets Recientes en Supabase

Se encontraron tickets **más recientes** que SÍ están en Supabase:
- **ODSO-327** (creado 2025-12-11) ✅
- **ODSO-326** (creado 2025-12-11) ✅
- **ODSO-325** (creado 2025-12-11) ✅
- **ODSO-324** (creado 2025-12-11) ✅
- **ODSO-323** (creado 2025-12-11) ✅
- **ODSO-322** (creado 2025-12-11) ✅
- **ODSO-321** (creado 2025-12-11) ✅

**ODSO-328** (mencionado en Jira) ❌ **NO está**

### 3. Logs de Sincronización

- Tabla encontrada: `data_sync_log`
- **Problema**: No hay registros de sincronización
- Esto indica que:
  - El servicio no se ha ejecutado recientemente, O
  - No está registrando logs correctamente

## 🎯 Posibles Causas

### Causa 1: Sincronización Incremental Incompleta
La sincronización incremental usa:
```jql
Project = "ODSO" AND issuetype != "Sub-task" AND updated >= "YYYY-MM-DD" ORDER BY created DESC
```

**Problema potencial:**
- Si ODSO-328 fue creado pero **no actualizado** después de la última sync, podría no capturarse
- La sincronización incremental solo busca tickets **actualizados**, no todos los tickets nuevos

### Causa 2: Ticket Creado Después de la Última Sync
- Si ODSO-328 fue creado después de la última sincronización, no estará en Supabase
- Necesita esperar la próxima sincronización o forzar una sync completa

### Causa 3: Problema con el Filtro JQL
Aunque es poco probable, ODSO-328 podría:
- Estar en un proyecto diferente
- Ser una Sub-task (aunque la imagen muestra que no lo es)
- Tener algún campo que lo excluya del filtro

## ✅ Soluciones Recomendadas

### Solución 1: Forzar Sincronización Completa (Recomendado)

Ejecutar una sincronización completa en lugar de incremental:

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
node src/run-once.js
```

O si está en producción, ejecutar el servicio manualmente.

### Solución 2: Verificar en Jira

Verificar que ODSO-328 cumple con:
1. **Project = "ODSO"** ✅
2. **issuetype != "Sub-task"** ✅
3. **Fecha de creación/actualización** reciente

### Solución 3: Ajustar JQL Query (Si es necesario)

Si ODSO-328 tiene características especiales, podría necesitarse ajustar el JQL:

```sql
-- Actualizar JQL en Supabase
UPDATE squad_config 
SET jql_query = 'Project = "ODSO" AND issuetype != "Sub-task" ORDER BY created DESC'
WHERE squad_id = '9905be65-9987-4f93-83eb-90a6c2ae0e8d';
```

### Solución 4: Mejorar Sincronización Incremental

El código actual de `fetchUpdatedIssues` solo busca tickets **actualizados**. Para capturar todos los tickets nuevos, podría mejorarse para buscar también por `created >= date`.

**Código actual:**
```javascript
const query = `${baseQuery} AND updated >= "${dateStr}" ${orderByClause}`;
```

**Mejora sugerida:**
```javascript
const query = `${baseQuery} AND (updated >= "${dateStr}" OR created >= "${dateStr}") ${orderByClause}`;
```

## 📋 Checklist de Verificación

- [ ] Verificar en Jira que ODSO-328 existe y pertenece a ODSO
- [ ] Verificar fecha de creación de ODSO-328
- [ ] Ejecutar sincronización completa manualmente
- [ ] Verificar logs de sincronización después de ejecutar
- [ ] Confirmar que ODSO-328 aparece en Supabase después de la sync
- [ ] Si persiste, revisar el código de sincronización incremental

## 🔧 Scripts de Diagnóstico

Los siguientes scripts están disponibles para diagnóstico:

1. **`scripts/query-himani-core.js`** - Lista tickets de Himani en sprint actual
2. **`scripts/compare-himani-jira.js`** - Compara tickets de Supabase vs Jira
3. **`scripts/find-missing-issues.js`** - Busca tickets faltantes
4. **`scripts/check-sync-config.js`** - Verifica configuración de sincronización

## 📝 Notas Adicionales

- El servicio de sincronización se ejecuta cada 30 minutos (configurable)
- La sincronización incremental solo captura tickets **actualizados** desde la última sync
- Para tickets nuevos que no se han actualizado, se necesita una sync completa
- Los logs de sincronización están en la tabla `data_sync_log` (actualmente vacía)
