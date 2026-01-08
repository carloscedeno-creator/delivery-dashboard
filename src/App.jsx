import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AlertCircle, Menu, TrendingUp } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DataSourceSelector from './components/DataSourceSelector';
import Login from './components/Login';

// Lazy load de componentes para mejor HMR y rendimiento
const OverallView = lazy(() => import('./components/OverallView.jsx'));
const ProductRoadmapView = lazy(() => import('./components/ProductRoadmapView.jsx'));
const DeliveryRoadmapView = lazy(() => import('./components/DeliveryRoadmapView.jsx'));
const ProjectsMetrics = lazy(() => import('./components/ProjectsMetrics.jsx'));
const DeveloperMetrics = lazy(() => import('./components/DeveloperMetrics.jsx'));
const TeamCapacity = lazy(() => import('./components/TeamCapacity.jsx'));
const TeamAllocation = lazy(() => import('./components/TeamAllocation.jsx'));
const ProductDepartmentKPIs = lazy(() => import('./components/ProductDepartmentKPIs.jsx'));
const UserAdministration = lazy(() => import('./components/UserAdministration.jsx'));
const RoleAccess = lazy(() => import('./components/RoleAccess.jsx'));
const KPIsView = lazy(() => import('./components/KPIsView.jsx'));
const DeliveryKPIs = lazy(() => import('./components/DeliveryKPIs.jsx'));
const QualityKPIs = lazy(() => import('./components/QualityKPIs.jsx'));
const ENPSSurvey = lazy(() => import('./components/ENPSSurvey.jsx'));
const ENPSSurveyManagement = lazy(() => import('./components/ENPSSurveyManagement.jsx'));
import { parseCSV } from './utils/csvParser';
import { DELIVERY_ROADMAP, PRODUCT_ROADMAP, buildProxiedUrl } from './config/dataSources';
import { getDeliveryRoadmapData, getDeveloperAllocationData } from './utils/supabaseApi';
import { canAccessModule, getModulesForRoleSync, MODULES } from './config/permissions';
import { getCurrentUser } from './utils/authService';

// URLs de las hojas usando la configuración centralizada
const SHEET_URLS = {
    project: DELIVERY_ROADMAP.sheets.projects.url,
    allocation: DELIVERY_ROADMAP.sheets.allocation.url,
    productInitiatives: PRODUCT_ROADMAP.sheets.initiatives.url,
    productBugRelease: PRODUCT_ROADMAP.sheets.bugRelease.url
};

// Mock Data
const MOCK_PROJECT_DATA = [
    { squad: 'Core Infrastructure', initiative: 'Cloud Migration', start: '2024-01-01', status: 85, delivery: '2024-06-30', spi: 1.1, allocation: 4.5, comments: 'Ahead of schedule', scope: 'Migrate legacy systems to AWS', dev: 'Luis Mays', percentage: 100 },
    { squad: 'Core Infrastructure', initiative: 'Database Optimization', start: '2024-02-15', status: 45, delivery: '2024-08-15', spi: 0.9, allocation: 3.0, comments: 'Slight delays due to complexity', scope: 'Optimize SQL queries', dev: 'Mauricio Leal', percentage: 80 },
    { squad: 'Integration', initiative: 'API Gateway V2', start: '2024-03-01', status: 30, delivery: '2024-09-30', spi: 0.95, allocation: 4.0, comments: 'On track', scope: 'New API Gateway implementation', dev: 'Arslan Arif', percentage: 100 },
    { squad: 'Product Growth', initiative: 'User Onboarding Flow', start: '2024-04-01', status: 15, delivery: '2024-07-31', spi: 0.7, allocation: 2.5, comments: 'Resource constraints', scope: 'Revamp onboarding experience', dev: 'Abdel Beltran', percentage: 50 },
    { squad: 'Mobile', initiative: 'iOS App Redesign', start: '2024-01-15', status: 95, delivery: '2024-05-15', spi: 1.2, allocation: 5.0, comments: 'Ready for release', scope: 'Complete UI overhaul', dev: 'Himani', percentage: 100 }
];

const MOCK_ALLOCATION_DATA = [
    { squad: 'Core Infrastructure', initiative: 'Cloud Migration', dev: 'Luis Mays', percentage: 100 },
    { squad: 'Core Infrastructure', initiative: 'Database Optimization', dev: 'Mauricio Leal', percentage: 80 },
    { squad: 'Integration', initiative: 'API Gateway V2', dev: 'Arslan Arif', percentage: 100 },
    { squad: 'Product Growth', initiative: 'User Onboarding Flow', dev: 'Abdel Beltran', percentage: 50 },
    { squad: 'Mobile', initiative: 'iOS App Redesign', dev: 'Himani', percentage: 100 }
];

function App() {
    const [activeView, setActiveView] = useState('overall');
    const [projectData, setProjectData] = useState([]);
    const [devAllocationData, setDevAllocationData] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // Listen for navigation to survey from login page
    useEffect(() => {
        const handleNavigateToSurvey = () => {
            setActiveView('enps-survey');
        };
        window.addEventListener('navigateToSurvey', handleNavigateToSurvey);
        return () => {
            window.removeEventListener('navigateToSurvey', handleNavigateToSurvey);
        };
    }, []);
    
    // Obtener usuario actual y verificar permisos
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        
        // Si no hay usuario, redirigir a login o usar rol por defecto
        if (!user) {
            console.warn('[APP] No hay usuario autenticado, usando rol por defecto: regular');
        }
        
        // Verificar que el activeView sea accesible para el rol del usuario
        const userRole = user?.role || 'regular';
        const allowedModules = getModulesForRoleSync(userRole);
        
        if (Array.isArray(allowedModules) && !allowedModules.includes(activeView)) {
            // Si el módulo actual no está permitido, redirigir al primer módulo permitido
            console.warn(`[APP] Module ${activeView} not allowed for role ${userRole}, redirecting to ${allowedModules[0]}`);
            setActiveView(allowedModules[0] || 'overall');
        }
    }, []);
    
    // Debug: Log cuando projectData cambia
    useEffect(() => {
        console.log('🟡 [APP] projectData CHANGED:', {
            length: projectData?.length || 0,
            isArray: Array.isArray(projectData),
            activeView,
            sample: projectData?.slice(0, 2)
        });
    }, [projectData, activeView]);
    const [productInitiatives, setProductInitiatives] = useState([]);
    const [productBugRelease, setProductBugRelease] = useState([]);
    const [productRoadmapLastUpdate, setProductRoadmapLastUpdate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState('csv'); // 'db' (Supabase) o 'csv'

    const fetchWithFallback = useCallback(async (url) => {
        try {
            const fullUrl = buildProxiedUrl(url);
            const response = await fetch(fullUrl);
            if (response.ok) return await response.text();
            throw new Error('Network response was not ok');
        } catch (err) {
            console.error("Fetch failed:", err);
            throw err;
        }
    }, []);

    const loadData = useCallback(async (source) => {
            try {
                setLoading(true);
                setError(null);
                
                if (source === 'db') {
                    // Load from Supabase (Database)
                    try {
                        console.log('[APP] 🔄 Loading data from Database (Supabase)...');
                        
                        // Verify that Supabase is configured before attempting to load
                        const { supabase } = await import('./utils/supabaseApi.js');
                        if (!supabase) {
                            throw new Error('Supabase is not configured. Check environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
                        }
                        
                        const [deliveryData, allocationData] = await Promise.all([
                            getDeliveryRoadmapData(),
                            getDeveloperAllocationData()
                        ]);
                        
                        // Validar que realmente hay datos
                        if (!deliveryData || deliveryData.length === 0) {
                            throw new Error('Database returned empty data. Verify that the sync service has run.');
                        }
                        
                        console.log('[APP] 🔵 ANTES de setProjectData:', {
                            deliveryDataLength: deliveryData?.length || 0,
                            deliveryDataType: Array.isArray(deliveryData) ? 'array' : typeof deliveryData,
                            firstItem: deliveryData?.[0]
                        });
                        setProjectData(deliveryData);
                        setDevAllocationData(allocationData);
                        setDataSource('db');
                        console.log('[APP] ✅ Delivery data loaded from Database:', {
                            projects: deliveryData.length,
                            allocations: allocationData.length,
                            sampleProject: deliveryData[0]?.initiative || 'N/A',
                            sampleStart: deliveryData[0]?.start || 'N/A',
                            sampleDelivery: deliveryData[0]?.delivery || 'N/A'
                        });
                    } catch (dbError) {
                        // If Supabase is not configured or there's an error, fallback to CSV
                        const isSupabaseNotConfigured = dbError.message?.includes('Supabase is not configured') || 
                                                       dbError.message?.includes('not configured');
                        
                        console.warn('[APP] ⚠️ Error loading from Database:', dbError.message);
                        
                        if (isSupabaseNotConfigured) {
                            console.info('[APP] ℹ️ Supabase not configured, falling back to CSV...');
                            // Automatic fallback to CSV
                            throw new Error('FALLBACK_TO_CSV');
                        } else {
                            // For other errors, show message but also try fallback
                            console.error('[APP] ❌ Error loading from Database:', dbError);
                            setError(`Error loading from Database: ${dbError.message}. Attempting to load from CSV...`);
                            throw new Error('FALLBACK_TO_CSV');
                        }
                    }
                } else {
                    // Load from CSV
                    try {
                        console.log('[APP] 🔄 Loading data from CSV...');
                        const [projText, allocText] = await Promise.all([
                            fetchWithFallback(SHEET_URLS.project),
                            fetchWithFallback(SHEET_URLS.allocation)
                        ]);
                        setProjectData(parseCSV(projText, 'project'));
                        setDevAllocationData(parseCSV(allocText, 'allocation'));
                        setDataSource('csv');
                        console.log('[APP] ✅ Datos de delivery cargados desde CSV');
                    } catch (csvError) {
                        console.error('[APP] ❌ Error loading CSV:', csvError);
                        setError(`Error loading CSV: ${csvError.message}`);
                        throw csvError;
                    }
                }

                setLoading(false);
            } catch (err) {
                // If Supabase is not configured, don't set error here
                // Let external catch handle CSV fallback
                const isSupabaseNotConfigured = err.message?.includes('Supabase is not configured');
                if (!isSupabaseNotConfigured) {
                    console.error("[APP] Error loading data:", err);
                    setError(`Error: ${err.message}`);
                }
                setLoading(false);
                // Re-lanzar el error para que el catch externo pueda manejarlo
                throw err;
            }
    }, [fetchWithFallback]);

    // Cargar Product Roadmap desde base de datos (product_department_kpis table)
    useEffect(() => {
        let isMounted = true;
        
        const loadProductRoadmap = async () => {
            try {
                console.log('[APP] 🔄 Loading Product Roadmap from database...');
                
                // Importar dinámicamente para evitar problemas de circular dependencies
                const { getProductRoadmapInitiatives, getLastUpdateTimestamp } = await import('./services/productDepartmentKPIService.js');
                const [initiatives, lastUpdate] = await Promise.all([
                    getProductRoadmapInitiatives(),
                    getLastUpdateTimestamp()
                ]);
                
                if (!isMounted) return;
                
                console.log('[APP] ✅ Product Roadmap cargado desde base de datos:', {
                    initiatives: initiatives.length,
                    bugs: 0, // productBugRelease no está en la base de datos aún
                    sampleInitiative: initiatives[0],
                    lastUpdate
                });
                
                if (isMounted) {
                    setProductInitiatives(initiatives);
                    setProductBugRelease([]); // Empty array - bug/release data not in database yet
                    setProductRoadmapLastUpdate(lastUpdate);
                }
            } catch (err) {
                console.error('[APP] ❌ Error loading Product Roadmap from database:', err);
                console.error('[APP] ❌ Error details:', {
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                });
                
                // Fallback: try CSV if database fails
                try {
                    console.log('[APP] 🔄 Fallback: Loading Product Roadmap from CSV...');
                    const [prodInitText, prodBugText] = await Promise.all([
                        fetchWithFallback(SHEET_URLS.productInitiatives),
                        fetchWithFallback(SHEET_URLS.productBugRelease)
                    ]);
                    
                    if (!isMounted) return;
                    
                    const initiatives = parseCSV(prodInitText, 'productInitiatives');
                    const bugs = parseCSV(prodBugText, 'productBugRelease');
                    
                    console.log('[APP] ✅ Product Roadmap cargado desde CSV (fallback):', {
                        initiatives: initiatives.length,
                        bugs: bugs.length
                    });
                    
                    if (isMounted) {
                        setProductInitiatives(initiatives);
                        setProductBugRelease(bugs);
                    }
                } catch (csvErr) {
                    console.error('[APP] ❌ Error loading Product Roadmap from CSV fallback:', csvErr);
                    // Aún así establecer arrays vacíos para que el componente se renderice
                    if (isMounted) {
                        setProductInitiatives([]);
                        setProductBugRelease([]);
                    }
                }
            }
        };
        
        loadProductRoadmap();
        
        return () => {
            isMounted = false;
        };
    }, [fetchWithFallback]);

    useEffect(() => {
        // Carga inicial: intentar desde BD primero, si falla usar CSV
        const initialLoad = async () => {
            try {
                await loadData('db');
            } catch (dbError) {
                // If Supabase is not configured, use CSV silently
                const isSupabaseNotConfigured = dbError.message?.includes('Supabase is not configured');
                if (isSupabaseNotConfigured) {
                    console.info('[APP] ℹ️ Supabase not configured, using CSV as data source');
                } else {
                    console.warn('[APP] ⚠️ Could not load from DB, trying CSV...', dbError.message);
                }
                try {
                    // Limpiar error anterior antes de intentar CSV
                    setError(null);
                    await loadData('csv');
                } catch (csvError) {
                    console.error('[APP] ❌ Error loading CSV:', csvError);
                    // If CSV also fails, show error
                    setError(`Could not load data. Error: ${csvError.message}`);
                }
            }
        };
        
        initialLoad();
    }, [loadData]);

    // Función para manejar el cambio de fuente de datos
    const handleDataSourceChange = useCallback(async (newSource) => {
        if (newSource !== dataSource) {
            console.log(`[APP] 🔄 Cambiando fuente de datos de ${dataSource} a ${newSource}`);
            setError(null); // Limpiar errores anteriores
            
            // Verify if Supabase is configured before attempting to use DB
            if (newSource === 'db') {
                try {
                    const { supabase } = await import('./utils/supabaseApi.js');
                    if (!supabase) {
                        console.warn('[APP] ⚠️ Supabase is not configured');
                        setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
                        // No cambiar el dataSource, mantener el actual
                        return;
                    }
                    // Intentar una consulta simple para verificar que funciona
                    const { error: testError } = await supabase.from('squads').select('id').limit(1);
                    if (testError && (testError.message?.includes('Invalid API key') || testError.message?.includes('JWT'))) {
                        console.warn('[APP] ⚠️ Supabase configured but with invalid credentials');
                        setError('Supabase credentials are invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
                        return;
                    }
                } catch (importError) {
                    console.error('[APP] ❌ Error importando Supabase:', importError);
                    setError('Could not verify Supabase configuration');
                    return;
                }
            }
            
            setDataSource(newSource);
            try {
                await loadData(newSource);
            } catch (err) {
                // Si hay un error y se solicitó fallback a CSV, hacerlo automáticamente
                if (err.message === 'FALLBACK_TO_CSV' && newSource === 'db') {
                    console.info('[APP] ℹ️ Automatically falling back to CSV');
                    setDataSource('csv');
                    try {
                        await loadData('csv');
                        // Limpiar el error después de cargar CSV exitosamente
                        setTimeout(() => setError(null), 3000);
                    } catch (csvError) {
                        console.error('[APP] ❌ Error en fallback a CSV:', csvError);
                        setError(`Error loading CSV: ${csvError.message}`);
                    }
                } else if (err.message?.includes('Supabase is not configured') && newSource === 'db') {
                    // If Supabase is not configured, automatically switch to CSV
                    console.info('[APP] ℹ️ Supabase no configurado, cambiando a CSV');
                    setDataSource('csv');
                    try {
                        await loadData('csv');
                        // Limpiar el error después de cargar CSV exitosamente
                        setTimeout(() => setError(null), 3000);
                    } catch (csvError) {
                        setError(`Error loading CSV: ${csvError.message}`);
                    }
                } else {
                    // Para otros errores, mostrar mensaje
                    console.error('[APP] ❌ Error:', err);
                    setError(`Error: ${err.message}`);
                }
            }
        }
    }, [dataSource, loadData]);

    // Si no hay usuario autenticado, mostrar Login o encuesta pública
    if (!currentUser && activeView !== 'enps-survey') {
        return (
            <Login 
                onLoginSuccess={(user) => {
                    setCurrentUser(user);
                    // Reload page to initialize everything with authenticated user
                    window.location.reload();
                }} 
            />
        );
    }

    // Only show loading if we're loading delivery roadmap AND it's not the product view
    // El Product Roadmap se carga independientemente
    if (loading && activeView !== 'product') {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    }
    
    // Solo mostrar error si no es la vista de product (para que Product Roadmap siempre se pueda ver)
    if (error && activeView !== 'product') {
        return <div className="min-h-screen flex items-center justify-center text-rose-400"><div className="text-center"><AlertCircle size={48} className="mx-auto mb-4" /><p>{error}</p></div></div>;
    }

    return (
        <div className="min-h-screen font-sans bg-[#0a0e17] flex">
            <Sidebar 
                activeView={activeView} 
                setActiveView={setActiveView}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            <div className={`flex-1 transition-all duration-300 ${currentUser ? (sidebarOpen ? 'md:ml-64' : 'md:ml-16') : ''} pt-8 px-8 pb-12`}>
                <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
                    {currentUser && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <Menu size={24} />
                        </button>
                    )}
                    {!currentUser && activeView === 'enps-survey' && (
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveView('overall');
                            }}
                            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                        >
                            ← Back to Login
                        </a>
                    )}
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            {activeView === 'overall' ? 'Overall Dashboard' : 
                             activeView === 'product' ? 'Product Roadmap' : 
                             activeView === 'delivery' ? 'Delivery Roadmap' :
                             activeView === 'projects-metrics' ? 'Project Metrics' :
                             activeView === 'developer-metrics' ? 'Developer Metrics' :
                             activeView === 'team-capacity' ? 'Team Capacity' :
                            activeView === 'team-allocation' ? 'Team Allocation' :
                            activeView === 'product-department-kpis' ? 'Product Raw Manual Raw Data' :
                            activeView === 'user-admin' ? 'User Administration' :
                             activeView === 'role-access' ? 'Role Access' :
                             activeView === 'kpis' ? 'KPIs Dashboard' :
                             activeView === 'delivery-kpis' ? 'Delivery KPIs' :
                             activeView === 'technical-kpis' ? 'Technical KPIs' :
                             activeView === 'product-kpis' ? 'Product KPIs' :
                             activeView === 'enps-survey' ? 'Team Satisfaction Survey' :
                             activeView === 'software-engineering-benchmarks' ? 'Software Engineering Benchmark' :
                             'Dashboard'}
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {activeView === 'overall' ? 'Strategic Overview & Combined Status' : 
                             activeView === 'product' ? 'Product Initiatives & Milestones' : 
                             activeView === 'delivery' ? 'Execution & Resource Allocation' :
                             activeView === 'projects-metrics' ? 'Comprehensive project performance analytics' :
                             activeView === 'developer-metrics' ? 'Team performance and allocation analytics' :
                             activeView === 'team-capacity' ? 'Configure team capacity for sprints' :
                            activeView === 'team-allocation' ? 'View team allocation report by squad and sprint' :
                            activeView === 'product-department-kpis' ? 'Manage Product Raw Manual Raw Data' :
                            activeView === 'enps-survey-management' ? 'Create and manage periodic eNPS surveys' :
                            activeView === 'user-admin' ? 'User management and administration' :
                             activeView === 'role-access' ? 'Manage user roles and permissions' :
                             activeView === 'kpis' ? 'Engineering metrics and performance indicators' :
                             activeView === 'delivery-kpis' ? 'Delivery performance metrics with filters' :
                             activeView === 'technical-kpis' ? 'Technical quality and performance metrics' :
                             activeView === 'product-kpis' ? 'Product department KPIs and metrics' :
                             activeView === 'enps-survey' ? 'Share your feedback about working in this team' :
                             activeView === 'software-engineering-benchmarks' ? 'Compare engineering metrics and team benchmarks' :
                             'Dashboard'}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        {/* DataSourceSelector solo para Delivery Roadmap, no para Product Roadmap */}
                        {activeView !== 'product' && (
                            <>
                                <DataSourceSelector 
                                    dataSource={dataSource} 
                                    onSourceChange={handleDataSourceChange}
                                    disabled={loading}
                                />
                                {dataSource === 'db' ? (
                                    <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span>Database</span>
                                    </div>
                                ) : (
                                    <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span>CSV</span>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Indicador fijo para Product Roadmap - ahora usa base de datos */}
                        {activeView === 'product' && (
                            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300 border border-amber-500/30">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span>
                                    {productRoadmapLastUpdate 
                                        ? `Last updated: ${new Date(productRoadmapLastUpdate).toLocaleString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}`
                                        : 'Product Roadmap (Database)'
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <main className="max-w-7xl mx-auto">
                    <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                        </div>
                    }>
                        {activeView === 'overall' && <OverallView />}
                        {activeView === 'product' && (() => {
                            // Debug: Verificar que Product Roadmap use datos de base de datos
                            console.log('[APP] 🟢 Renderizando Product Roadmap con datos de base de datos:', {
                                initiativesCount: productInitiatives.length,
                                bugsCount: productBugRelease.length,
                                sampleInitiative: productInitiatives[0],
                                source: 'CSV_ONLY',
                                timestamp: new Date().toISOString()
                            });
                            return (
                                <ProductRoadmapView 
                                    productInitiatives={productInitiatives} 
                                    productBugRelease={productBugRelease} 
                                />
                            );
                        })()}
                        {activeView === 'delivery' && <DeliveryRoadmapView projectData={projectData} devAllocationData={devAllocationData} />}
                        {activeView === 'projects-metrics' && canAccessModule(currentUser?.role || 'regular', MODULES.PROJECTS_METRICS) && (
                            <ProjectsMetrics />
                        )}
                        {activeView === 'developer-metrics' && canAccessModule(currentUser?.role || 'regular', MODULES.DEVELOPER_METRICS) && (
                            <DeveloperMetrics />
                        )}
                        {activeView === 'team-capacity' && canAccessModule(currentUser?.role || 'regular', MODULES.TEAM_CAPACITY) && (
                            <TeamCapacity />
                        )}
                        {activeView === 'team-allocation' && canAccessModule(currentUser?.role || 'regular', MODULES.TEAM_ALLOCATION) && (
                            <Suspense fallback={<div className="glass rounded-2xl p-12 text-center"><p className="text-slate-400">Loading...</p></div>}>
                                <TeamAllocation />
                            </Suspense>
                        )}
                        {activeView === 'product-department-kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.PRODUCT_DEPARTMENT_KPIS) && (
                            <Suspense fallback={<div className="glass rounded-2xl p-12 text-center"><p className="text-slate-400">Loading Product Raw Manual Raw Data...</p></div>}>
                                <ProductDepartmentKPIs />
                            </Suspense>
                        )}
                        {activeView === 'enps-survey-management' && canAccessModule(currentUser?.role || 'regular', MODULES.ENPS_SURVEY_MANAGEMENT) && (
                            <Suspense fallback={<div className="glass rounded-2xl p-12 text-center"><p className="text-slate-400">Loading eNPS Survey Management...</p></div>}>
                                <ENPSSurveyManagement />
                            </Suspense>
                        )}
                        {activeView === 'user-admin' && canAccessModule(currentUser?.role || 'regular', MODULES.USER_ADMIN) && (
                            <UserAdministration currentUser={currentUser} />
                        )}
                        {activeView === 'role-access' && canAccessModule(currentUser?.role || 'regular', MODULES.ROLE_ACCESS) && (
                            <RoleAccess />
                        )}
                        {activeView === 'kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.KPIS) && (
                            <KPIsView />
                        )}
                        {activeView === 'delivery-kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.DELIVERY_KPIS) && (
                            <KPIsView initialTab="delivery" />
                        )}
                        {activeView === 'technical-kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.TECHNICAL_KPIS) && (
                            <KPIsView initialTab="quality" />
                        )}
                        {activeView === 'product-kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.PRODUCT_KPIS) && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <TrendingUp size={48} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-3">
                                        Coming Soon
                                    </h2>
                                    <p className="text-slate-400 max-w-md mx-auto text-lg">
                                        Product KPIs está en desarrollo. Pronto podrás ver métricas y KPIs relacionados con productos.
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* eNPS Survey - accessible without authentication */}
                        {activeView === 'enps-survey' && (
                            <Suspense fallback={<div className="glass rounded-2xl p-12 text-center"><p className="text-slate-400">Loading survey...</p></div>}>
                                <ENPSSurvey />
                            </Suspense>
                        )}
                        {activeView === 'software-engineering-benchmarks' && canAccessModule(currentUser?.role || 'regular', MODULES.SOFTWARE_ENGINEERING_BENCHMARKS) && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <TrendingUp size={48} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-3">
                                        Coming Soon
                                    </h2>
                                    <p className="text-slate-400 max-w-md mx-auto text-lg">
                                        Software Engineering Benchmark está en desarrollo. Pronto podrás comparar métricas de ingeniería y ver benchmarks del equipo.
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* Check if user is trying to access a non-allowed module */}
                        {!canAccessModule(currentUser?.role || 'regular', activeView) && (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                                <AlertCircle size={48} className="text-rose-400" />
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
                                    <p className="text-slate-400 max-w-md mx-auto">
                                        You don't have permission to access this module.
                                    </p>
                                </div>
                            </div>
                        )}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}

export default App;
