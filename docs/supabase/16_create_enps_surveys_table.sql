-- Create enps_surveys table for managing periodic eNPS surveys
-- This allows creating named surveys (e.g., "jan2026") that can be activated/deactivated
-- Only one survey can be active at a time for filling

CREATE TABLE IF NOT EXISTS enps_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    updated_by_id UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- Add index for active surveys lookup
CREATE INDEX IF NOT EXISTS idx_enps_surveys_is_active ON enps_surveys(is_active) WHERE is_active = TRUE;

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_enps_surveys_dates ON enps_surveys(start_date, end_date);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_enps_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enps_surveys_updated_at
    BEFORE UPDATE ON enps_surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_enps_surveys_updated_at();

-- Add constraint: Only one active survey at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_enps_surveys_single_active 
ON enps_surveys(is_active) 
WHERE is_active = TRUE;

-- Add survey_id to enps_responses table
ALTER TABLE enps_responses 
ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES enps_surveys(id) ON DELETE SET NULL;

-- Add index for survey_id lookups
CREATE INDEX IF NOT EXISTS idx_enps_responses_survey_id ON enps_responses(survey_id);

-- Add comment
COMMENT ON TABLE enps_surveys IS 'Manages periodic eNPS surveys. Only one survey can be active at a time for filling.';
COMMENT ON COLUMN enps_surveys.survey_name IS 'Unique name for the survey (e.g., "jan2026")';
COMMENT ON COLUMN enps_surveys.is_active IS 'Whether this survey is currently active for responses. Only one can be active at a time.';
COMMENT ON COLUMN enps_responses.survey_id IS 'Reference to the survey this response belongs to. NULL for responses before survey management was implemented.';

