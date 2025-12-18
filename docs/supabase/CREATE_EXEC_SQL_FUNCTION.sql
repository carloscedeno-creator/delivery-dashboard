-- =====================================================
-- Función RPC para ejecutar SQL dinámicamente
-- Permite que las Edge Functions ejecuten SQL
-- =====================================================

-- Crear función que ejecuta SQL dinámicamente
-- NOTA: Esta función requiere permisos especiales y debe usarse con cuidado
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ejecutar el SQL dinámico
  EXECUTE sql_query;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error ejecutando SQL: %', SQLERRM;
END;
$$;

-- Comentario
COMMENT ON FUNCTION exec_sql(TEXT) IS 'Ejecuta SQL dinámico. Usar con precaución. Requiere permisos de service_role.';

-- NOTA DE SEGURIDAD:
-- Esta función permite ejecutar SQL arbitrario, lo cual es un riesgo de seguridad.
-- Solo debe ser llamada desde Edge Functions autenticadas con service_role key.
-- Considera restringir aún más los permisos si es necesario.




