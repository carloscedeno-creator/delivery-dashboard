# 📋 Migraciones SQL para KPIs

## Estado: Estructura Lista, Integraciones "To Be Connected"

Este directorio contiene las migraciones SQL necesarias para habilitar el cálculo de KPIs reales. Las estructuras de base de datos están listas, pero algunas integraciones están marcadas como "To Be Connected".

---

## 📁 Archivos de Migración

### 1. `08_create_deployments_table.sql` ✅
**Tabla:** `deployments`

**Propósito:** 
- Almacenar información de deployments
- Calcular Change Failure Rate
- Calcular Deploy Frequency preciso

**Estado:**
- ✅ Estructura de tabla lista
- ⚠️ Sincronización desde CI/CD: **To Be Connected**

**Campos principales:**
- `deploy_date`, `environment`, `status`
- `sprint_id`, `deployed_by_id`
- `rollback_date`, `failure_reason`

**Próximos pasos:**
1. Ejecutar migración SQL
2. Conectar con CI/CD (GitHub Actions, GitLab CI, etc.) para poblar datos
3. O poblar manualmente inicialmente

---

### 2. `09_add_planning_capacity_fields.sql` ✅
**Tablas modificadas:** `sprints`, `sprint_metrics`

**Propósito:**
- Habilitar cálculo preciso de Planning Accuracy
- Habilitar cálculo preciso de Capacity Accuracy

**Estado:**
- ✅ Campos agregados
- ✅ Funciones helper creadas
- ⚠️ Población de datos: **Manual durante planning**

**Campos agregados:**
- `sprints.planned_story_points`
- `sprints.planned_capacity_hours`
- `sprint_metrics.added_story_points`
- `sprint_metrics.actual_capacity_hours`

**Funciones helper:**
- `calculate_added_story_points(p_sprint_id)` - Calcula SP agregados durante sprint
- `update_sprint_metrics_with_planning_fields(p_sprint_id)` - Actualiza métricas

**Próximos pasos:**
1. Ejecutar migración SQL
2. Poblar `planned_story_points` y `planned_capacity_hours` durante planning
3. Ejecutar función helper para calcular `added_story_points`

---

### 3. `10_create_enps_responses_table.sql` ✅
**Tabla:** `enps_responses`

**Propósito:**
- Almacenar respuestas de eNPS (Employee Net Promoter Score)
- Calcular Team Health Score

**Estado:**
- ✅ Estructura de tabla lista
- ✅ Función de cálculo creada
- ⚠️ UI de encuestas: **To Be Connected**

**Campos principales:**
- `survey_date`, `respondent_id`, `nps_score`
- `comments`, `survey_period`

**Función de cálculo:**
- `calculate_enps(p_start_date, p_end_date)` - Calcula eNPS para un período

**Próximos pasos:**
1. Ejecutar migración SQL
2. Implementar UI de encuestas en React
3. O poblar manualmente inicialmente

---

### 4. `11_calculate_rework_from_history.sql` ✅
**Funciones:** `detect_issue_rework()`, `calculate_rework_rate()`

**Propósito:**
- Calcular Rework Rate desde historial de estados
- No requiere tabla adicional

**Estado:**
- ✅ Funciones creadas
- ✅ Vista creada
- ✅ Listo para usar

**Funciones:**
- `detect_issue_rework(p_issue_id)` - Detecta rework en un issue
- `calculate_rework_rate(p_sprint_id, p_start_date, p_end_date)` - Calcula Rework Rate

**Vista:**
- `v_rework_rate_by_sprint` - Rework Rate por sprint

**Próximos pasos:**
1. Ejecutar migración SQL
2. Usar funciones directamente en servicios de KPIs

---

## 🚀 Orden de Ejecución Recomendado

1. **Primero:** `09_add_planning_capacity_fields.sql`
   - Agrega campos necesarios para Planning y Capacity Accuracy
   - No depende de otras migraciones

2. **Segundo:** `11_calculate_rework_from_history.sql`
   - Funciones para calcular Rework Rate
   - No requiere tablas nuevas

3. **Tercero:** `08_create_deployments_table.sql`
   - Tabla para deployments
   - Requiere integración con CI/CD (To Be Connected)

4. **Cuarto:** `10_create_enps_responses_table.sql`
   - Tabla para eNPS
   - Requiere UI de encuestas (To Be Connected)

---

## 📝 Notas Importantes

### Integraciones "To Be Connected"

1. **Deployments → CI/CD**
   - Tabla lista, necesita sincronización desde CI/CD
   - Puede poblarse manualmente inicialmente

2. **eNPS → UI de Encuestas**
   - Tabla lista, necesita componente React para encuestas
   - Puede poblarse manualmente inicialmente

3. **Planning Fields → Proceso de Planning**
   - Campos listos, necesita poblarse durante planning
   - Puede automatizarse con triggers o funciones

### Datos Mock vs Reales

- **PR Size:** Seguirá usando datos mock hasta tener acceso a repositorios
- **Deployments:** Puede empezar con datos mock, luego migrar a reales
- **eNPS:** Puede empezar con datos manuales, luego migrar a UI

---

## 🔄 Próximos Pasos Después de Ejecutar Migraciones

1. ✅ Verificar que las migraciones se ejecutaron correctamente
2. ✅ Poblar datos iniciales donde sea posible
3. ✅ Implementar servicios de KPIs para usar las nuevas estructuras
4. ⚠️ Conectar integraciones marcadas como "To Be Connected"

---

## 📚 Referencias

- Ver `docs/PLAN_IMPLEMENTACION_FACTIBLE.md` para plan completo
- Ver `docs/ESTADO_DATOS_KPIS.md` para análisis detallado
- Ver `docs/VERIFICACION_ESTRUCTURA_SUPABASE.md` para verificación

