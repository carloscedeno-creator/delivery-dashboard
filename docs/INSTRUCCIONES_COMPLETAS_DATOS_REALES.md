# 📋 Instrucciones Completas: Verificar y Poblar Datos Reales

## ✅ Paso 1: Ejecutar Queries de Verificación en Supabase

### En Supabase Dashboard:

1. **Abre:** Supabase Dashboard → SQL Editor
2. **Copia el contenido completo de:** `docs/supabase/VERIFY_REAL_DATA.sql`
3. **Pega y ejecuta** el script completo
4. **Revisa los resultados** para ver qué KPIs pueden calcularse

### Qué verificarás:

- ✅ **Net Bug Flow:** Si `issue_type` está poblado y hay bugs
- ✅ **Rework Rate:** Si `status_by_sprint` tiene historial válido
- ✅ **Planning Accuracy:** Si `total_story_points` y `completed_story_points` existen
- ✅ **Capacity Accuracy:** Si `workload_sp` y `velocity_sp` existen
- ✅ **Cycle Time:** Si `avg_lead_time_days` existe (ya funciona)

---

## ✅ Paso 2: Ejecutar Script de Población

### En tu terminal (PowerShell):

```powershell
# Asegúrate de estar en el directorio del proyecto
cd "D:\Agile Dream Team\Antigravity\delivery-dashboard"

# Verifica que el .env existe y tiene las variables
Get-Content .env | Select-String "VITE_SUPABASE"

# Ejecuta el script de población
npm run populate-kpi-data
```

### O directamente con Node:

```powershell
node scripts/populate-initial-data.js
```

### Qué hace el script:

1. ✅ **Pobla `planned_story_points`** desde `total_story_points` (datos reales de Jira)
2. ✅ **Calcula `added_story_points`** usando función (desde issues de Jira)
3. ✅ **Verifica** que las tablas `deployments` y `enps_responses` existan

### Salida esperada:

```
🚀 Starting Initial Data Population
============================================================
📋 Environment check:
   VITE_SUPABASE_URL: Set
   VITE_SUPABASE_ANON_KEY: Set

✅ Supabase client created
✅ Supabase connection verified

📊 Populating Planning Fields...
   Processing sprint: Sprint 1
   Updating sprint Sprint 1 with planned_story_points: 50
   ✅ Updated sprint Sprint 1
✅ Updated 5 sprints with planned_story_points

📊 Calculating Added Story Points...
   Processing sprint 1/5...
   Calculated added_story_points: 10 for sprint ...
✅ Updated 5 sprint_metrics with added_story_points

📊 Checking Deployments Table...
✅ Deployments table exists
⚠️  To populate: Connect CI/CD or insert manually

📊 Checking eNPS Responses Table...
✅ eNPS responses table exists
⚠️  To populate: Use UI (To Be Connected) or insert manually

============================================================
📊 Summary:
   Planning Fields: ✅
   Added Story Points: ✅
   Deployments Table: ✅ Exists
   eNPS Table: ✅ Exists

✅ Data population completed
```

---

## ✅ Paso 3: Probar KPIs con Datos Reales

### Ejecutar aplicación:

```powershell
npm run dev
```

### Verificar en la aplicación:

1. **Navegar a Quality KPIs**
   - Debería mostrar Net Bug Flow y Rework Rate si los datos están disponibles
   - Si no hay datos, usará mock automáticamente

2. **Navegar a Team Health KPIs**
   - Debería mostrar Planning Accuracy y Capacity Accuracy con datos reales
   - Si no hay datos, usará mock automáticamente

3. **Verificar en consola del navegador (F12):**
   - Busca logs que indiquen si se están usando datos reales o mock
   - Ejemplo: `[QUALITY_KPI] Using mock data` o datos reales

---

## 🔍 Verificación Rápida Manual (SQL)

Si prefieres verificar rápidamente sin ejecutar el script completo:

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

## 📊 Qué Esperar Según los Datos

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

## ✅ Checklist Final

- [ ] Ejecutadas queries de verificación en Supabase (`VERIFY_REAL_DATA.sql`)
- [ ] Revisados resultados de verificación
- [ ] Ejecutado script de población (`npm run populate-kpi-data`)
- [ ] Verificados resultados del script (sprints actualizados)
- [ ] Ejecutada aplicación (`npm run dev`)
- [ ] Verificados KPIs en la UI
- [ ] Revisada consola del navegador para logs

---

## 💡 Nota Importante

Los servicios están diseñados para usar datos reales automáticamente cuando están disponibles. No necesitas cambiar código - solo asegúrate de que:

1. ✅ Las migraciones estén ejecutadas (`ALL_KPI_MIGRATIONS.sql`)
2. ✅ Los datos de Jira estén sincronizados en Supabase
3. ✅ El script de población haya actualizado los campos necesarios

---

## 🆘 Troubleshooting

### Si el script no muestra salida:

1. Verifica que `.env` existe y tiene las variables:
   ```powershell
   Get-Content .env
   ```

2. Ejecuta con salida explícita:
   ```powershell
   node scripts/populate-initial-data.js 2>&1 | Write-Host
   ```

3. Verifica conexión a Supabase:
   ```powershell
   node scripts/test-supabase-connection.js
   ```

### Si las queries SQL fallan:

1. Verifica que las migraciones estén ejecutadas:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('deployments', 'enps_responses');
   ```

2. Verifica que las funciones existan:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('calculate_added_story_points', 'calculate_rework_rate', 'calculate_enps');
   ```

