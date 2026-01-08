-- Create squad_sprint_developers table
-- Stores which developers are participating in a sprint for a specific squad
-- This allows tracking team composition per sprint

CREATE TABLE IF NOT EXISTS squad_sprint_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_sprint_capacity_id UUID NOT NULL REFERENCES squad_sprint_capacity(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  is_participating BOOLEAN NOT NULL DEFAULT true,
  capacity_allocation_sp DECIMAL(10, 2) DEFAULT NULL, -- Optional: individual capacity allocation
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(squad_sprint_capacity_id, developer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_squad_sprint_devs_capacity ON squad_sprint_developers(squad_sprint_capacity_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_devs_developer ON squad_sprint_developers(developer_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_devs_participating ON squad_sprint_developers(is_participating);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_squad_sprint_developers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_squad_sprint_developers_updated_at
  BEFORE UPDATE ON squad_sprint_developers
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_sprint_developers_updated_at();

-- Disable RLS (security handled in application layer)
ALTER TABLE squad_sprint_developers DISABLE ROW LEVEL SECURITY;

-- View: Squad Sprint Developers with developer info
CREATE OR REPLACE VIEW v_squad_sprint_developers_complete AS
SELECT 
  ssd.id,
  ssd.squad_sprint_capacity_id,
  ssc.squad_id,
  ssc.sprint_id,
  ssd.developer_id,
  d.display_name as developer_name,
  d.email as developer_email,
  ssd.is_participating,
  ssd.capacity_allocation_sp,
  ssd.notes,
  ssd.created_at,
  ssd.updated_at
FROM squad_sprint_developers ssd
INNER JOIN squad_sprint_capacity ssc ON ssd.squad_sprint_capacity_id = ssc.id
INNER JOIN developers d ON ssd.developer_id = d.id;

COMMENT ON VIEW v_squad_sprint_developers_complete IS 
'Complete view of squad sprint developers with developer information';

-- Verification query
SELECT 
  'squad_sprint_developers' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT squad_sprint_capacity_id) as unique_capacity_records,
  COUNT(DISTINCT developer_id) as unique_developers,
  COUNT(*) FILTER (WHERE is_participating = true) as participating_count
FROM squad_sprint_developers;

