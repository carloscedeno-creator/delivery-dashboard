-- =====================================================
-- TABLA: deployments
-- Propósito: Almacenar información de deployments para calcular
--            Change Failure Rate y Deploy Frequency preciso
-- Estado: Estructura lista, sincronización "To Be Connected"
-- =====================================================

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_date TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production', 'development')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rollback')),
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  deployed_by_id UUID REFERENCES developers(id) ON DELETE SET NULL,
  rollback_date TIMESTAMPTZ,
  failure_reason TEXT,
  deployment_duration_seconds INTEGER, -- Duración del deployment en segundos
  version TEXT, -- Versión desplegada (opcional)
  commit_hash TEXT, -- Hash del commit desplegado (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_deployments_deploy_date ON deployments(deploy_date DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_sprint_id ON deployments(sprint_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_by ON deployments(deployed_by_id);

-- Índice compuesto para consultas de Change Failure Rate
CREATE INDEX IF NOT EXISTS idx_deployments_env_status_date 
ON deployments(environment, status, deploy_date DESC);

-- Comentarios para documentación
COMMENT ON TABLE deployments IS 
'Tabla para almacenar información de deployments. 
Sincronización desde CI/CD: To Be Connected';

COMMENT ON COLUMN deployments.environment IS 
'Ambiente donde se desplegó: staging, production, development';

COMMENT ON COLUMN deployments.status IS 
'Estado del deployment: success, failure, rollback';

COMMENT ON COLUMN deployments.sprint_id IS 
'Sprint asociado al deployment (opcional)';

COMMENT ON COLUMN deployments.deployed_by_id IS 
'Desarrollador que realizó el deployment (opcional)';

COMMENT ON COLUMN deployments.rollback_date IS 
'Fecha del rollback si el deployment fue revertido';

COMMENT ON COLUMN deployments.failure_reason IS 
'Razón del fallo si status = failure';

COMMENT ON COLUMN deployments.deployment_duration_seconds IS 
'Duración del deployment en segundos (útil para métricas)';

COMMENT ON COLUMN deployments.version IS 
'Versión desplegada (ej: v1.2.3)';

COMMENT ON COLUMN deployments.commit_hash IS 
'Hash del commit desplegado (para trazabilidad)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deployments_updated_at
BEFORE UPDATE ON deployments
FOR EACH ROW
EXECUTE FUNCTION update_deployments_updated_at();

-- =====================================================
-- NOTA: Sincronización de Datos
-- =====================================================
-- Esta tabla está lista para recibir datos, pero la sincronización
-- desde CI/CD (GitHub Actions, GitLab CI, Jenkins, etc.) está marcada
-- como "To Be Connected".
--
-- Para poblar datos inicialmente:
-- 1. Puede hacerse manualmente insertando registros
-- 2. O esperar a la integración con CI/CD
--
-- Ejemplo de inserción manual:
-- INSERT INTO deployments (deploy_date, environment, status, sprint_id)
-- VALUES (NOW(), 'production', 'success', (SELECT id FROM sprints LIMIT 1));
-- =====================================================

