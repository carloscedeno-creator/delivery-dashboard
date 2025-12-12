-- =====================================================
-- TRIGGER AUTOMÁTICO PARA CÁLCULO DE MÉTRICAS
-- Calcula métricas automáticamente después de sincronización
-- =====================================================

-- =====================================================
-- FUNCIÓN TRIGGER: Calcular Métricas Después de Sync
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_calculate_metrics_after_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_project_key TEXT;
  v_error_message TEXT;
BEGIN
  -- Solo ejecutar si la sincronización se completó exitosamente
  -- Caso 1: INSERT con status='completed' (nueva sincronización completada)
  -- Caso 2: UPDATE de status diferente a 'completed' a 'completed'
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    BEGIN
      -- Obtener project_key del proyecto
      SELECT project_key INTO v_project_key
      FROM projects
      WHERE id = NEW.project_id;
      
      IF v_project_key IS NOT NULL THEN
        -- Calcular todas las métricas del proyecto
        PERFORM calculate_all_metrics(v_project_key);
        
        -- Log exitoso (solo visible en logs de PostgreSQL, no en Supabase UI)
        RAISE NOTICE '✅ Métricas calculadas automáticamente para proyecto % después de sincronización', v_project_key;
      ELSE
        RAISE WARNING '⚠️ No se encontró project_key para project_id %', NEW.project_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Capturar errores pero no fallar el INSERT/UPDATE
        v_error_message := SQLERRM;
        RAISE WARNING '❌ Error calculando métricas automáticamente: %', v_error_message;
        -- No hacer RETURN NULL para que el INSERT/UPDATE continúe
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREAR TRIGGER
-- =====================================================
-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS after_sync_complete ON data_sync_log;

-- Crear trigger que se ejecuta después de insertar o actualizar
CREATE TRIGGER after_sync_complete
AFTER INSERT OR UPDATE ON data_sync_log
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trigger_calculate_metrics_after_sync();

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION trigger_calculate_metrics_after_sync IS 
'Trigger que calcula automáticamente todas las métricas analíticas después de una sincronización exitosa';

COMMENT ON TRIGGER after_sync_complete ON data_sync_log IS 
'Se ejecuta automáticamente cuando una sincronización se completa exitosamente, calculando métricas de sprint y desarrollador';


