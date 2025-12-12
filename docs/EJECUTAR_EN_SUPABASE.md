# 🚀 Ejecutar Funciones SQL en Supabase

## 📋 Pasos para Ejecutar

### Paso 1: Abrir Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral izquierdo)
4. Haz clic en **New Query**

### Paso 2: Ejecutar Funciones de Cálculo

1. **Copia TODO el contenido** del archivo:
   ```
   docs/supabase/04_calculate_metrics_functions.sql
   ```

2. **Pega en el SQL Editor** de Supabase

3. **Haz clic en "Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

4. **Verifica el resultado:**
   - Deberías ver mensajes de éxito para cada función
   - Si hay errores, cópialos y revísalos

### Paso 3: Ejecutar Trigger Automático

1. **Copia TODO el contenido** del archivo:
   ```
   docs/supabase/05_auto_calculate_metrics_trigger.sql
   ```

2. **Pega en el SQL Editor** (puedes usar la misma query o crear una nueva)

3. **Haz clic en "Run"**

4. **Verifica el resultado:**
   - Deberías ver "CREATE TRIGGER" exitoso
   - Si hay errores, cópialos y revísalos

### Paso 4: Verificar Instalación

Ejecuta esta query para verificar que todo está instalado:

```sql
-- Verificar funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%metrics%'
ORDER BY routine_name;

-- Verificar trigger
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'after_sync_complete';
```

**Resultado esperado:**
- Deberías ver 6 funciones relacionadas con métricas
- Deberías ver el trigger `after_sync_complete`

### Paso 5: Probar Cálculo Manual

Ejecuta esta query para probar que funciona:

```sql
-- Calcular métricas para proyecto OBD (o tu proyecto)
SELECT * FROM calculate_all_metrics('OBD');
```

**Resultado esperado:**
- Una fila con `sprints_processed`, `developers_processed`, `metrics_calculated`
- Si hay errores, revísalos

## ✅ Verificación Final

Después de ejecutar todo, verifica que las métricas se pueden calcular:

```sql
-- Ver métricas más recientes
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points,
  sm.total_tickets
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
ORDER BY sm.calculated_at DESC
LIMIT 5;
```

## 🐛 Si Hay Errores

### Error: "relation does not exist"
- **Causa:** El esquema no está aplicado
- **Solución:** Ejecuta primero `01_create_schema.sql` desde el proyecto GooglescriptsDelivery

### Error: "function does not exist"
- **Causa:** Las funciones dependientes no están creadas
- **Solución:** Asegúrate de ejecutar TODO el archivo `04_calculate_metrics_functions.sql` completo

### Error: "permission denied"
- **Causa:** No tienes permisos para crear funciones
- **Solución:** Usa una cuenta con permisos de administrador o service_role

## 📝 Notas

- Las funciones se crean en el esquema `public`
- El trigger se ejecuta automáticamente después de cada sincronización
- Los errores del trigger no afectan la sincronización (se capturan silenciosamente)

## 🎯 Siguiente Paso

Una vez instalado, las métricas se calcularán automáticamente después de cada sincronización. No necesitas hacer nada más.

Para probar localmente:
```bash
npm run test-metrics OBD
```


