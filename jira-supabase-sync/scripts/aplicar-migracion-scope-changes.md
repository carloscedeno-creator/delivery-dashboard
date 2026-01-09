# Aplicar Migración: sprint_scope_changes

## 📋 Pasos para Aplicar la Migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Abre el Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia el contenido de `migrations/create_sprint_scope_changes_table.sql`
4. Pega y ejecuta el SQL
5. Verifica que la tabla y vista se crearon correctamente

### Opción 2: Desde Script Node.js

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard\jira-supabase-sync"
node scripts/apply-migrations.js
```

## ✅ Verificación

Después de aplicar la migración, ejecuta estas queries para verificar:

```sql
-- Verificar que la tabla existe
SELECT COUNT(*) FROM sprint_scope_changes;

-- Verificar que la vista existe
SELECT * FROM sprint_scope_changes_summary LIMIT 1;

-- Ver estructura de la tabla
\d sprint_scope_changes
```

## 🔄 Siguiente Paso

Después de aplicar la migración, ejecuta una sincronización para que se detecten los cambios de scope:

```bash
npm run sync:fast -- --project=OBD
```

Los cambios se detectarán automáticamente durante la sincronización.
