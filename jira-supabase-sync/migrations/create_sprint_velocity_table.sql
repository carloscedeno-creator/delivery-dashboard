-- Migration: Create table for Sprint Velocity Report data
-- This stores commitment (SP at start) and completed (SP at end) for each sprint

-- Table for sprint velocity (one row per sprint)
CREATE TABLE IF NOT EXISTS sprint_velocity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  sprint_name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  complete_date TIMESTAMPTZ,
  commitment NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Story points committed at sprint start
  completed NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Story points completed at sprint end
  commitment_tickets INTEGER NOT NULL DEFAULT 0, -- Number of tickets with SP at start
  completed_tickets INTEGER NOT NULL DEFAULT 0, -- Number of tickets completed
  total_tickets INTEGER NOT NULL DEFAULT 0, -- Total tickets in sprint
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sprint_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sprint_velocity_sprint_id ON sprint_velocity(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_velocity_sprint_name ON sprint_velocity(sprint_name);
CREATE INDEX IF NOT EXISTS idx_sprint_velocity_end_date ON sprint_velocity(end_date);

-- Comments for documentation
COMMENT ON TABLE sprint_velocity IS 'Velocity report data for each sprint: commitment (SP at start) and completed (SP at end)';
COMMENT ON COLUMN sprint_velocity.commitment IS 'Total story points committed at the start of the sprint';
COMMENT ON COLUMN sprint_velocity.completed IS 'Total story points completed at the end of the sprint';
COMMENT ON COLUMN sprint_velocity.commitment_tickets IS 'Number of tickets with story points at sprint start';
COMMENT ON COLUMN sprint_velocity.completed_tickets IS 'Number of tickets completed at sprint end';
