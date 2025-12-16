import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import OverallView from './components/OverallView';
import ProductRoadmapView from './components/ProductRoadmapView';
import DeliveryRoadmapView from './components/DeliveryRoadmapView';
import Login from './components/Login';
import UserAdministration from './components/UserAdministration';
import { parseCSV } from './utils/csvParser';
import { DELIVERY_ROADMAP, PRODUCT_ROADMAP, buildProxiedUrl } from './config/dataSources';
import { getDeliveryRoadmapData, getDeveloperAllocationData } from './utils/supabaseApi';
import { getCurrentUser, validateSession } from './utils/authService';

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
    const [productInitiatives, setProductInitiatives] = useState([]);
    const [productBugRelease, setProductBugRelease] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState('csv'); // 'supabase' o 'csv'
    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Verificar autenticación al cargar
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Primero verificar si hay sesión guardada
                const currentUser = getCurrentUser();
                if (currentUser) {
                    // Validar que la sesión sigue siendo válida
                    const validation = await validateSession();
                    if (validation.valid && validation.user) {
                        setUser(validation.user);
                    } else {
                        // Sesión inválida, limpiar
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('[APP] Error checking auth:', err);
                setUser(null);
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchWithFallback = async (url) => {
            try {
                const fullUrl = buildProxiedUrl(url);
                const response = await fetch(fullUrl);
                if (response.ok) return await response.text();
                throw new Error('Network response was not ok');
            } catch (err) {
                console.error("Fetch failed:", err);
                throw err;
            }
        };

        const loadData = async () => {
            try {
                setLoading(true);
                
                // Intentar cargar desde Supabase primero (delivery roadmap)
                try {
                    console.log('[APP] 🔄 Intentando cargar datos desde Supabase...');
                    const [deliveryData, allocationData] = await Promise.all([
                        getDeliveryRoadmapData(),
                        getDeveloperAllocationData()
                    ]);
                    
                    // Validar que realmente hay datos
                    if (!deliveryData || deliveryData.length === 0) {
                        throw new Error('Supabase retornó datos vacíos. Verifica que el servicio de sync haya ejecutado.');
                    }
                    
                    setProjectData(deliveryData);
                    setDevAllocationData(allocationData);
                    setDataSource('supabase'); // Marcar que estamos usando Supabase
                    console.log('[APP] ✅ Datos de delivery cargados desde Supabase:', {
                        projects: deliveryData.length,
                        allocations: allocationData.length,
                        sampleProject: deliveryData[0]?.initiative || 'N/A'
                    });
                } catch (supabaseError) {
                    console.error('[APP] ❌ Error cargando desde Supabase:', supabaseError);
                    console.warn('[APP] ⚠️ Usando CSV como fallback (datos pueden estar desactualizados)');
                    // Fallback a CSV para delivery
                    try {
                        const [projText, allocText] = await Promise.all([
                            fetchWithFallback(SHEET_URLS.project),
                            fetchWithFallback(SHEET_URLS.allocation)
                        ]);
                        setProjectData(parseCSV(projText, 'project'));
                        setDevAllocationData(parseCSV(allocText, 'allocation'));
                        setDataSource('csv'); // Marcar que estamos usando CSV
                        console.warn('[APP] ⚠️ Usando datos de CSV. Los datos pueden no estar actualizados.');
                    } catch (csvError) {
                        console.error('[APP] ❌ Error también cargando CSV:', csvError);
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
                console.error("[APP] Error general, usando mock data:", err);
                setProjectData(MOCK_PROJECT_DATA);
                setDevAllocationData(MOCK_ALLOCATION_DATA);
                setProductInitiatives([]);
                setProductBugRelease([]);
                setDataSource('csv'); // Mock data = CSV
                setError(null);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Mostrar login si no hay usuario autenticado
    if (checkingAuth) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    }

    if (!user) {
        return <Login onLoginSuccess={(userData) => setUser(userData)} />;
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-rose-400"><div className="text-center"><AlertCircle size={48} className="mx-auto mb-4" /><p>{error}</p></div></div>;

    return (
        <div className="min-h-screen font-sans bg-[#0a0e17]">
            <Navbar activeView={activeView} setActiveView={setActiveView} user={user} onLogout={() => setUser(null)} />
            <div className="pt-24 px-8 pb-12">
                <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            {activeView === 'overall' ? 'Overall Dashboard' : activeView === 'product' ? 'Product Roadmap' : 'Delivery Roadmap'}
                        </h1>
                        <p className="text-slate-400 mt-2">
                            {activeView === 'overall' ? 'Strategic Overview & Combined Status' : activeView === 'product' ? 'Product Initiatives & Milestones' : 'Execution & Resource Allocation'}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        {dataSource === 'supabase' ? (
                            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                Live Data
                            </div>
                        ) : (
                            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                Not Connected
                            </div>
                        )}
                    </div>
                </header>

                <main className="max-w-7xl mx-auto">
                    {activeView === 'overall' && <OverallView />}
                    {activeView === 'product' && <ProductRoadmapView productInitiatives={productInitiatives} productBugRelease={productBugRelease} />}
                    {activeView === 'delivery' && <DeliveryRoadmapView projectData={projectData} devAllocationData={devAllocationData} />}
                    {activeView === 'users' && <UserAdministration currentUser={user} />}
                </main>
            </div>
        </div>
    );
}

export default App;
