-- Create squad_sprint_capacity table
-- Stores capacity goals and actual capacity by squad and sprint

CREATE TABLE IF NOT EXISTS squad_sprint_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  capacity_goal_sp DECIMAL(10, 2) NOT NULL DEFAULT 0,
  capacity_available_sp DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sp_done DECIMAL(10, 2) GENERATED ALWAYS AS (
    -- Calculated: Sum of story points from issues that reached "Done" or "Development Done" during the sprint
    COALESCE((
      SELECT SUM(COALESCE(i.story_points, 0))
      FROM issues i
      INNER JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
      INNER JOIN sprints s ON is_rel.sprint_id = s.id
      WHERE is_rel.sprint_id = squad_sprint_capacity.sprint_id
        AND i.squad_id = squad_sprint_capacity.squad_id
        AND (
          -- Issue was resolved during sprint dates
          (
            i.resolved_date IS NOT NULL
            AND i.resolved_date::DATE >= s.start_date
            AND i.resolved_date::DATE <= COALESCE(s.end_date, CURRENT_DATE)
            AND (
              LOWER(i.current_status) IN ('done', 'development done', 'resolved', 'closed', 'finished')
              OR LOWER(is_rel.status_at_sprint_close) IN ('done', 'development done', 'resolved', 'closed', 'finished')
            )
          )
          OR
          -- Issue status history shows it reached Done during sprint
          (
            i.status_by_sprint IS NOT NULL
            AND i.status_by_sprint != '{}'::JSONB
            AND EXISTS (
              SELECT 1
              FROM jsonb_each_text(i.status_by_sprint) AS status_entry
              WHERE status_entry.key = s.sprint_name
                AND LOWER(status_entry.value) IN ('done', 'development done', 'resolved', 'closed', 'finished')
            )
          )
        )
    ), 0)
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_by_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  UNIQUE(squad_id, sprint_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_squad ON squad_sprint_capacity(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_sprint ON squad_sprint_capacity(sprint_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_composite ON squad_sprint_capacity(squad_id, sprint_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_squad_sprint_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_squad_sprint_capacity_updated_at
  BEFORE UPDATE ON squad_sprint_capacity
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_sprint_capacity_updated_at();

-- Function: Calculate SP Done for a squad and sprint
-- This function can be called to recalculate sp_done if needed
CREATE OR REPLACE FUNCTION calculate_squad_sprint_sp_done(
  p_squad_id UUID,
  p_sprint_id UUID
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_sp_done DECIMAL(10, 2) := 0;
  v_sprint RECORD;
BEGIN
  -- Get sprint dates
  SELECT start_date, end_date, sprint_name INTO v_sprint
  FROM sprints
  WHERE id = p_sprint_id;

  IF v_sprint IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate SP from issues that reached Done during sprint
  SELECT COALESCE(SUM(COALESCE(i.story_points, 0)), 0) INTO v_sp_done
  FROM issues i
  INNER JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
  WHERE is_rel.sprint_id = p_sprint_id
    AND i.squad_id = p_squad_id
    AND (
      -- Issue was resolved during sprint dates
      (
        i.resolved_date IS NOT NULL
        AND i.resolved_date::DATE >= v_sprint.start_date
        AND i.resolved_date::DATE <= COALESCE(v_sprint.end_date, CURRENT_DATE)
        AND (
          LOWER(i.current_status) IN ('done', 'development done', 'resolved', 'closed', 'finished')
          OR LOWER(is_rel.status_at_sprint_close) IN ('done', 'development done', 'resolved', 'closed', 'finished')
        )
      )
      OR
      -- Issue status history shows it reached Done during sprint
      (
        i.status_by_sprint IS NOT NULL
        AND i.status_by_sprint != '{}'::JSONB
        AND EXISTS (
          SELECT 1
          FROM jsonb_each_text(i.status_by_sprint) AS status_entry
          WHERE status_entry.key = v_sprint.sprint_name
            AND LOWER(status_entry.value) IN ('done', 'development done', 'resolved', 'closed', 'finished')
        )
      )
    );

  RETURN v_sp_done;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_squad_sprint_sp_done IS 
'Calculates SP Done for a squad and sprint based on issues that reached Done or Development Done status during the sprint dates';

-- Function: Recalculate SP Done for all capacity records
-- Useful for batch updates after data sync
CREATE OR REPLACE FUNCTION recalculate_all_sp_done()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Note: Since sp_done is a GENERATED column, we need to update the table
  -- to trigger recalculation. We'll update updated_at to force recalculation.
  FOR v_record IN 
    SELECT id FROM squad_sprint_capacity
  LOOP
    UPDATE squad_sprint_capacity
    SET updated_at = NOW()
    WHERE id = v_record.id;
    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_sp_done IS 
'Recalculates SP Done for all capacity records by updating them (triggers GENERATED column recalculation)';

-- Add RLS (Row Level Security) policies
-- Note: Since this project uses custom authentication (app_users/user_sessions),
-- we'll disable RLS and handle security in the application layer
-- The TeamCapacity component already verifies admin/pm/3amigos role before allowing access

-- Option 1: Disable RLS (simpler, security handled in app)
ALTER TABLE squad_sprint_capacity DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to enable RLS later, use these policies:
-- ALTER TABLE squad_sprint_capacity ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow read access (role check in application)
-- CREATE POLICY "Allow read squad_sprint_capacity"
--   ON squad_sprint_capacity
--   FOR SELECT
--   USING (true);
-- 
-- -- Allow insert/update/delete (role check in application)
-- CREATE POLICY "Allow manage squad_sprint_capacity"
--   ON squad_sprint_capacity
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- View: Squad Sprint Capacity with calculated metrics
CREATE OR REPLACE VIEW v_squad_sprint_capacity_complete AS
SELECT 
  ssc.id,
  ssc.squad_id,
  sq.squad_name,
  sq.squad_key,
  ssc.sprint_id,
  sp.sprint_name,
  sp.start_date,
  sp.end_date,
  sp.state as sprint_state,
  ssc.capacity_goal_sp,
  ssc.capacity_available_sp,
  ssc.sp_done,
  -- Calculated metrics
  CASE 
    WHEN ssc.capacity_goal_sp > 0 
    THEN ROUND((ssc.sp_done / ssc.capacity_goal_sp) * 100, 2)
    ELSE 0
  END as completion_percentage,
  CASE 
    WHEN ssc.capacity_available_sp > 0 
    THEN ROUND((ssc.sp_done / ssc.capacity_available_sp) * 100, 2)
    ELSE 0
  END as utilization_percentage,
  ssc.capacity_goal_sp - ssc.sp_done as remaining_sp,
  ssc.created_at,
  ssc.updated_at,
  u1.display_name as created_by_name,
  u2.display_name as updated_by_name
FROM squad_sprint_capacity ssc
INNER JOIN squads sq ON ssc.squad_id = sq.id
INNER JOIN sprints sp ON ssc.sprint_id = sp.id
LEFT JOIN users u1 ON ssc.created_by_id = u1.id
LEFT JOIN users u2 ON ssc.updated_by_id = u2.id;

COMMENT ON VIEW v_squad_sprint_capacity_complete IS 
'Complete view of squad sprint capacity with calculated metrics and related data';

-- Verification query
SELECT 
  'squad_sprint_capacity' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT squad_id) as unique_squads,
  COUNT(DISTINCT sprint_id) as unique_sprints,
  SUM(capacity_goal_sp) as total_capacity_goal,
  SUM(capacity_available_sp) as total_capacity_available,
  SUM(sp_done) as total_sp_done
FROM squad_sprint_capacity;

