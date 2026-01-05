-- Create role_permission_config table to store custom role permissions
-- This allows admins to override default permissions from the application config

CREATE TABLE IF NOT EXISTS role_permission_config (
  role TEXT PRIMARY KEY,
  modules TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permission_config_role ON role_permission_config(role);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_permission_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_role_permission_config_updated_at
  BEFORE UPDATE ON role_permission_config
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permission_config_updated_at();

-- Add RLS (Row Level Security) policies
-- Note: Since this project uses custom authentication (app_users/user_sessions),
-- we'll disable RLS and handle security in the application layer
-- The RoleAccess component already verifies admin role before allowing access

-- Option 1: Disable RLS (simpler, security handled in app)
ALTER TABLE role_permission_config DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to enable RLS later, use these policies:
-- ALTER TABLE role_permission_config ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow read access (role check in application)
-- CREATE POLICY "Allow read role_permission_config"
--   ON role_permission_config
--   FOR SELECT
--   USING (true);
-- 
-- -- Allow insert/update/delete (role check in application)
-- CREATE POLICY "Allow manage role_permission_config"
--   ON role_permission_config
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Insert default permissions (optional - can be done via application)
-- These match the default permissions from permissions.js
-- Uncomment if you want to initialize with defaults:

/*
INSERT INTO role_permission_config (role, modules) VALUES
  ('admin', ARRAY['overall', 'product', 'delivery', 'strata', 'admin', 'user-admin', 'role-access', 'pm', 'projects-metrics', 'developer-metrics', 'team-capacity', 'kpis', 'software-engineering-benchmarks']),
  ('stakeholder', ARRAY['overall', 'product', 'delivery', 'strata', 'projects-metrics', 'developer-metrics', 'kpis', 'software-engineering-benchmarks']),
  ('regular', ARRAY['overall', 'kpis']),
  ('3amigos', ARRAY['overall', 'product', 'delivery', 'strata', 'pm', 'projects-metrics', 'developer-metrics', 'team-capacity', 'kpis', 'software-engineering-benchmarks']),
  ('pm', ARRAY['overall', 'product', 'delivery', 'strata', 'pm', 'projects-metrics', 'developer-metrics', 'team-capacity', 'kpis', 'software-engineering-benchmarks'])
ON CONFLICT (role) DO NOTHING;
*/

-- Verification query
SELECT 
  role,
  array_length(modules, 1) as module_count,
  modules,
  updated_at
FROM role_permission_config
ORDER BY role;

