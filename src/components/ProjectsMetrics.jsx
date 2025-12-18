import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Target, Activity, AlertCircle } from 'lucide-react';
import { getDeliveryRoadmapData } from '../utils/supabaseApi';

const ProjectsMetrics = () => {
    const [projectData, setProjectData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalProjects: 0,
        avgSPI: 0,
        avgCompletion: 0,
        onTrack: 0,
        atRisk: 0,
        delayed: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getDeliveryRoadmapData();
            setProjectData(data);
            calculateMetrics(data);
        } catch (error) {
            console.error('[ProjectsMetrics] Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (data) => {
        if (!data || data.length === 0) return;

        const total = data.length;
        const avgSPI = data.reduce((sum, p) => sum + (p.spi || 0), 0) / total;
        const avgCompletion = data.reduce((sum, p) => sum + (p.status || 0), 0) / total;
        const onTrack = data.filter(p => (p.spi || 0) >= 0.9 && (p.status || 0) >= 50).length;
        const atRisk = data.filter(p => (p.spi || 0) < 0.9 || (p.status || 0) < 20).length;
        const delayed = data.filter(p => (p.spi || 0) < 0.8).length;

        setMetrics({
            totalProjects: total,
            avgSPI: parseFloat(avgSPI.toFixed(2)),
            avgCompletion: Math.round(avgCompletion),
            onTrack,
            atRisk,
            delayed
        });
    };

    // Preparar datos para gráficos
    const squadData = React.useMemo(() => {
        const squadMap = {};
        projectData.forEach(project => {
            const squad = project.squad || 'Unknown';
            if (!squadMap[squad]) {
                squadMap[squad] = { squad, projects: 0, totalSPI: 0, totalCompletion: 0 };
            }
            squadMap[squad].projects++;
            squadMap[squad].totalSPI += project.spi || 0;
            squadMap[squad].totalCompletion += project.status || 0;
        });

        return Object.values(squadMap).map(s => ({
            squad: s.squad,
            projects: s.projects,
            avgSPI: parseFloat((s.totalSPI / s.projects).toFixed(2)),
            avgCompletion: Math.round(s.totalCompletion / s.projects)
        }));
    }, [projectData]);

    const statusData = [
        { name: 'On Track', value: metrics.onTrack, color: '#10b981' },
        { name: 'At Risk', value: metrics.atRisk, color: '#f59e0b' },
        { name: 'Delayed', value: metrics.delayed, color: '#ef4444' }
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
                        Projects Metrics
                    </h1>
                    <p className="text-slate-400 mt-2">Comprehensive project performance analytics</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Target className="text-blue-400" size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalProjects}</div>
                    <div className="text-sm text-slate-400">Total Projects</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-purple-500/20">
                            <Activity className="text-purple-400" size={24} />
                        </div>
                        {metrics.avgSPI >= 0.9 ? (
                            <TrendingUp className="text-emerald-400" size={20} />
                        ) : (
                            <TrendingDown className="text-rose-400" size={20} />
                        )}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.avgSPI}</div>
                    <div className="text-sm text-slate-400">Avg. SPI</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-emerald-500/20">
                            <BarChart className="text-emerald-400" size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.avgCompletion}%</div>
                    <div className="text-sm text-slate-400">Avg. Completion</div>
                </div>

                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-rose-500/20">
                            <AlertCircle className="text-rose-400" size={24} />
                        </div>
                        <TrendingDown className="text-rose-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{metrics.atRisk}</div>
                    <div className="text-sm text-slate-400">At Risk</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SPI by Squad */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">SPI by Squad</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={squadData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="squad" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="avgSPI" fill="#3b82f6" name="Avg SPI" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Completion by Squad */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Completion by Squad</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={squadData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="squad" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="avgCompletion" fill="#10b981" name="Avg Completion %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Project Status Distribution */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Project Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Projects Count by Squad */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Projects Count by Squad</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={squadData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="squad" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="projects" fill="#8b5cf6" name="Projects" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ProjectsMetrics;
