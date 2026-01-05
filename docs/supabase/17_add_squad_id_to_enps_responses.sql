-- Add squad_id column to enps_responses table
-- This allows filtering eNPS responses by squad

ALTER TABLE enps_responses 
ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES squads(id) ON DELETE SET NULL;

-- Add index for squad_id lookups
CREATE INDEX IF NOT EXISTS idx_enps_responses_squad_id ON enps_responses(squad_id);

-- Update the unique constraint to include squad_id (optional - allows same developer to respond for different squads)
-- First, drop the old constraint if it exists
ALTER TABLE enps_responses 
DROP CONSTRAINT IF EXISTS unique_respondent_survey_date;

-- Add new constraint that includes squad_id
-- This allows a developer to respond for different squads on the same date
ALTER TABLE enps_responses 
ADD CONSTRAINT unique_respondent_survey_date_squad 
UNIQUE (respondent_id, survey_date, squad_id);

-- Add comment
COMMENT ON COLUMN enps_responses.squad_id IS 'Squad the respondent belongs to when answering the survey. NULL if not specified.';

