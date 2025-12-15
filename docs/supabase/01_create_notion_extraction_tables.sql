-- Tablas para almacenar contenido extraído de Notion
-- Ejecutar en Supabase SQL Editor

-- Tabla para almacenar contenido extraído de Notion
CREATE TABLE IF NOT EXISTS notion_content_extraction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  notion_page_id VARCHAR(255),
  page_url TEXT,
  extracted_content TEXT,
  structured_data JSONB,
  properties JSONB,
  extraction_date TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(notion_page_id)
);

-- Tabla para métricas extraídas
CREATE TABLE IF NOT EXISTS notion_extracted_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  extraction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50),
  completion_percentage INTEGER,
  tasks_completed INTEGER,
  tasks_total INTEGER,
  story_points_done INTEGER,
  story_points_total INTEGER,
  blockers JSONB, -- Array de bloqueos encontrados
  dependencies JSONB, -- Array de dependencias
  extracted_dates JSONB, -- Fechas extraídas (start, delivery, etc.)
  raw_metrics JSONB, -- Todas las métricas en formato JSON
  source VARCHAR(50) DEFAULT 'notion_extraction',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(initiative_name, extraction_date)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_notion_content_initiative ON notion_content_extraction(initiative_name);
CREATE INDEX IF NOT EXISTS idx_notion_content_page_id ON notion_content_extraction(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_notion_content_extraction_date ON notion_content_extraction(extraction_date);

CREATE INDEX IF NOT EXISTS idx_notion_metrics_initiative ON notion_extracted_metrics(initiative_name);
CREATE INDEX IF NOT EXISTS idx_notion_metrics_date ON notion_extracted_metrics(extraction_date);
CREATE INDEX IF NOT EXISTS idx_notion_metrics_status ON notion_extracted_metrics(status);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_notion_content_extraction_updated_at
    BEFORE UPDATE ON notion_content_extraction
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (ajustar según necesidades de seguridad)
ALTER TABLE notion_content_extraction ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_extracted_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir lectura a usuarios autenticados
CREATE POLICY "Allow authenticated read on notion_content_extraction"
    ON notion_content_extraction
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on notion_extracted_metrics"
    ON notion_extracted_metrics
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Permitir inserción/actualización desde service_role (Edge Functions)
CREATE POLICY "Allow service_role full access on notion_content_extraction"
    ON notion_content_extraction
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on notion_extracted_metrics"
    ON notion_extracted_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE notion_content_extraction IS 'Almacena contenido completo extraído de páginas de Notion';
COMMENT ON TABLE notion_extracted_metrics IS 'Almacena métricas extraídas y procesadas de Notion por fecha';
COMMENT ON COLUMN notion_content_extraction.structured_data IS 'Contenido estructurado (headings, lists, todos, etc.)';
COMMENT ON COLUMN notion_extracted_metrics.blockers IS 'Array JSON con bloqueos encontrados';
COMMENT ON COLUMN notion_extracted_metrics.dependencies IS 'Array JSON con dependencias encontradas';
