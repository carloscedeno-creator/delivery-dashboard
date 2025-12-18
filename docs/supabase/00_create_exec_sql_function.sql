-- ============================================
-- Función RPC para ejecutar SQL dinámicamente
-- Esta función permite ejecutar SQL desde la API REST
-- ============================================

-- Eliminar función existente si tiene diferente firma
DROP FUNCTION IF EXISTS exec_sql(TEXT);
DROP FUNCTION IF EXISTS exec_sql(sql_query TEXT);

-- Función para ejecutar SQL dinámico (SOLO para service_role)
CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Ejecutar SQL dinámico
    EXECUTE p_sql;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Comentario
COMMENT ON FUNCTION exec_sql IS 'Ejecuta SQL dinámico. Solo para uso administrativo con service_role key.';
