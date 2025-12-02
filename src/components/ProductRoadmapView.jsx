import React, { useMemo } from 'react';
import { Box, Activity, AlertCircle, Truck, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
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
            .filter(item => item.startDate && item.expectedDate)
            .map(item => ({
                initiative: item.initiative,
                squad: item.team || 'Product',
                start: item.startDate,
                delivery: item.expectedDate,
                status: item.completion || 0,
                spi: 1.0 // Default SPI for product initiatives
            }));
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
                    <h3 className="text-slate-400 text-sm font-medium mb-6">Timeline Overview (Roadmap)</h3>
                    <GanttChart data={ganttData} />
                </div>
            )}

            {/* Initiatives Timeline by Quarter */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-slate-400 text-sm font-medium mb-6">Strategic Initiatives by Quarter</h3>
                <div className="space-y-6">
                    {Object.entries(initiativesByQuarter).sort().map(([quarter, items]) => (
                        <div key={quarter} className="border-b border-white/5 last:border-0 pb-6 last:pb-0">
                            <h4 className="text-cyan-400 font-semibold mb-4">{quarter}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map((item, idx) => (
                                    <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-slate-200 font-medium truncate pr-2" title={item.initiative}>
                                                {item.initiative}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${item.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400' :
                                                item.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-700 text-slate-400'
                                                }`}>
                                                {item.status || 'Planned'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                                            <span>{item.team || 'N/A'}</span>
                                            <span>{item.ba || 'N/A'}</span>
                                        </div>
                                        {item.completion !== undefined && (
                                            <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-cyan-500 rounded-full"
                                                    style={{ width: `${item.completion}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bug vs Feature Mix */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-400 text-sm font-medium mb-6">Bug vs Feature Mix</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={bugReleaseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {bugReleaseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Priority Breakdown */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-400 text-sm font-medium mb-6">Priority Breakdown</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Initiatives per Team */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-400 text-sm font-medium mb-6">Initiatives per Team</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamLoadData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={80}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#22D3EE" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductRoadmapView;
