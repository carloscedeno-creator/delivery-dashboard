import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, TrendingUp, Code, Clock, CheckCircle } from 'lucide-react';
import { getDeveloperAllocationData } from '../utils/supabaseApi';

const DeveloperMetrics = () => {
    const [devData, setDevData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalDevelopers: 0,
        avgAllocation: 0,
        fullyAllocated: 0,
        underAllocated: 0,
        overAllocated: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getDeveloperAllocationData();
            setDevData(data);
            calculateMetrics(data);
        } catch (error) {
            console.error('[DeveloperMetrics] Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (data) => {
        if (!data || data.length === 0) return;

        // Agrupar por desarrollador
        const devMap = {};
        data.forEach(item => {
            const dev = item.dev || 'Unknown';
            if (!devMap[dev]) {
                devMap[dev] = { dev, totalAllocation: 0, projects: 0 };
            }
            devMap[dev].totalAllocation += item.percentage || 0;
            devMap[dev].projects++;
        });

        const developers = Object.values(devMap);
        const total = developers.length;
        const avgAllocation = developers.reduce((sum, d) => sum + d.totalAllocation, 0) / total;
        const fullyAllocated = developers.filter(d => d.totalAllocation >= 80 && d.totalAllocation <= 100).length;
        const underAllocated = developers.filter(d => d.totalAllocation < 80).length;
        const overAllocated = developers.filter(d => d.totalAllocation > 100).length;

        setMetrics({
            totalDevelopers: total,
            avgAllocation: parseFloat(avgAllocation.toFixed(1)),
            fullyAllocated,
            underAllocated,
            overAllocated
        });
    };

    // Preparar datos para gráficos
    const devAllocationData = React.useMemo(() => {
        const devMap = {};
        devData.forEach(item => {
            const dev = item.dev || 'Unknown';
            if (!devMap[dev]) {
                devMap[dev] = { dev, totalAllocation: 0, projects: 0 };
            }
            devMap[dev].totalAllocation += item.percentage || 0;
            devMap[dev].projects++;
        });

        return Object.values(devMap)
            .map(d => ({
                dev: d.dev,
                allocation: parseFloat(d.totalAllocation.toFixed(1)),
                projects: d.projects
            }))
            .sort((a, b) => b.allocation - a.allocation)
            .slice(0, 10); // Top 10
    }, [devData]);

    const allocationStatusData = [
        { name: 'Fully Allocated', value: metrics.fullyAllocated, color: '#10b981' },
        { name: 'Under Allocated', value: metrics.underAllocated, color: '#f59e0b' },
        { name: 'Over Allocated', value: metrics.overAllocated, color: '#ef4444' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                        Developer Metrics
                    </h1>
                    <p className="text-slate-400 mt-2">Team performance and allocation analytics</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Users className="text-blue-400" size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalDevelopers}</div>
                    <div className="text-sm text-slate-400">Total Developers</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/20">
                            <Code className="text-purple-400" size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.avgAllocation}%</div>
                    <div className="text-sm text-slate-400">Avg. Allocation</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-emerald-500/20">
                            <CheckCircle className="text-emerald-400" size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.fullyAllocated}</div>
                    <div className="text-sm text-slate-400">Fully Allocated</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-rose-500/20">
                            <Clock className="text-rose-400" size={24} />
                        </div>
                        <TrendingDown className="text-rose-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.overAllocated}</div>
                    <div className="text-sm text-slate-400">Over Allocated</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Developers by Allocation */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Top Developers by Allocation</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={devAllocationData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#9ca3af" />
                            <YAxis dataKey="dev" type="category" stroke="#9ca3af" width={120} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="allocation" fill="#3b82f6" name="Allocation %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Projects per Developer */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Projects per Developer</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={devAllocationData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="dev" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="projects" fill="#10b981" name="Projects" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Allocation Status Distribution */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Allocation Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={allocationStatusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Bar dataKey="value" name="Developers">
                                {allocationStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Allocation Trend */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Allocation vs Projects</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={devAllocationData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="dev" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="allocation" stroke="#3b82f6" name="Allocation %" />
                            <Line type="monotone" dataKey="projects" stroke="#10b981" name="Projects" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DeveloperMetrics;
