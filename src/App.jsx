import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AlertCircle, Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DataSourceSelector from './components/DataSourceSelector';
import Login from './components/Login';

// Lazy load de componentes para mejor HMR y rendimiento
const OverallView = lazy(() => import('./components/OverallView'));
const ProductRoadmapView = lazy(() => import('./components/ProductRoadmapView'));
const DeliveryRoadmapView = lazy(() => import('./components/DeliveryRoadmapView'));
const ProjectsMetrics = lazy(() => import('./components/ProjectsMetrics'));
const DeveloperMetrics = lazy(() => import('./components/DeveloperMetrics'));
const UserAdministration = lazy(() => import('./components/UserAdministration'));
const KPIsView = lazy(() => import('./components/KPIsView'));
import { parseCSV } from './utils/csvParser';
import { DELIVERY_ROADMAP, PRODUCT_ROADMAP, buildProxiedUrl } from './config/dataSources';
import { getDeliveryRoadmapData, getDeveloperAllocationData } from './utils/supabaseApi';
import { canAccessModule, getModulesForRole, MODULES } from './config/permissions';
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
        const allowedModules = getModulesForRole(userRole);
        
        if (!allowedModules.includes(activeView)) {
            // Si el módulo actual no está permitido, redirigir al primer módulo permitido
            console.warn(`[APP] Módulo ${activeView} no permitido para rol ${userRole}, redirigiendo a ${allowedModules[0]}`);
            setActiveView(allowedModules[0] || 'overall');
        }
    }, []);
    
    // Debug: Log cuando projectData cambia
    useEffect(() => {
        console.log('🟡 [APP] projectData CAMBIÓ:', {
            length: projectData?.length || 0,
            isArray: Array.isArray(projectData),
            activeView,
            sample: projectData?.slice(0, 2)
        });
    }, [projectData, activeView]);
    const [productInitiatives, setProductInitiatives] = useState([]);
    const [productBugRelease, setProductBugRelease] = useState([]);
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
                    // Cargar desde Supabase (Base de Datos)
                    try {
                        console.log('[APP] 🔄 Cargando datos desde Base de Datos (Supabase)...');
                        
                        // Verificar que Supabase esté configurado antes de intentar cargar
                        const { supabase } = await import('./utils/supabaseApi.js');
                        if (!supabase) {
                            throw new Error('Supabase no está configurado. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
                        }
                        
                        const [deliveryData, allocationData] = await Promise.all([
                            getDeliveryRoadmapData(),
                            getDeveloperAllocationData()
                        ]);
                        
                        // Validar que realmente hay datos
                        if (!deliveryData || deliveryData.length === 0) {
                            throw new Error('Base de datos retornó datos vacíos. Verifica que el servicio de sync haya ejecutado.');
                        }
                        
                        console.log('[APP] 🔵 ANTES de setProjectData:', {
                            deliveryDataLength: deliveryData?.length || 0,
                            deliveryDataType: Array.isArray(deliveryData) ? 'array' : typeof deliveryData,
                            firstItem: deliveryData?.[0]
                        });
                        setProjectData(deliveryData);
                        setDevAllocationData(allocationData);
                        setDataSource('db');
                        console.log('[APP] ✅ Datos de delivery cargados desde Base de Datos:', {
                            projects: deliveryData.length,
                            allocations: allocationData.length,
                            sampleProject: deliveryData[0]?.initiative || 'N/A',
                            sampleStart: deliveryData[0]?.start || 'N/A',
                            sampleDelivery: deliveryData[0]?.delivery || 'N/A'
                        });
                    } catch (dbError) {
                        // Si Supabase no está configurado o hay error, hacer fallback a CSV
                        const isSupabaseNotConfigured = dbError.message?.includes('Supabase no está configurado') || 
                                                       dbError.message?.includes('no está configurado');
                        
                        console.warn('[APP] ⚠️ Error cargando desde Base de Datos:', dbError.message);
                        
                        if (isSupabaseNotConfigured) {
                            console.info('[APP] ℹ️ Supabase no configurado, haciendo fallback a CSV...');
                            // Hacer fallback automático a CSV
                            throw new Error('FALLBACK_TO_CSV');
                        } else {
                            // Para otros errores, mostrar mensaje pero también intentar fallback
                            console.error('[APP] ❌ Error cargando desde Base de Datos:', dbError);
                            setError(`Error cargando desde Base de Datos: ${dbError.message}. Intentando cargar desde CSV...`);
                            throw new Error('FALLBACK_TO_CSV');
                        }
                    }
                } else {
                    // Cargar desde CSV
                    try {
                        console.log('[APP] 🔄 Cargando datos desde CSV...');
                        const [projText, allocText] = await Promise.all([
                            fetchWithFallback(SHEET_URLS.project),
                            fetchWithFallback(SHEET_URLS.allocation)
                        ]);
                        setProjectData(parseCSV(projText, 'project'));
                        setDevAllocationData(parseCSV(allocText, 'allocation'));
                        setDataSource('csv');
                        console.log('[APP] ✅ Datos de delivery cargados desde CSV');
                    } catch (csvError) {
                        console.error('[APP] ❌ Error cargando CSV:', csvError);
                        setError(`Error cargando CSV: ${csvError.message}`);
                        throw csvError;
                    }
                }

                setLoading(false);
            } catch (err) {
                // Si Supabase no está configurado, no establecer error aquí
                // Dejar que el catch externo maneje el fallback a CSV
                const isSupabaseNotConfigured = err.message?.includes('Supabase no está configurado');
                if (!isSupabaseNotConfigured) {
                    console.error("[APP] Error cargando datos:", err);
                    setError(`Error: ${err.message}`);
                }
                setLoading(false);
                // Re-lanzar el error para que el catch externo pueda manejarlo
                throw err;
            }
    }, [fetchWithFallback]);

    // Cargar Product Roadmap desde CSV siempre (independiente de la fuente de datos de delivery)
    useEffect(() => {
        let isMounted = true;
        
        const loadProductRoadmap = async () => {
            try {
                console.log('[APP] 🔄 Cargando Product Roadmap desde CSV...');
                const [prodInitText, prodBugText] = await Promise.all([
                    fetchWithFallback(SHEET_URLS.productInitiatives),
                    fetchWithFallback(SHEET_URLS.productBugRelease)
                ]);
                
                if (!isMounted) return;
                
                const initiatives = parseCSV(prodInitText, 'productInitiatives');
                const bugs = parseCSV(prodBugText, 'productBugRelease');
                
                console.log('[APP] ✅ Product Roadmap cargado desde CSV:', {
                    initiatives: initiatives.length,
                    bugs: bugs.length,
                    sampleInitiative: initiatives[0]
                });
                
                if (isMounted) {
                    setProductInitiatives(initiatives);
                    setProductBugRelease(bugs);
                }
            } catch (err) {
                console.error('[APP] ❌ Error cargando Product Roadmap desde CSV:', err);
                console.error('[APP] ❌ Error details:', {
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                });
                // Aún así establecer arrays vacíos para que el componente se renderice
                if (isMounted) {
                    setProductInitiatives([]);
                    setProductBugRelease([]);
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
                // Si Supabase no está configurado, usar CSV silenciosamente
                const isSupabaseNotConfigured = dbError.message?.includes('Supabase no está configurado');
                if (isSupabaseNotConfigured) {
                    console.info('[APP] ℹ️ Supabase no configurado, usando CSV como fuente de datos');
                } else {
                    console.warn('[APP] ⚠️ No se pudo cargar desde BD, intentando CSV...', dbError.message);
                }
                try {
                    // Limpiar error anterior antes de intentar CSV
                    setError(null);
                    await loadData('csv');
                } catch (csvError) {
                    console.error('[APP] ❌ Error cargando CSV:', csvError);
                    // Si CSV también falla, mostrar error
                    setError(`No se pudo cargar datos. Error: ${csvError.message}`);
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
            
            // Verificar si Supabase está configurado antes de intentar usar BD
            if (newSource === 'db') {
                try {
                    const { supabase } = await import('./utils/supabaseApi.js');
                    if (!supabase) {
                        console.warn('[APP] ⚠️ Supabase no está configurado');
                        setError('Supabase no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env');
                        // No cambiar el dataSource, mantener el actual
                        return;
                    }
                    // Intentar una consulta simple para verificar que funciona
                    const { error: testError } = await supabase.from('squads').select('id').limit(1);
                    if (testError && (testError.message?.includes('Invalid API key') || testError.message?.includes('JWT'))) {
                        console.warn('[APP] ⚠️ Supabase configurado pero con credenciales inválidas');
                        setError('Las credenciales de Supabase son inválidas. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
                        return;
                    }
                } catch (importError) {
                    console.error('[APP] ❌ Error importando Supabase:', importError);
                    setError('No se pudo verificar la configuración de Supabase');
                    return;
                }
            }
            
            setDataSource(newSource);
            try {
                await loadData(newSource);
            } catch (err) {
                // Si hay un error y se solicitó fallback a CSV, hacerlo automáticamente
                if (err.message === 'FALLBACK_TO_CSV' && newSource === 'db') {
                    console.info('[APP] ℹ️ Haciendo fallback automático a CSV');
                    setDataSource('csv');
                    try {
                        await loadData('csv');
                        // Limpiar el error después de cargar CSV exitosamente
                        setTimeout(() => setError(null), 3000);
                    } catch (csvError) {
                        console.error('[APP] ❌ Error en fallback a CSV:', csvError);
                        setError(`Error cargando CSV: ${csvError.message}`);
                    }
                } else if (err.message?.includes('Supabase no está configurado') && newSource === 'db') {
                    // Si Supabase no está configurado, cambiar a CSV automáticamente
                    console.info('[APP] ℹ️ Supabase no configurado, cambiando a CSV');
                    setDataSource('csv');
                    try {
                        await loadData('csv');
                        // Limpiar el error después de cargar CSV exitosamente
                        setTimeout(() => setError(null), 3000);
                    } catch (csvError) {
                        setError(`Error cargando CSV: ${csvError.message}`);
                    }
                } else {
                    // Para otros errores, mostrar mensaje
                    console.error('[APP] ❌ Error:', err);
                    setError(`Error: ${err.message}`);
                }
            }
        }
    }, [dataSource, loadData]);

    // Si no hay usuario autenticado, mostrar Login
    if (!currentUser) {
        return (
            <Login 
                onLoginSuccess={(user) => {
                    setCurrentUser(user);
                    // Recargar la página para inicializar todo con el usuario autenticado
                    window.location.reload();
                }} 
            />
        );
    }

    // Solo mostrar loading si estamos cargando delivery roadmap Y no es la vista de product
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
            <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'} pt-8 px-8 pb-12`}>
                <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            {activeView === 'overall' ? 'Overall Dashboard' : 
                             activeView === 'product' ? 'Product Roadmap' : 
                             activeView === 'delivery' ? 'Delivery Roadmap' :
                             activeView === 'projects-metrics' ? 'Projects Metrics' :
                             activeView === 'developer-metrics' ? 'Developer Metrics' :
                             activeView === 'user-admin' ? 'User Administration' :
                             activeView === 'kpis' ? 'KPIs Dashboard' :
                             'Dashboard'}
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {activeView === 'overall' ? 'Strategic Overview & Combined Status' : 
                             activeView === 'product' ? 'Product Initiatives & Milestones' : 
                             activeView === 'delivery' ? 'Execution & Resource Allocation' :
                             activeView === 'projects-metrics' ? 'Comprehensive project performance analytics' :
                             activeView === 'developer-metrics' ? 'Team performance and allocation analytics' :
                             activeView === 'user-admin' ? 'User management and administration' :
                             activeView === 'kpis' ? 'Engineering metrics and performance indicators' :
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
                                        <span>Base de Datos</span>
                                    </div>
                                ) : (
                                    <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span>CSV</span>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Indicador fijo para Product Roadmap - siempre CSV */}
                        {activeView === 'product' && (
                            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300 border border-amber-500/30">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span>Product Roadmap (CSV)</span>
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
                            // Debug: Verificar que Product Roadmap solo use datos de CSV
                            console.log('[APP] 🟢 Renderizando Product Roadmap con datos CSV:', {
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
                        {activeView === 'projects-metrics' && canAccessModule(currentUser?.role || 'regular', 'projects-metrics') && (
                            <ProjectsMetrics />
                        )}
                        {activeView === 'developer-metrics' && canAccessModule(currentUser?.role || 'regular', 'developer-metrics') && (
                            <DeveloperMetrics />
                        )}
                        {activeView === 'user-admin' && canAccessModule(currentUser?.role || 'regular', 'user-admin') && (
                            <UserAdministration currentUser={currentUser} />
                        )}
                        {activeView === 'kpis' && canAccessModule(currentUser?.role || 'regular', MODULES.KPIS) && (
                            <KPIsView />
                        )}
                        {/* Verificar si el usuario intenta acceder a un módulo no permitido */}
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
