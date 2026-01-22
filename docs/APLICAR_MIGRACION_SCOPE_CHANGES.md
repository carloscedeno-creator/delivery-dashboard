# 📋 Aplicar Migración: Tabla sprint_scope_changes

## 🎯 Objetivo

Crear la tabla `sprint_scope_changes` para rastrear cambios de scope durante sprints (issues agregados, removidos, cambios en SP).

---

## ✅ Estado Actual

- ✅ Migración SQL creada: `jira-supabase-sync/migrations/create_sprint_scope_changes_table.sql`
- ✅ Detector implementado: `jira-supabase-sync/src/processors/scope-change-detector.js`
- ✅ Integrado en sync: `jira-supabase-sync/src/processors/issue-processor.js`
- ✅ API implementada: `src/utils/projectMetricsApi.js` - función `getSprintScopeChanges`
- ✅ UI implementada: `src/components/ProjectsMetrics.jsx` - muestra scope changes
- ⏳ **PENDIENTE:** Aplicar migración SQL en Supabase

---

## 🚀 Pasos para Aplicar la Migración

### Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new
2. Se abrirá el editor SQL

### Paso 2: Cargar el Archivo SQL

**Opción A: Copiar y Pegar (Recomendado)**

1. Abre el archivo: `jira-supabase-sync/migrations/create_sprint_scope_changes_table.sql`
2. Selecciona todo el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el editor SQL de Supabase (Ctrl+V)

**Opción B: Cargar desde Archivo**

1. En el editor SQL de Supabase, busca el botón "Upload" o "Load file"
2. Selecciona el archivo: `create_sprint_scope_changes_table.sql`

### Paso 3: Ejecutar el SQL

1. Haz clic en el botón **"Run"** o presiona `Ctrl+Enter`
2. Espera a que se ejecute (debería tomar menos de 1 minuto)
3. Verás el progreso y resultados en la parte inferior

---

## ✅ Verificar que Funcionó

### Verificación 1: Tabla Creada

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la tabla existe
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'sprint_scope_changes';
```

Deberías ver la tabla `sprint_scope_changes` en los resultados.

### Verificación 2: Vista Creada

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la vista existe
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'sprint_scope_changes_summary';
```

Deberías ver la vista `sprint_scope_changes_summary` en los resultados.

### Verificación 3: Índices Creados

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sprint_scope_changes';
```

Deberías ver múltiples índices creados.

### Verificación 4: Probar Vista

Ejecuta en Supabase SQL Editor:

```sql
-- Probar la vista con datos reales
SELECT *
FROM sprint_scope_changes_summary
ORDER BY start_date DESC
LIMIT 5;
```

Deberías obtener resultados sin errores (puede estar vacío si no hay cambios aún).

### Verificación 5: Probar en Dashboard

1. Ve al dashboard: http://localhost:5173 (o tu URL)
2. Navega a **Projects Metrics**
3. Selecciona un squad y sprint
4. Verifica que la sección **"Scope Changes"** se muestra
5. Si hay cambios detectados, deberían aparecer en la lista

---

## ⚠️ Notas Importantes

- **No hay breaking changes:** Esta es una nueva tabla, no afecta código existente
- **Datos históricos:** Los cambios se detectarán automáticamente en la próxima sincronización
- **Performance:** Los índices mejoran las consultas de cambios de scope

---

## 🔍 Si Hay Errores

### Error: "relation sprints does not exist"

**Causa:** La tabla `sprints` no existe.

**Solución:**
1. Aplica primero las migraciones de sprints si no lo has hecho
2. Verifica que la tabla existe: `SELECT * FROM sprints LIMIT 1;`

### Error: "relation issues does not exist"

**Causa:** La tabla `issues` no existe.

**Solución:**
1. Aplica primero las migraciones de issues si no lo has hecho
2. Verifica que la tabla existe: `SELECT * FROM issues LIMIT 1;`

### Error: "permission denied"

**Causa:** No tienes permisos para crear tablas.

**Solución:**
1. Asegúrate de estar usando una cuenta con permisos de administrador
2. Verifica que estás en el proyecto correcto de Supabase

---

## 📊 Impacto Esperado

Después de aplicar esta migración:

- ✅ **Tracking automático:** Los cambios de scope se detectarán automáticamente durante sync
- ✅ **Visibilidad:** PMs verán cambios de scope en Projects Metrics
- ✅ **Historial:** Se mantendrá historial de todos los cambios de scope

---

## 🔗 Referencias

- **Migración SQL:** `jira-supabase-sync/migrations/create_sprint_scope_changes_table.sql`
- **Detector:** `jira-supabase-sync/src/processors/scope-change-detector.js`
- **API:** `src/utils/projectMetricsApi.js`
- **UI:** `src/components/ProjectsMetrics.jsx`
- **Plan de 2 Días:** `jira-supabase-sync/docs/PLAN_2_DIAS_COMPLETO.md`
