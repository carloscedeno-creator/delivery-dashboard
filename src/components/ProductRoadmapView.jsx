import React, { useMemo } from 'react';
import { Box, Activity, AlertCircle, Truck, TrendingUp, Users, Calendar, Target, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import GanttChart from './GanttChart';
import KPICard from './KPICard';

const ProductRoadmapView = ({ productInitiatives = [], productBugRelease = [] }) => {
    // Calculate KPI stats
    const stats = useMemo(() => {
        const totalInitiatives = productInitiatives.length;
        const avgCompletion = totalInitiatives > 0
            ? Math.round(productInitiatives.reduce((acc, curr) => acc + (curr.completion || 0), 0) / totalInitiatives)
            : 0;
        const totalBugs = productBugRelease.filter(item => item.type === 'Bug').length;
        const releases = productBugRelease.filter(item => item.release).map(item => item.release);
        const nextRelease = releases.length > 0 ? releases[0] : 'TBD';

        return { totalInitiatives, avgCompletion, totalBugs, nextRelease };
    }, [productInitiatives, productBugRelease]);

    // Group initiatives by quarter
    const initiativesByQuarter = useMemo(() => {
        const grouped = {};
        productInitiatives.forEach(item => {
            const quarter = item.quarter || 'Unassigned';
            if (!grouped[quarter]) grouped[quarter] = [];
            grouped[quarter].push(item);
        });
        return grouped;
    }, [productInitiatives]);

    // Prepare data for charts
    const bugReleaseData = useMemo(() => {
        const bugs = productBugRelease.filter(item => item.type === 'Bug').length;
        const features = productBugRelease.filter(item => item.type === 'Feature').length;
        return [
            { name: 'Bugs', value: bugs },
            { name: 'Features', value: features }
        ];
    }, [productBugRelease]);

    const priorityData = useMemo(() => {
        const priorities = { High: 0, Medium: 0, Low: 0 };
        productBugRelease.forEach(item => {
            if (item.priority && priorities.hasOwnProperty(item.priority)) {
                priorities[item.priority]++;
            }
        });
        return Object.entries(priorities).map(([name, value]) => ({ name, value }));
    }, [productBugRelease]);

    const teamLoadData = useMemo(() => {
        const load = {};
        productInitiatives.forEach(i => {
            if (i.team) {
                if (!load[i.team]) load[i.team] = 0;
                load[i.team]++;
            }
        });
        return Object.entries(load).map(([name, value]) => ({ name, value }));
    }, [productInitiatives]);

    // Prepare data for Gantt Chart (convert to delivery format)
    const ganttData = useMemo(() => {
        return productInitiatives
            .filter(item => {
                // Need at least a start date and either expectedDate or endDate
                return item.startDate && (item.expectedDate || item.endDate);
            })
            .map(item => {
                // Use endDate if available, otherwise expectedDate
                const endDate = item.endDate || item.expectedDate;
                
                return {
                    initiative: item.initiative,
                    squad: item.team || 'Product',
                    start: item.startDate,
                    delivery: endDate,
                    status: item.completion || 0,
                    spi: 1.0 // Default SPI for product initiatives
                };
            })
            .filter(item => {
                // Additional validation: ensure dates are valid strings
                return item.start && item.delivery && 
                       item.start.trim() !== '' && 
                       item.delivery.trim() !== '';
            });
    }, [productInitiatives]);

    const COLORS = ['#00D9FF', '#0EA5E9', '#22D3EE', '#67e8f9'];

    if (productInitiatives.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                <div className="p-6 rounded-full bg-slate-800/50 border border-white/5">
                    <Box size={48} className="text-slate-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Product Roadmap</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                        No product initiatives data available.
                        <br />
                        <span className="text-cyan-400 text-sm font-medium mt-2 block">Check your data source configuration</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-shimmer" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Initiatives"
                    value={stats.totalInitiatives}
                    label="Active Roadmap Items"
                    trend="positive"
                    color="blue"
                    icon={Box}
                />
                <KPICard
                    title="Avg. Completion"
                    value={`${stats.avgCompletion}%`}
                    label="Overall Progress"
                    trend="positive"
                    color="emerald"
                    icon={Activity}
                />
                <KPICard
                    title="Total Bugs"
                    value={stats.totalBugs}
                    label="Reported Issues"
                    trend={stats.totalBugs > 5 ? 'negative' : 'positive'}
                    color="rose"
                    icon={AlertCircle}
                />
                <KPICard
                    title="Next Release"
                    value={stats.nextRelease}
                    label="Upcoming Milestone"
                    trend="positive"
                    color="purple"
                    icon={Truck}
                />
            </div>

            {/* Product Roadmap Timeline */}
            {ganttData.length > 0 && (
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-cyan-400" />
                            Timeline Overview
                        </h3>
                        <span className="text-sm text-slate-400">{ganttData.length} items on timeline</span>
                    </div>
                    <GanttChart data={ganttData} />
                </div>
            )}

            {/* Initiatives Timeline by Quarter */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-cyan-400" />
                        Strategic Initiatives by Quarter
                    </h3>
                    <span className="text-sm text-slate-400">{productInitiatives.length} initiatives</span>
                </div>
                <div className="space-y-8">
                    {Object.entries(initiativesByQuarter).sort().map(([quarter, items]) => (
                        <div key={quarter} className="border-l-2 border-cyan-500/30 pl-6 pb-8 last:pb-0">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                                    <h4 className="text-cyan-400 font-bold text-lg">{quarter}</h4>
                                </div>
                                <span className="text-sm text-slate-400">{items.length} initiative{items.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {items.map((item, idx) => {
                                    // Format dates
                                    const formatDate = (dateStr) => {
                                        if (!dateStr) return null;
                                        try {
                                            const date = parseISO(dateStr);
                                            if (isValid(date)) {
                                                return format(date, 'MMM dd, yyyy');
                                            }
                                            // Try other formats
                                            const parts = dateStr.split('/');
                                            if (parts.length === 3) {
                                                const d = new Date(parts[2], parts[1] - 1, parts[0]);
                                                if (isValid(d)) return format(d, 'MMM dd, yyyy');
                                            }
                                        } catch (e) {
                                            return dateStr;
                                        }
                                        return dateStr;
                                    };

                                    const getStatusConfig = (status) => {
                                        const statusLower = (status || '').toLowerCase();
                                        if (statusLower.includes('done') || statusLower.includes('completed')) {
                                            return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2 };
                                        }
                                        if (statusLower.includes('progress') || statusLower.includes('active')) {
                                            return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Activity };
                                        }
                                        if (statusLower.includes('blocked') || statusLower.includes('stuck')) {
                                            return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', icon: AlertCircle };
                                        }
                                        return { bg: 'bg-slate-700/50', text: 'text-slate-400', border: 'border-slate-600/30', icon: Clock };
                                    };

                                    const statusConfig = getStatusConfig(item.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <div 
                                            key={idx} 
                                            className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <h5 className="text-slate-100 font-semibold text-sm leading-tight pr-2 flex-1" title={item.initiative}>
                                                    {item.initiative}
                                                </h5>
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} shrink-0`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    <span className="text-xs font-medium">{item.status || 'Planned'}</span>
                                                </div>
                                            </div>

                                            {/* Team & BA Info */}
                                            <div className="flex items-center gap-4 mb-4 text-xs">
                                                {item.team && (
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span className="text-slate-300">{item.team}</span>
                                                    </div>
                                                )}
                                                {item.ba && (
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Box className="w-3.5 h-3.5" />
                                                        <span className="text-slate-300">{item.ba}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dates */}
                                            {(item.startDate || item.expectedDate) && (
                                                <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
                                                    {item.startDate && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>Start: {formatDate(item.startDate)}</span>
                                                        </div>
                                                    )}
                                                    {item.expectedDate && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Target className="w-3.5 h-3.5" />
                                                            <span>Due: {formatDate(item.expectedDate)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Effort */}
                                            {item.effort && (
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                                        <span className="text-slate-400">Effort</span>
                                                        <span className="text-cyan-400 font-medium">{item.effort} days</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {item.completion !== undefined && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-400">Progress</span>
                                                        <span className={`font-semibold ${
                                                            item.completion >= 90 ? 'text-emerald-400' :
                                                            item.completion >= 50 ? 'text-blue-400' :
                                                            item.completion > 0 ? 'text-amber-400' :
                                                            'text-slate-500'
                                                        }`}>
                                                            {item.completion}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                item.completion >= 90 ? 'bg-emerald-500' :
                                                                item.completion >= 50 ? 'bg-blue-500' :
                                                                item.completion > 0 ? 'bg-amber-500' :
                                                                'bg-slate-600'
                                                            }`}
                                                            style={{ width: `${item.completion}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Designer */}
                                            {item.designer && (
                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>Designer: <span className="text-slate-300">{item.designer}</span></span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bug vs Feature Mix */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            Bug vs Feature Mix
                        </h3>
                        <span className="text-xs text-slate-400">{productBugRelease.length} total</span>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={bugReleaseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {bugReleaseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        borderColor: '#334155', 
                                        color: '#f8fafc',
                                        borderRadius: '8px',
                                        padding: '8px 12px'
                                    }} 
                                />
                                <Legend 
                                    wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {bugReleaseData.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-around text-xs">
                            {bugReleaseData.map((entry, idx) => (
                                <div key={idx} className="text-center">
                                    <div className="text-slate-400 mb-1">{entry.name}</div>
                                    <div className="text-white font-semibold">{entry.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Priority Breakdown */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-cyan-400" />
                            Priority Breakdown
                        </h3>
                        <span className="text-xs text-slate-400">
                            {priorityData.reduce((sum, item) => sum + item.value, 0)} items
                        </span>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        borderColor: '#334155', 
                                        color: '#f8fafc',
                                        borderRadius: '8px',
                                        padding: '8px 12px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Initiatives per Team */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-cyan-400" />
                            Initiatives per Team
                        </h3>
                        <span className="text-xs text-slate-400">{teamLoadData.length} teams</span>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamLoadData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        borderColor: '#334155', 
                                        color: '#f8fafc',
                                        borderRadius: '8px',
                                        padding: '8px 12px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#22D3EE" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductRoadmapView;
