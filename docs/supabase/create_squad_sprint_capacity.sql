-- =====================================================
-- CREAR TABLA squad_sprint_capacity
-- =====================================================
-- Tabla para almacenar la capacidad planificada por squad y sprint
-- Esta tabla es utilizada por el módulo PM (Project Manager) para
-- ingresar la capacidad planificada que luego se usa en Capacity Accuracy KPI
-- =====================================================

-- Crear tabla squad_sprint_capacity
CREATE TABLE IF NOT EXISTS public.squad_sprint_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    capacity_goal_sp DECIMAL(10,2) DEFAULT 0,
    capacity_available_sp DECIMAL(10,2) DEFAULT 0,
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: un squad solo puede tener una capacidad por sprint
    UNIQUE(squad_id, sprint_id)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_squad_id ON public.squad_sprint_capacity(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_sprint_id ON public.squad_sprint_capacity(sprint_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_capacity_squad_sprint ON public.squad_sprint_capacity(squad_id, sprint_id);

-- Comentarios
COMMENT ON TABLE public.squad_sprint_capacity IS 
'Capacidad planificada por squad y sprint. Ingresada por PM en el módulo Team Capacity.';

COMMENT ON COLUMN public.squad_sprint_capacity.capacity_goal_sp IS 
'Meta de capacidad en Story Points para el sprint (objetivo planificado)';

COMMENT ON COLUMN public.squad_sprint_capacity.capacity_available_sp IS 
'Capacidad disponible en Story Points para el sprint (capacidad real disponible)';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_squad_sprint_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_squad_sprint_capacity_updated_at ON public.squad_sprint_capacity;
CREATE TRIGGER trigger_update_squad_sprint_capacity_updated_at
    BEFORE UPDATE ON public.squad_sprint_capacity
    FOR EACH ROW
    EXECUTE FUNCTION update_squad_sprint_capacity_updated_at();

-- =====================================================
-- CREAR TABLA squad_sprint_developers
-- =====================================================
-- Tabla para almacenar qué developers participan en cada capacity record
-- y cuánta capacidad se les asigna
-- =====================================================

CREATE TABLE IF NOT EXISTS public.squad_sprint_developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_sprint_capacity_id UUID NOT NULL REFERENCES public.squad_sprint_capacity(id) ON DELETE CASCADE,
    developer_id UUID NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
    is_participating BOOLEAN DEFAULT true,
    capacity_allocation_sp DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: un developer solo puede aparecer una vez por capacity record
    UNIQUE(squad_sprint_capacity_id, developer_id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_squad_sprint_developers_capacity_id ON public.squad_sprint_developers(squad_sprint_capacity_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_developers_developer_id ON public.squad_sprint_developers(developer_id);
CREATE INDEX IF NOT EXISTS idx_squad_sprint_developers_participating ON public.squad_sprint_developers(squad_sprint_capacity_id, is_participating);

-- Comentarios
COMMENT ON TABLE public.squad_sprint_developers IS 
'Relación entre developers y capacity records. Indica qué developers participan y cuánta capacidad se les asigna.';

COMMENT ON COLUMN public.squad_sprint_developers.is_participating IS 
'Indica si el developer está participando activamente en el sprint';

COMMENT ON COLUMN public.squad_sprint_developers.capacity_allocation_sp IS 
'Cantidad de Story Points asignados a este developer para el sprint';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_squad_sprint_developers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_squad_sprint_developers_updated_at ON public.squad_sprint_developers;
CREATE TRIGGER trigger_update_squad_sprint_developers_updated_at
    BEFORE UPDATE ON public.squad_sprint_developers
    FOR EACH ROW
    EXECUTE FUNCTION update_squad_sprint_developers_updated_at();

-- =====================================================
-- HABILITAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en squad_sprint_capacity
ALTER TABLE public.squad_sprint_capacity ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden leer
CREATE POLICY "Anyone can read squad_sprint_capacity"
    ON public.squad_sprint_capacity
    FOR SELECT
    USING (true);

-- Política: usuarios autenticados pueden insertar/actualizar
CREATE POLICY "Authenticated users can insert squad_sprint_capacity"
    ON public.squad_sprint_capacity
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update squad_sprint_capacity"
    ON public.squad_sprint_capacity
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Habilitar RLS en squad_sprint_developers
ALTER TABLE public.squad_sprint_developers ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden leer
CREATE POLICY "Anyone can read squad_sprint_developers"
    ON public.squad_sprint_developers
    FOR SELECT
    USING (true);

-- Política: usuarios autenticados pueden insertar/actualizar/eliminar
CREATE POLICY "Authenticated users can insert squad_sprint_developers"
    ON public.squad_sprint_developers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update squad_sprint_developers"
    ON public.squad_sprint_developers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete squad_sprint_developers"
    ON public.squad_sprint_developers
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- CREAR VISTAS (VIEWS)
-- =====================================================

-- Vista completa de squad_sprint_capacity con información de squads y sprints
CREATE OR REPLACE VIEW public.v_squad_sprint_capacity_complete AS
SELECT 
    ssc.id,
    ssc.squad_id,
    ssc.sprint_id,
    ssc.capacity_goal_sp,
    ssc.capacity_available_sp,
    ssc.created_by_id,
    ssc.updated_by_id,
    ssc.created_at,
    ssc.updated_at,
    sq.squad_key,
    sq.squad_name,
    sp.sprint_name,
    sp.start_date,
    sp.end_date,
    sp.complete_date,
    sp.state as sprint_state
FROM public.squad_sprint_capacity ssc
LEFT JOIN public.squads sq ON sq.id = ssc.squad_id
LEFT JOIN public.sprints sp ON sp.id = ssc.sprint_id;

COMMENT ON VIEW public.v_squad_sprint_capacity_complete IS 
'Vista completa de squad_sprint_capacity con información de squads y sprints';

-- Vista completa de squad_sprint_developers con información de developers
CREATE OR REPLACE VIEW public.v_squad_sprint_developers_complete AS
SELECT 
    ssd.id,
    ssd.squad_sprint_capacity_id,
    ssd.developer_id,
    ssd.is_participating,
    ssd.capacity_allocation_sp,
    ssd.created_at,
    ssd.updated_at,
    d.display_name as developer_name,
    d.email as developer_email,
    ssc.squad_id,
    ssc.sprint_id,
    sq.squad_name,
    sp.sprint_name
FROM public.squad_sprint_developers ssd
LEFT JOIN public.developers d ON d.id = ssd.developer_id
LEFT JOIN public.squad_sprint_capacity ssc ON ssc.id = ssd.squad_sprint_capacity_id
LEFT JOIN public.squads sq ON sq.id = ssc.squad_id
LEFT JOIN public.sprints sp ON sp.id = ssc.sprint_id;

COMMENT ON VIEW public.v_squad_sprint_developers_complete IS 
'Vista completa de squad_sprint_developers con información de developers, squads y sprints';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta estas consultas para verificar que las tablas se crearon correctamente:

-- SELECT * FROM information_schema.tables WHERE table_name = 'squad_sprint_capacity';
-- SELECT * FROM information_schema.tables WHERE table_name = 'squad_sprint_developers';
-- SELECT * FROM information_schema.views WHERE table_name = 'v_squad_sprint_capacity_complete';
-- SELECT * FROM information_schema.views WHERE table_name = 'v_squad_sprint_developers_complete';

