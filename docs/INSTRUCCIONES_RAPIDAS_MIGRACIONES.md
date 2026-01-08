# ⚡ Instrucciones Rápidas - Ejecutar Migraciones KPI

## Método Rápido (Todo en Uno)

1. **Abre Supabase Dashboard**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto
   - Navega a **SQL Editor**

2. **Copia y Pega Todo el Contenido**
   - Abre el archivo: `docs/supabase/ALL_KPI_MIGRATIONS.sql`
   - Copia **TODO** el contenido (Ctrl+A, Ctrl+C)
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter`

3. **Verifica que se Ejecutó Correctamente**
   - Al final del archivo hay queries de verificación
   - Deberías ver resultados mostrando:
     - 2 tablas creadas (`deployments`, `enps_responses`)
     - 5 funciones creadas
     - 2 campos en `sprints`
     - 2 campos en `sprint_metrics`
     - 1 vista creada (`v_rework_rate_by_sprint`)

4. **Ejecuta Script de Población de Datos**
   ```bash
   npm run populate-kpi-data
   ```

## Método Paso a Paso (Si Prefieres Ejecutar Individualmente)

Si prefieres ejecutar cada migración por separado:

1. **Migración 1:** `docs/supabase/09_add_planning_capacity_fields.sql`
2. **Migración 2:** `docs/supabase/11_calculate_rework_from_history.sql`
3. **Migración 3:** `docs/supabase/08_create_deployments_table.sql`
4. **Migración 4:** `docs/supabase/10_create_enps_responses_table.sql`

Copia y ejecuta cada una en orden.

## Verificación Manual

Si quieres verificar manualmente después de ejecutar:

```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deployments', 'enps_responses');

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'calculate_added_story_points',
  'update_sprint_metrics_with_planning_fields',
  'detect_issue_rework',
  'calculate_rework_rate',
  'calculate_enps'
);

-- Verificar campos en sprints
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sprints' 
AND column_name IN ('planned_story_points', 'planned_capacity_hours');

-- Verificar campos en sprint_metrics
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sprint_metrics' 
AND column_name IN ('added_story_points', 'actual_capacity_hours');
```

## ¿Problemas?

- **Error de sintaxis:** Verifica que copiaste todo el contenido completo
- **Error de permisos:** Asegúrate de tener permisos de administrador en Supabase
- **Tabla ya existe:** Usa `DROP TABLE IF EXISTS` antes de crear (solo si es seguro)

## Próximo Paso

Después de ejecutar las migraciones:
```bash
npm run populate-kpi-data
```

Esto poblará los datos iniciales donde sea posible.

