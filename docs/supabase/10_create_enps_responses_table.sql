-- =====================================================
-- TABLA: enps_responses
-- Propósito: Almacenar respuestas de eNPS (Employee Net Promoter Score)
--            para calcular Team Health Score
-- Estado: Estructura lista, UI de encuestas "To Be Connected"
-- =====================================================

CREATE TABLE IF NOT EXISTS enps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_date DATE NOT NULL,
  respondent_id UUID REFERENCES developers(id) ON DELETE CASCADE,
  nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  comments TEXT,
  survey_period TEXT, -- 'weekly', 'monthly', 'quarterly', 'ad-hoc'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar respuestas duplicadas del mismo desarrollador en el mismo período
  CONSTRAINT unique_respondent_survey_date UNIQUE (respondent_id, survey_date)
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_enps_responses_survey_date ON enps_responses(survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_enps_responses_respondent ON enps_responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_enps_responses_nps_score ON enps_responses(nps_score);
CREATE INDEX IF NOT EXISTS idx_enps_responses_survey_period ON enps_responses(survey_period);

-- Índice compuesto para consultas de eNPS por período
CREATE INDEX IF NOT EXISTS idx_enps_responses_period_date 
ON enps_responses(survey_period, survey_date DESC);

-- Comentarios para documentación
COMMENT ON TABLE enps_responses IS 
'Tabla para almacenar respuestas de eNPS (Employee Net Promoter Score).
UI de encuestas: To Be Connected';

COMMENT ON COLUMN enps_responses.survey_date IS 
'Fecha de la encuesta (normalmente fecha de respuesta)';

COMMENT ON COLUMN enps_responses.respondent_id IS 
'Desarrollador que respondió la encuesta';

COMMENT ON COLUMN enps_responses.nps_score IS 
'Puntuación NPS (0-10): 
0-6 = Detractor, 7-8 = Passive, 9-10 = Promoter';

COMMENT ON COLUMN enps_responses.comments IS 
'Comentarios opcionales del respondiente';

COMMENT ON COLUMN enps_responses.survey_period IS 
'Período de la encuesta: weekly, monthly, quarterly, ad-hoc';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_enps_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enps_responses_updated_at
BEFORE UPDATE ON enps_responses
FOR EACH ROW
EXECUTE FUNCTION update_enps_responses_updated_at();

-- =====================================================
-- FUNCIÓN: Calcular eNPS para un período
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_enps(
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  enps_value INTEGER,
  total_responses INTEGER,
  promoters INTEGER,
  passives INTEGER,
  detractors INTEGER,
  promoter_percentage DECIMAL(5,2),
  detractor_percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_total INTEGER;
  v_promoters INTEGER;
  v_passives INTEGER;
  v_detractors INTEGER;
  v_enps INTEGER;
BEGIN
  -- Contar respuestas en el período
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE nps_score >= 9)::INTEGER,
    COUNT(*) FILTER (WHERE nps_score IN (7, 8))::INTEGER,
    COUNT(*) FILTER (WHERE nps_score <= 6)::INTEGER
  INTO v_total, v_promoters, v_passives, v_detractors
  FROM enps_responses
  WHERE survey_date >= p_start_date
    AND (p_end_date IS NULL OR survey_date <= p_end_date);
  
  -- Calcular eNPS: % Promoters - % Detractors
  IF v_total > 0 THEN
    v_enps := ROUND(
      ((v_promoters::DECIMAL / v_total) * 100) - 
      ((v_detractors::DECIMAL / v_total) * 100)
    )::INTEGER;
  ELSE
    v_enps := 0;
  END IF;
  
  RETURN QUERY SELECT
    v_enps,
    v_total,
    v_promoters,
    v_passives,
    v_detractors,
    CASE WHEN v_total > 0 THEN (v_promoters::DECIMAL / v_total * 100) ELSE 0 END,
    CASE WHEN v_total > 0 THEN (v_detractors::DECIMAL / v_total * 100) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_enps IS 
'Calcula eNPS para un período dado. 
Fórmula: (% Promoters - % Detractors) donde:
- Promoters: nps_score >= 9
- Passives: nps_score IN (7, 8)
- Detractors: nps_score <= 6';

-- =====================================================
-- NOTA: UI de Encuestas
-- =====================================================
-- Esta tabla está lista para recibir datos, pero la UI de encuestas
-- está marcada como "To Be Connected".
--
-- Para poblar datos inicialmente:
-- 1. Puede hacerse manualmente insertando registros
-- 2. O esperar a la implementación de la UI de encuestas
--
-- Ejemplo de inserción manual:
-- INSERT INTO enps_responses (survey_date, respondent_id, nps_score, survey_period)
-- VALUES (
--   CURRENT_DATE, 
--   (SELECT id FROM developers LIMIT 1), 
--   9, 
--   'weekly'
-- );
--
-- Ejemplo de cálculo de eNPS:
-- SELECT * FROM calculate_enps(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);
-- =====================================================

