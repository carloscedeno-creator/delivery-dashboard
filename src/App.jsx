import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import OverallView from './components/OverallView';
import ProductRoadmapView from './components/ProductRoadmapView';
import DeliveryRoadmapView from './components/DeliveryRoadmapView';
import ProjectsMetrics from './components/ProjectsMetrics';
import DeveloperMetrics from './components/DeveloperMetrics';
import UserAdministration from './components/UserAdministration';
import DataSourceSelector from './components/DataSourceSelector';
import { parseCSV } from './utils/csvParser';
import { DELIVERY_ROADMAP, PRODUCT_ROADMAP, buildProxiedUrl } from './config/dataSources';
import { getDeliveryRoadmapData, getDeveloperAllocationData } from './utils/supabaseApi';
import { canAccessModule, getModulesForRole } from './config/permissions';
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
                        console.error('[APP] ❌ Error cargando desde Base de Datos:', dbError);
                        setError(`Error cargando desde Base de Datos: ${dbError.message}`);
                        // Si falla la BD, no hacer fallback automático, dejar que el usuario elija CSV
                        throw dbError;
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

                // Product roadmap sigue usando CSV (por ahora)
                try {
                    const [prodInitText, prodBugText] = await Promise.all([
                        fetchWithFallback(SHEET_URLS.productInitiatives),
                        fetchWithFallback(SHEET_URLS.productBugRelease)
                    ]);
                    setProductInitiatives(parseCSV(prodInitText, 'productInitiatives'));
                    setProductBugRelease(parseCSV(prodBugText, 'productBugRelease'));
                } catch (err) {
                    console.warn('[APP] Error cargando product roadmap:', err);
                    setProductInitiatives([]);
                    setProductBugRelease([]);
                }

                setLoading(false);
            } catch (err) {
                console.error("[APP] Error cargando datos:", err);
                setError(`Error: ${err.message}`);
                setLoading(false);
                // No usar mock data automáticamente, dejar que el usuario intente otra fuente
            }
    }, [fetchWithFallback]);

    useEffect(() => {
        // Carga inicial: intentar desde BD primero, si falla usar CSV
        const initialLoad = async () => {
            try {
                await loadData('db');
            } catch (dbError) {
                console.warn('[APP] ⚠️ No se pudo cargar desde BD, intentando CSV...');
                try {
                    await loadData('csv');
                } catch (csvError) {
                    // loadData ya maneja el fallback a mock data
                }
            }
        };
        
        initialLoad();
    }, [loadData]);

    // Función para manejar el cambio de fuente de datos
    const handleDataSourceChange = useCallback((newSource) => {
        if (newSource !== dataSource) {
            console.log(`[APP] 🔄 Cambiando fuente de datos de ${dataSource} a ${newSource}`);
            setDataSource(newSource);
            loadData(newSource);
        }
    }, [dataSource, loadData]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-rose-400"><div className="text-center"><AlertCircle size={48} className="mx-auto mb-4" /><p>{error}</p></div></div>;

    return (
        <div className="min-h-screen font-sans bg-[#0a0e17]">
            <Navbar activeView={activeView} setActiveView={setActiveView} />
            <div className="pt-24 px-8 pb-12">
                <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            {activeView === 'overall' ? 'Overall Dashboard' : 
                             activeView === 'product' ? 'Product Roadmap' : 
                             activeView === 'delivery' ? 'Delivery Roadmap' :
                             activeView === 'projects-metrics' ? 'Projects Metrics' :
                             activeView === 'developer-metrics' ? 'Developer Metrics' :
                             activeView === 'user-admin' ? 'User Administration' :
                             'Dashboard'}
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {activeView === 'overall' ? 'Strategic Overview & Combined Status' : 
                             activeView === 'product' ? 'Product Initiatives & Milestones' : 
                             activeView === 'delivery' ? 'Execution & Resource Allocation' :
                             activeView === 'projects-metrics' ? 'Comprehensive project performance analytics' :
                             activeView === 'developer-metrics' ? 'Team performance and allocation analytics' :
                             activeView === 'user-admin' ? 'User management and administration' :
                             'Dashboard'}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
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
                    </div>
                </header>

                <main className="max-w-7xl mx-auto">
                    {activeView === 'overall' && <OverallView />}
                    {activeView === 'product' && <ProductRoadmapView productInitiatives={productInitiatives} productBugRelease={productBugRelease} />}
                    {activeView === 'delivery' && (() => {
                        console.log('🔴 [APP] ====== RENDERIZANDO DELIVERY ROADMAP VIEW ======');
                        console.log('🔴 [APP] activeView:', activeView);
                        console.log('🔴 [APP] projectData.length:', projectData?.length || 0);
                        console.log('🔴 [APP] projectData es array?', Array.isArray(projectData));
                        console.log('🔴 [APP] Primeros 2 items:', projectData?.slice(0, 2));
                        return <DeliveryRoadmapView projectData={projectData} devAllocationData={devAllocationData} />;
                    })()}
                    {activeView === 'projects-metrics' && canAccessModule(currentUser?.role || 'regular', 'projects-metrics') && (
                        <ProjectsMetrics />
                    )}
                    {activeView === 'developer-metrics' && canAccessModule(currentUser?.role || 'regular', 'developer-metrics') && (
                        <DeveloperMetrics />
                    )}
                    {activeView === 'user-admin' && canAccessModule(currentUser?.role || 'regular', 'user-admin') && (
                        <UserAdministration currentUser={currentUser} />
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
                </main>
            </div>
        </div>
    );
}

export default App;
