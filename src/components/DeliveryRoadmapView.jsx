import React, { useState, useMemo } from 'react';
import { Activity, Calendar, Layout, AlertCircle, ChevronDown, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import KPICard from './KPICard';
import GanttChart from './GanttChart';
import AllocationChart from './AllocationChart';
import DeveloperWorkload from './DeveloperWorkload';

const SPIGauge = ({ value }) => {
    const data = [{ name: 'Score', value: Math.min(value, 2) }, { name: 'Remaining', value: 2 - Math.min(value, 2) }];
    return (
        <div className="relative h-[220px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie dataKey="value" startAngle={180} endAngle={0} data={data} cx="50%" cy="50%" innerRadius={90} outerRadius={130} stroke="none">
                        <Cell fill={value >= 0.9 ? '#00D9FF' : '#f43f5e'} />
                        <Cell fill="#1e293b" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-8 text-center"><div className="text-xs text-slate-400">SPI</div><div className="text-2xl font-bold text-white">{value}</div></div>
        </div>
    );
};

const ProgressGauge = ({ value }) => {
    const data = [{ name: 'Progress', value: value }, { name: 'Remaining', value: 100 - value }];
    const getColor = (v) => v >= 90 ? '#00D9FF' : v >= 50 ? '#0EA5E9' : v > 0 ? '#f59e0b' : '#64748b';
    return (
        <div className="relative h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                        <Cell fill={getColor(value)} />
                        <Cell fill="#1e293b" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold text-white">{value}%</span><span className="text-sm text-slate-400">Complete</span></div>
        </div>
    );
};

const AllocationDonut = ({ allocation, squad }) => {
    const data = [{ name: 'Allocation', value: allocation }, { name: 'Remaining', value: Math.max(0, 5 - allocation) }];
    return (
        <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                        <Cell fill="#00D9FF" />
                        <Cell fill="#1e293b" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><div className="text-xs text-slate-400">Team Allocation</div><div className="text-3xl font-bold text-white">{allocation.toFixed(1)}</div><div className="text-[10px] text-cyan-400 mt-1">{squad}</div></div>
        </div>
    );
};

const TeamList = ({ initiative, devData }) => {
    const team = devData.filter(d => d.initiative === initiative);
    if (team.length === 0) return <div className="text-slate-500 text-sm text-center py-4">No team data available</div>;
    return (
        <div className="space-y-3">
            {team.map((member, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><Users size={16} /></div>
                    <div className="flex-1"><div className="flex justify-between text-sm mb-1"><span className="text-slate-200">{member.dev}</span><span className="text-slate-400">{member.percentage}%</span></div><div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${member.percentage}%` }} /></div></div>
                </div>
            ))}
        </div>
    );
};

const DetailView = ({ item, devData }) => {
    if (!item) return null;
    const team = devData.filter(d => d.initiative === item.initiative);
    const totalAllocation = team.reduce((acc, curr) => acc + curr.percentage, 0) / 100;
    const displayAllocation = totalAllocation > 0 ? totalAllocation : item.allocation;

    return (
        <div className="space-y-6 animate-shimmer" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-6 flex flex-col items-center"><h3 className="text-slate-400 text-sm font-medium mb-4 w-full text-left">SPI</h3><SPIGauge value={item.spi} /></div>
                <div className="glass rounded-2xl p-6 flex flex-col items-center"><h3 className="text-slate-400 text-sm font-medium mb-4 w-full text-left">Allocation</h3><AllocationDonut allocation={displayAllocation} squad={item.squad} /></div>
                <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-800/50"><h3 className="text-slate-400 text-sm font-medium mb-2 w-full text-center">Progress</h3><ProgressGauge value={item.status} /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                        <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Initiative</div><div className="text-lg font-medium text-white mt-1">{item.initiative}</div></div>
                        <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Start</div><div className="text-lg font-medium text-white mt-1">{item.start}</div></div>
                        <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Delivery</div><div className="text-lg font-medium text-white mt-1">{item.delivery}</div></div>
                    </div>
                    <div className="space-y-4 mt-4">
                        <div className="flex gap-4"><div className="w-24 shrink-0 text-sm font-semibold text-slate-400">Scope</div><div className="text-sm text-slate-200 leading-relaxed">{item.scope}</div></div>
                        <div className="h-px bg-white/5" />
                        <div className="flex gap-4"><div className="w-24 shrink-0 text-sm font-semibold text-slate-400">Comments</div><div className="text-sm text-slate-200 leading-relaxed">{item.comments}</div></div>
                    </div>
                </div>
                <div className="glass rounded-2xl p-6"><h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2"><Users size={16} /> Team</h3><TeamList initiative={item.initiative} devData={devData} /></div>
            </div>
            <div className="glass rounded-2xl p-6"><h3 className="text-slate-400 text-sm font-medium mb-4">Roadmap</h3><GanttChart data={[item]} /></div>
        </div>
    );
};

const DeliveryRoadmapView = ({ projectData, devAllocationData }) => {
    const [selectedSquad, setSelectedSquad] = useState('All');
    const [selectedInitiative, setSelectedInitiative] = useState('All');

    const squads = useMemo(() => ['All', ...new Set(projectData.map(d => d.squad))], [projectData]);
    const initiatives = useMemo(() => {
        let data = projectData;
        if (selectedSquad !== 'All') {
            data = data.filter(d => d.squad === selectedSquad);
        }
        return ['All', ...new Set(data.map(d => d.initiative))];
    }, [projectData, selectedSquad]);

    const filteredData = useMemo(() => {
        let data = projectData;
        if (selectedSquad !== 'All') data = data.filter(d => d.squad === selectedSquad);
        if (selectedInitiative !== 'All') data = data.filter(d => d.initiative === selectedInitiative);
        return data;
    }, [projectData, selectedSquad, selectedInitiative]);

    const selectedItem = useMemo(() => {
        if (selectedInitiative !== 'All') {
            return projectData.find(d => d.initiative === selectedInitiative);
        }
        return null;
    }, [projectData, selectedInitiative]);

    const stats = useMemo(() => {
        const total = filteredData.length;
        const avgSPI = total ? (filteredData.reduce((acc, curr) => acc + curr.spi, 0) / total).toFixed(2) : 0;
        const avgProgress = total ? Math.round(filteredData.reduce((acc, curr) => acc + curr.status, 0) / total) : 0;
        const atRisk = filteredData.filter(d => d.spi < 0.9 || d.status < 20).map(d => d.initiative);
        return { total, avgSPI, avgProgress, atRisk };
    }, [filteredData]);

    return (
        <div className="space-y-8 animate-shimmer" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Filters */}
            <div className="flex gap-4 mb-8">
                <div className="relative group">
                    <select
                        className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[150px]"
                        value={selectedSquad}
                        onChange={(e) => { setSelectedSquad(e.target.value); setSelectedInitiative('All'); }}
                    >
                        {squads.map(s => <option key={s} value={s}>{s} Squad</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-cyan-400 transition-colors" size={16} />
                </div>

                <div className="relative group">
                    <select
                        className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[200px]"
                        value={selectedInitiative}
                        onChange={(e) => setSelectedInitiative(e.target.value)}
                    >
                        {initiatives.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-cyan-400 transition-colors" size={16} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Active Initiatives" value={stats.total} label="Projects in flight" trend="positive" color="blue" icon={Activity} />
                <KPICard title="Avg. SPI" value={stats.avgSPI} label="Schedule Performance" trend={stats.avgSPI >= 0.9 ? 'positive' : 'negative'} color="purple" icon={Calendar} explanation="SPI > 1.0 means ahead of schedule." />
                <KPICard title="Avg. Completion" value={`${stats.avgProgress}%`} label="Overall Progress" trend="positive" color="emerald" icon={Layout} />
                <KPICard title="At Risk" value={stats.atRisk.length} label="Requires Attention" trend={stats.atRisk.length === 0 ? 'positive' : 'negative'} color="rose" icon={AlertCircle} tooltip={stats.atRisk} />
            </div>

            {/* Main Content Area */}
            {selectedItem ? (
                <DetailView item={selectedItem} devData={devAllocationData} />
            ) : (
                <div className="space-y-6">
                    {/* Roadmap / Timeline - Full Width */}
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-slate-400 text-sm font-medium mb-6">Timeline Overview (Roadmap)</h3>
                        <GanttChart data={filteredData} />
                    </div>

                    {/* Resource Distribution */}
                    <div className="glass rounded-2xl p-6">
                        <h3 className="text-slate-400 text-sm font-medium mb-6">Resource Distribution</h3>
                        <AllocationChart data={filteredData} />
                    </div>
                </div>
            )}

            {/* Developer Workload Section */}
            <DeveloperWorkload devData={devAllocationData} />
        </div>
    );
};

export default DeliveryRoadmapView;
