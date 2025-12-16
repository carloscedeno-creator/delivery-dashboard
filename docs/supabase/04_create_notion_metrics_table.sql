-- =====================================================
-- Tabla para métricas extraídas de Notion
-- =====================================================
-- Esta tabla almacena las métricas sincronizadas desde Notion
-- para las iniciativas del Product Roadmap
-- =====================================================

-- Crear tabla principal de métricas
CREATE TABLE IF NOT EXISTS notion_extracted_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  extraction_date DATE NOT NULL,
  status VARCHAR(50),
  completion_percentage INTEGER DEFAULT 0,
  story_points_done INTEGER DEFAULT 0,
  story_points_total INTEGER DEFAULT 0,
  raw_metrics JSONB,
  source VARCHAR(50) DEFAULT 'notion_sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único: una métrica por iniciativa por día
  UNIQUE(initiative_name, extraction_date)
);

-- Índices para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_notion_metrics_initiative 
  ON notion_extracted_metrics(initiative_name);

CREATE INDEX IF NOT EXISTS idx_notion_metrics_date 
  ON notion_extracted_metrics(extraction_date);

CREATE INDEX IF NOT EXISTS idx_notion_metrics_status 
  ON notion_extracted_metrics(status);

CREATE INDEX IF NOT EXISTS idx_notion_metrics_source 
  ON notion_extracted_metrics(source);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_notion_metrics_raw_metrics 
  ON notion_extracted_metrics USING GIN (raw_metrics);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notion_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
-- Eliminar trigger si existe antes de crearlo (para permitir re-ejecución del script)
DROP TRIGGER IF EXISTS notion_metrics_updated_at ON notion_extracted_metrics;

CREATE TRIGGER notion_metrics_updated_at
  BEFORE UPDATE ON notion_extracted_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_notion_metrics_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE notion_extracted_metrics ENABLE ROW LEVEL SECURITY;

-- Política: service_role tiene acceso completo
-- Eliminar política si existe antes de crearla (para permitir re-ejecución del script)
DROP POLICY IF EXISTS "Allow service_role full access on notion_extracted_metrics" ON notion_extracted_metrics;

CREATE POLICY "Allow service_role full access on notion_extracted_metrics"
  ON notion_extracted_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política: usuarios autenticados pueden leer
-- Eliminar política si existe antes de crearla
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON notion_extracted_metrics;

CREATE POLICY "Allow read access to authenticated users"
  ON notion_extracted_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: anon puede leer (para el dashboard)
-- Eliminar política si existe antes de crearla
DROP POLICY IF EXISTS "Allow read access to anon users" ON notion_extracted_metrics;

CREATE POLICY "Allow read access to anon users"
  ON notion_extracted_metrics
  FOR SELECT
  TO anon
  USING (true);

-- =====================================================
-- Comentarios para documentación
-- =====================================================

COMMENT ON TABLE notion_extracted_metrics IS 
  'Almacena métricas extraídas de Notion para iniciativas del Product Roadmap';

COMMENT ON COLUMN notion_extracted_metrics.initiative_name IS 
  'Nombre de la iniciativa (debe coincidir con el CSV de productos)';

COMMENT ON COLUMN notion_extracted_metrics.extraction_date IS 
  'Fecha de extracción (una métrica por iniciativa por día)';

COMMENT ON COLUMN notion_extracted_metrics.status IS 
  'Estado de la iniciativa: planned, in_progress, done, blocked';

COMMENT ON COLUMN notion_extracted_metrics.completion_percentage IS 
  'Porcentaje de completación (0-100)';

COMMENT ON COLUMN notion_extracted_metrics.story_points_done IS 
  'Story points completados';

COMMENT ON COLUMN notion_extracted_metrics.story_points_total IS 
  'Story points totales';

COMMENT ON COLUMN notion_extracted_metrics.raw_metrics IS 
  'Todas las propiedades extraídas de Notion en formato JSON';

COMMENT ON COLUMN notion_extracted_metrics.source IS 
  'Origen de los datos (notion_sync, manual, etc.)';
