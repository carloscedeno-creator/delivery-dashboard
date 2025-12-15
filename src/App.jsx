import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import OverallView from './components/OverallView';
import ProductRoadmapView from './components/ProductRoadmapView';
import DeliveryRoadmapView from './components/DeliveryRoadmapView';
import { parseCSV } from './utils/csvParser';
import { DELIVERY_ROADMAP, PRODUCT_ROADMAP, buildProxiedUrl } from './config/dataSources';

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
                const [projText, allocText, prodInitText, prodBugText] = await Promise.all([
                    fetchWithFallback(SHEET_URLS.project),
                    fetchWithFallback(SHEET_URLS.allocation),
                    fetchWithFallback(SHEET_URLS.productInitiatives),
                    fetchWithFallback(SHEET_URLS.productBugRelease)
                ]);
                setProjectData(parseCSV(projText, 'project'));
                setDevAllocationData(parseCSV(allocText, 'allocation'));
                setProductInitiatives(parseCSV(prodInitText, 'productInitiatives'));
                setProductBugRelease(parseCSV(prodBugText, 'productBugRelease'));
                setLoading(false);
            } catch (err) {
                console.error("Fetch failed, using mock data:", err);
                setProjectData(MOCK_PROJECT_DATA);
                setDevAllocationData(MOCK_ALLOCATION_DATA);
                setProductInitiatives([]);
                setProductBugRelease([]);
                setError(null);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-rose-400"><div className="text-center"><AlertCircle size={48} className="mx-auto mb-4" /><p>{error}</p></div></div>;

    return (
        <div className="min-h-screen font-sans bg-[#0a0e17]">
            <Navbar activeView={activeView} setActiveView={setActiveView} />
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
                        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            Live Data
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto">
                    {activeView === 'overall' && <OverallView />}
                    {activeView === 'product' && <ProductRoadmapView productInitiatives={productInitiatives} productBugRelease={productBugRelease} />}
                    {activeView === 'delivery' && <DeliveryRoadmapView projectData={projectData} devAllocationData={devAllocationData} />}
                </main>
            </div>
        </div>
    );
}

export default App;
