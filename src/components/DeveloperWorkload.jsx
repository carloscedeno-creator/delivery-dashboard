import React, { useMemo } from 'react';
import { Users, AlertCircle } from 'lucide-react';

const DeveloperWorkload = ({ devData }) => {
    const workload = useMemo(() => {
        if (!devData) return [];
        const map = {};
        devData.forEach(item => {
            if (item.dev === 'None') return;
            if (!map[item.dev]) map[item.dev] = { name: item.dev, total: 0, tasks: [] };
            map[item.dev].total += item.percentage;
            map[item.dev].tasks.push({ initiative: item.initiative, pct: item.percentage, squad: item.squad });
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [devData]);

    return (
        <div className="glass rounded-2xl p-6 mt-8">
            <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                <Users className="text-cyan-400 w-5 h-5" /> Developer Workload & Allocation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workload.map((dev, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 font-medium border border-white/5">{dev.name.charAt(0)}</div>
                                <div>
                                    <div className="font-medium text-slate-200">{dev.name}</div>
                                    <div className={`text-xs font-medium ${dev.total > 100 ? 'text-rose-400' : dev.total >= 80 ? 'text-cyan-400' : 'text-sky-400'}`}>{dev.total}% Allocation</div>
                                </div>
                            </div>
                            {dev.total > 100 && <div className="text-rose-400" title="Overallocated"><AlertCircle size={16} /></div>}
                        </div>
                        <div className="space-y-2">
                            {dev.tasks.map((task, t) => (
                                <div key={t} className="text-xs">
                                    <div className="flex justify-between text-slate-400 mb-1">
                                        <span className="truncate pr-2" title={task.initiative}>{task.initiative}</span>
                                        <span className="shrink-0">{task.pct}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${task.squad === 'Core Infrastructure' ? 'bg-cyan-500' : task.squad === 'Integration' ? 'bg-sky-500' : 'bg-teal-500'}`} style={{ width: `${task.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeveloperWorkload;
