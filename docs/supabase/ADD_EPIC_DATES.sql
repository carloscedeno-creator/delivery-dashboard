-- =====================================================
-- Agregar campos de fechas a la tabla initiatives
-- Para almacenar fechas del timeline de Jira
-- =====================================================

-- Agregar campos start_date y end_date a initiatives
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Crear índices para búsquedas por fechas
CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

-- Comentarios
COMMENT ON COLUMN initiatives.start_date IS 'Fecha de inicio de la épica desde el timeline de Jira';
COMMENT ON COLUMN initiatives.end_date IS 'Fecha de fin de la épica desde el timeline de Jira';





