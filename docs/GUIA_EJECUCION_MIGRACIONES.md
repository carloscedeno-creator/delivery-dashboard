# 🚀 Guía de Ejecución de Migraciones KPI

## Paso 1: Ejecutar Migraciones SQL en Supabase

### Opción A: Usando Supabase Dashboard (Recomendado)

1. **Abrir Supabase Dashboard**
   - Ve a tu proyecto en https://app.supabase.com
   - Navega a **SQL Editor** en el menú lateral

2. **Ejecutar migraciones en orden:**

   #### Migración 1: Planning y Capacity Fields
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- docs/supabase/09_add_planning_capacity_fields.sql
   ```
   - Copia todo el contenido del archivo
   - Pégalo en el SQL Editor
   - Haz clic en **Run** o presiona `Ctrl+Enter`
   - Verifica que no haya errores

   #### Migración 2: Rework Rate Functions
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- docs/supabase/11_calculate_rework_from_history.sql
   ```
   - Repite el proceso anterior

   #### Migración 3: Deployments Table
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- docs/supabase/08_create_deployments_table.sql
   ```
   - Repite el proceso anterior

   #### Migración 4: eNPS Responses Table
   ```sql
   -- Copiar y pegar el contenido completo de:
   -- docs/supabase/10_create_enps_responses_table.sql
   ```
   - Repite el proceso anterior

3. **Verificar que las migraciones se ejecutaron correctamente:**
   ```sql
   -- Verificar tablas creadas
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('deployments', 'enps_responses')
   ORDER BY table_name;

   -- Verificar funciones creadas
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN (
     'calculate_added_story_points',
     'update_sprint_metrics_with_planning_fields',
     'detect_issue_rework',
     'calculate_rework_rate',
     'calculate_enps'
   )
   ORDER BY routine_name;

   -- Verificar campos agregados
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'sprints' 
   AND column_name IN ('planned_story_points', 'planned_capacity_hours');

   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'sprint_metrics' 
   AND column_name IN ('added_story_points', 'actual_capacity_hours');
   ```

### Opción B: Usando Supabase CLI (Si está configurado)

```bash
# Desde el directorio del proyecto
supabase db push

# O ejecutar migraciones individuales
supabase migration up
```

---

## Paso 2: Poblar Datos Iniciales

### Ejecutar Script de Población

```bash
npm run populate-kpi-data
```

Este script:
- ✅ Pobla `planned_story_points` en sprints cerrados (usa `total_story_points` como base)
- ✅ Calcula `added_story_points` usando la función `calculate_added_story_points()`
- ✅ Verifica que las tablas `deployments` y `enps_responses` existan
- ⚠️ Indica qué datos necesitan poblarse manualmente

### Población Manual de Datos

#### 1. Planning Fields (Si el script no los pobló)

```sql
-- Poblar planned_story_points en sprints cerrados
UPDATE sprints 
SET planned_story_points = total_story_points
WHERE state = 'closed' 
  AND planned_story_points IS NULL
  AND total_story_points IS NOT NULL;

-- Actualizar sprint_metrics con added_story_points
SELECT update_sprint_metrics_with_planning_fields(s.id)
FROM sprints s
WHERE s.state = 'closed';
```

#### 2. Deployments (Manual inicialmente, luego CI/CD)

```sql
-- Ejemplo de inserción manual de deployment
INSERT INTO deployments (
  deploy_date, 
  environment, 
  status, 
  sprint_id
) VALUES (
  NOW() - INTERVAL '1 day',
  'production',
  'success',
  (SELECT id FROM sprints WHERE state = 'closed' ORDER BY end_date DESC LIMIT 1)
);

-- Insertar más deployments según necesidad
-- Nota: Esto es temporal hasta conectar CI/CD
```

#### 3. eNPS Responses (Manual inicialmente, luego UI)

```sql
-- Ejemplo de inserción manual de respuesta eNPS
INSERT INTO enps_responses (
  survey_date,
  respondent_id,
  nps_score,
  survey_period
) VALUES (
  CURRENT_DATE,
  (SELECT id FROM developers WHERE active = true LIMIT 1),
  9,
  'weekly'
);

-- Insertar más respuestas según necesidad
-- Nota: Esto es temporal hasta implementar UI de encuestas
```

---

## Paso 3: Verificar que Todo Funciona

### Verificar Servicios de KPIs

1. **Ejecutar la aplicación localmente:**
   ```bash
   npm run dev
   ```

2. **Navegar a la sección de KPIs:**
   - Quality KPIs
   - Team Health KPIs

3. **Verificar en la consola del navegador:**
   - Deberías ver logs indicando si se están usando datos reales o mock
   - Si hay datos reales disponibles, se mostrarán
   - Si no, automáticamente usará datos mock

### Verificar Funciones de Supabase

```sql
-- Probar función calculate_added_story_points
SELECT calculate_added_story_points(
  (SELECT id FROM sprints WHERE state = 'closed' ORDER BY end_date DESC LIMIT 1)
);

-- Probar función calculate_rework_rate
SELECT * FROM calculate_rework_rate(
  NULL,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Probar función calculate_enps
SELECT * FROM calculate_enps(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Ver vista de rework rate por sprint
SELECT * FROM v_rework_rate_by_sprint LIMIT 5;
```

---

## Troubleshooting

### Error: "relation does not exist"
- **Causa:** La migración no se ejecutó correctamente
- **Solución:** Verifica que ejecutaste todas las migraciones en orden

### Error: "function does not exist"
- **Causa:** La función no se creó en la migración
- **Solución:** Verifica que la migración se ejecutó sin errores

### Los servicios siguen usando datos mock
- **Causa:** No hay datos reales disponibles o las tablas no existen
- **Solución:** 
  1. Verifica que las tablas existen (usar queries de verificación arriba)
  2. Pobla datos iniciales manualmente
  3. Verifica que los servicios pueden conectarse a Supabase

### Error de permisos RLS (Row Level Security)
- **Causa:** Las políticas RLS están bloqueando el acceso
- **Solución:** Verifica las políticas RLS en Supabase Dashboard > Authentication > Policies

---

## Próximos Pasos Después de Ejecutar Migraciones

1. ✅ **Conectar CI/CD para Deployments**
   - Configurar webhook o integración para poblar tabla `deployments`
   - Ver documentación de integración en `docs/INTEGRACION_CICD.md` (crear si es necesario)

2. ✅ **Implementar UI de Encuestas para eNPS**
   - Crear componente React para encuestas
   - Conectar con tabla `enps_responses`
   - Ver `docs/IMPLEMENTACION_ENPS_UI.md` (crear si es necesario)

3. ✅ **Automatizar Población de Planning Fields**
   - Crear trigger o proceso para poblar `planned_story_points` durante planning
   - Actualizar proceso de planning para incluir estos campos

---

## Referencias

- `docs/supabase/README_MIGRACIONES_KPIS.md` - Documentación de migraciones
- `docs/PLAN_IMPLEMENTACION_FACTIBLE.md` - Plan de implementación
- `docs/ESTADO_DATOS_KPIS.md` - Estado de datos y análisis

