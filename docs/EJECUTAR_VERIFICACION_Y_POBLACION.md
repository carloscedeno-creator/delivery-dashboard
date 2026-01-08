# 🚀 Ejecutar Verificación y Población de Datos Reales

## Paso 1: Verificar Datos Reales Disponibles

### En Supabase SQL Editor:

1. **Abre Supabase Dashboard → SQL Editor**
2. **Copia y pega el contenido completo de:** `docs/supabase/VERIFY_REAL_DATA.sql`
3. **Ejecuta el script**
4. **Revisa los resultados** para ver qué KPIs pueden calcularse con datos reales

El script verificará:
- ✅ Si `issue_type` está poblado (para Net Bug Flow)
- ✅ Si `status_by_sprint` está poblado (para Rework Rate)
- ✅ Si `total_story_points` y `completed_story_points` existen (para Planning Accuracy)
- ✅ Si `workload_sp` y `velocity_sp` existen (para Capacity Accuracy)
- ✅ Si `avg_lead_time_days` existe (para Cycle Time)

---

## Paso 2: Poblar Datos desde Jira (Script Node.js)

### Ejecutar script de población:

```bash
npm run populate-kpi-data
```

Este script:
- ✅ Pobla `planned_story_points` desde `total_story_points` (datos reales de Jira)
- ✅ Calcula `added_story_points` usando función (desde issues de Jira)
- ✅ Verifica que las tablas `deployments` y `enps_responses` existan

---

## Paso 3: Probar KPIs con Datos Reales

### Ejecutar aplicación:

```bash
npm run dev
```

### Verificar en la aplicación:

1. **Navegar a Quality KPIs**
   - Debería mostrar Net Bug Flow y Rework Rate si los datos están disponibles
   - Si no hay datos, usará mock automáticamente

2. **Navegar a Team Health KPIs**
   - Debería mostrar Planning Accuracy y Capacity Accuracy con datos reales
   - Si no hay datos, usará mock automáticamente

3. **Verificar en consola del navegador:**
   - Busca logs que indiquen si se están usando datos reales o mock
   - Ejemplo: `[QUALITY_KPI] Using mock data` o datos reales

---

## 📊 Qué Esperar

### Si los datos de Jira están disponibles:

✅ **Cycle Time:** Datos reales automáticamente
✅ **Deploy Frequency:** Estimado desde sprints (datos reales)
✅ **Net Bug Flow:** Datos reales si `issue_type` está poblado
✅ **Rework Rate:** Datos reales si `status_by_sprint` está poblado
✅ **Planning Accuracy:** Datos reales usando `total_story_points`
✅ **Capacity Accuracy:** Datos reales usando `workload_sp`

### Si faltan datos:

⚠️ **Change Failure Rate:** Usará mock (necesita `deployments`)
⚠️ **eNPS:** Usará mock (necesita `enps_responses`)
⚠️ **PR Size:** Usará mock (necesita integración Git)

---

## 🔍 Verificación Manual Rápida

Si quieres verificar rápidamente sin ejecutar el script completo:

```sql
-- Verificar issue_type
SELECT DISTINCT issue_type FROM issues LIMIT 10;

-- Verificar status_by_sprint
SELECT COUNT(*) FROM issues WHERE status_by_sprint IS NOT NULL;

-- Verificar sprint_metrics
SELECT COUNT(*) FROM sprint_metrics WHERE total_story_points IS NOT NULL;

-- Verificar developer_sprint_metrics
SELECT COUNT(*) FROM developer_sprint_metrics WHERE workload_sp IS NOT NULL;
```

---

## ✅ Checklist Final

- [ ] Ejecutadas queries de verificación en Supabase
- [ ] Ejecutado script de población (`npm run populate-kpi-data`)
- [ ] Verificados resultados del script
- [ ] Ejecutada aplicación (`npm run dev`)
- [ ] Verificados KPIs en la UI
- [ ] Revisada consola del navegador para logs

---

## 💡 Nota

Los servicios están diseñados para usar datos reales automáticamente cuando están disponibles. No necesitas cambiar código - solo asegúrate de que los datos estén disponibles en Supabase.

