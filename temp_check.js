        try {
            const { useState, useMemo, useEffect } = React;

            // Safe Recharts access
            const RechartsObj = window.Recharts;
            if (!RechartsObj) {
                throw new Error("Recharts library failed to load. Please check your internet connection.");
            }
            const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Sector } = RechartsObj;

            const Icons = {
                AlertCircle: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                ),
                ArrowDownRight: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="7" y1="7" x2="17" y2="17"></line><polyline points="17 7 17 17 7 17"></polyline></svg>
                ),
                ArrowUpRight: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                ),
                Activity: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                ),
                Users: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                ),
                Calendar: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ),
                ChevronDown: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>
                ),
                Info: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                ),
                User: ({ size = 24, className = "" }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                )
            };

            const SHEET_URLS = {
                project: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1503252593',
                allocation: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1194298779'
            };

            // Multiple CORS Proxies with fallback
            const CORS_PROXIES = [
                'https://corsproxy.io/?',
                'https://api.allorigins.win/raw?url=',
                'https://api.codetabs.com/v1/proxy?quest=',
                '' // Try direct access as last resort
            ];

            // Mock Data for Fallback
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

            const parseCSV = (text, type) => {
                const rows = [];
                let currentRow = [];
                let currentVal = '';
                let inQuotes = false;

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];

                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        currentRow.push(currentVal.trim());
                        currentVal = '';
                    } else if ((char === '\n' || char === '\r') && !inQuotes) {
                        if (char === '\r' && nextChar === '\n') i++;
                        if (currentRow.length > 0 || currentVal) {
                            currentRow.push(currentVal.trim());
                            rows.push(currentRow);
                        }
                        currentRow = [];
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                if (currentRow.length > 0 || currentVal) {
                    currentRow.push(currentVal.trim());
                    rows.push(currentRow);
                }

                const headers = rows[0];
                return rows.slice(1).map(values => {
                    const entry = {};
                    headers.forEach((h, i) => {
                        let val = values[i]?.replace(/^"|"$/g, '').trim();
                        if (type === 'project') {
                            if (h === 'Current Status') val = parseFloat(val) || 0;
                            if (h === 'SPI') val = parseFloat(val) || 0;
                            if (h === 'Team Allocation') val = parseFloat(val) || 0;
                        } else if (type === 'allocation') {
                            if (h === 'Percentage') val = parseFloat(val.replace('%', '')) || 0;
                        }
                        if (h === 'Squad') entry.squad = val;
                        if (h === 'Initiatives') entry.initiative = val;
                        if (h === 'Start') entry.start = val;
                        if (h === 'Current Status') entry.status = val;
                        if (h === 'Estimated Delivery') entry.delivery = val;
                        if (h === 'SPI') entry.spi = val;
                        if (h === 'Team Allocation') entry.allocation = val;
                        if (h === 'Comments') entry.comments = val;
                        if (h === 'Scope') entry.scope = val;
                        if (h === 'Dev') entry.dev = val;
                        if (h === 'Percentage') entry.percentage = val;
                    });
                    return entry;
                }).filter(entry => entry.squad && entry.initiative);
            };

            const KPICard = ({ title, value, label, trend, color, icon: Icon, tooltip, explanation }) => {
                return (
                    <div className="glass rounded-2xl p-6 relative group hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
                                <div className="text-3xl font-bold text-white mt-2">{value}</div>
                            </div>
                            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400`}>
                                {Icon && <Icon size={24} />}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`flex items-center text-xs font-medium ${trend === 'negative' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {trend === 'negative' ? <Icons.ArrowDownRight size={16} className="mr-1" /> : <Icons.ArrowUpRight size={16} className="mr-1" />}
                                {trend === 'negative' ? 'Needs Attention' : 'On Track'}
                            </span>
                            <span className="text-xs text-slate-500">{label}</span>
                        </div >

                        {/* Tooltip */}
                        {
                            (tooltip || explanation) && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[250px] max-w-[400px]">
                                        {explanation && (
                                            <div className="text-xs text-slate-300 mb-2 leading-relaxed border-b border-slate-700 pb-2">
                                                {explanation}
                                            </div>
                                        )}
                                        {tooltip && (
                                            <>
                                                <div className="text-xs font-semibold text-slate-300 mb-2">At Risk Initiatives:</div>
                                                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {tooltip.map((item, i) => (
                                                        <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                                            <span className="text-rose-400 mt-0.5">•</span>
                                                            <span className="flex-1">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                                    </div>
                                </div>
                            )
                        }
                    </div >
                );
            };

            const SPIGauge = ({ value }) => {
                const data = [
                    { name: 'Score', value: Math.min(value, 2) },
                    { name: 'Remaining', value: 2 - Math.min(value, 2) }
                ];
                const cx = 150;
                const cy = 150;
                const iR = 90;
                const oR = 130;

                // Needle
                const needleValue = value;
                const total = 2;
                const ang = 180 * (1 - needleValue / total);
                const length = (iR + 2 * oR) / 3;
                const sin = Math.sin(-ang * Math.PI / 180);
                const cos = Math.cos(-ang * Math.PI / 180);
                const r = 5;
                const x0 = cx + 5;
                const y0 = cy + 5;
                const xp = x0 + length * cos;
                const yp = y0 + length * sin;

                return (
                    <div className="relative h-[220px] flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    dataKey="value"
                                    startAngle={180}
                                    endAngle={0}
                                    data={data}
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={iR}
                                    outerRadius={oR}
                                    fill="#8884d8"
                                    stroke="none"
                                >
                                    <Cell fill={value >= 0.9 ? '#00D9FF' : '#f43f5e'} />
                                    <Cell fill="#1e293b" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Needle */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            <svg width="100%" height="100%" viewBox="0 0 300 300">
                                <line x1={cx} y1={cy} x2={xp} y2={yp} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                                <circle cx={cx} cy={cy} r={r} fill="#f8fafc" />
                            </svg>
                        </div>
                        <div className="absolute bottom-8 text-center">
                            <div className="text-xs text-slate-400">SPI</div>
                            <div className="text-2xl font-bold text-white">{value}</div>
                        </div>
                        <div className="flex justify-between w-full px-12 absolute bottom-4 text-xs text-slate-500">
                            <span>0</span>
                            <span>2</span>
                        </div>
                    </div>
                );
            };

            const ProgressGauge = ({ value }) => {
                const data = [
                    { name: 'Progress', value: value },
                    { name: 'Remaining', value: 100 - value }
                ];

                const getColor = (v) => {
                    if (v >= 90) return '#00D9FF'; // Cyan
                    if (v >= 50) return '#0EA5E9'; // Sky blue
                    if (v > 0) return '#f59e0b';   // Amber
                    return '#64748b';              // Slate
                };

                return (
                    <div className="relative h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill={getColor(value)} />
                                    <Cell fill="#1e293b" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-white">{value}%</span>
                            <span className="text-sm text-slate-400">Complete</span>
                        </div>
                    </div>
                );
            };

            const AllocationDonut = ({ allocation, squad }) => {
                const data = [
                    { name: 'Allocation', value: allocation },
                    { name: 'Remaining', value: Math.max(0, 5 - allocation) } // Assuming max 5 for viz
                ];
                return (
                    <div className="relative h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#00D9FF" />
                                    <Cell fill="#1e293b" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-xs text-slate-400">Team Allocation</div>
                            <div className="text-3xl font-bold text-white">{allocation.toFixed(1)}</div>
                            <div className="text-[10px] text-cyan-400 mt-1">{squad}</div>
                        </div>
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
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Icons.User size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-200">{member.dev}</span>
                                        <span className="text-slate-400">{member.percentage}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500 rounded-full"
                                            style={{ width: `${member.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            };

            const GanttChart = ({ data }) => {
                const parseDate = (str) => new Date(str);
                const diffDays = (d1, d2) => Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));

                // Sort data by start date (standard Gantt view)
                const sortedData = useMemo(() => {
                    return [...data].sort((a, b) => parseDate(a.start) - parseDate(b.start));
                }, [data]);

                const { startDate, totalDays, months } = useMemo(() => {
                    const dates = sortedData.flatMap(d => [parseDate(d.start), parseDate(d.delivery)]);
                    const min = new Date(Math.min(...dates));
                    const max = new Date(Math.max(...dates));

                    const start = new Date(min.getFullYear(), min.getMonth(), 1);
                    const end = new Date(max.getFullYear(), max.getMonth() + 2, 0);

                    const total = diffDays(end, start);

                    const ms = [];
                    let curr = new Date(start);
                    while (curr < end) {
                        ms.push(new Date(curr));
                        curr.setMonth(curr.getMonth() + 1);
                    }

                    return { startDate: start, totalDays: total, months: ms };
                }, [sortedData]);

                const getPos = (start, end) => {
                    const left = (diffDays(parseDate(start), startDate) / totalDays) * 100;
                    const width = (diffDays(parseDate(end), parseDate(start)) / totalDays) * 100;
                    return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` };
                };

                const getStatusColor = (s) => s >= 90 ? 'bg-cyan-500' : s >= 50 ? 'bg-sky-500' : s > 0 ? 'bg-amber-500' : 'bg-slate-600';

                return (
                    <div className="w-full overflow-x-auto custom-scrollbar">
                        <div className="min-w-[800px]">
                            <div className="flex border-b border-white/10 mb-4 pb-2 text-xs text-slate-500 relative h-8">
                                <div className="w-1/4 pl-4 shrink-0">Initiative</div>
                                <div className="w-3/4 relative">
                                    {months.map((m, i) => {
                                        const left = (diffDays(m, startDate) / totalDays) * 100;
                                        return (
                                            <div key={i} className="absolute top-0 border-l border-white/5 pl-1" style={{ left: `${left}%` }}>
                                                {m.toLocaleString('default', { month: 'short' })}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {sortedData.map((item, i) => {
                                    const { left, width } = getPos(item.start, item.delivery);
                                    return (
                                        <div key={i} className="flex items-center group hover:bg-white/5 rounded-lg py-2 transition-colors">
                                            <div className="w-1/4 shrink-0 px-4">
                                                <div className="font-medium text-sm text-slate-200 truncate" title={item.initiative}>{item.initiative}</div>
                                                <div className="text-xs text-slate-500 truncate">{item.squad}</div>
                                            </div>
                                            <div className="w-3/4 relative h-8 flex items-center px-2">
                                                {months.map((m, idx) => {
                                                    const l = (diffDays(m, startDate) / totalDays) * 100;
                                                    return <div key={idx} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: `${l}%` }} />
                                                })}

                                                <div
                                                    className="absolute h-5 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600/30"
                                                    style={{ left, width }}
                                                >
                                                    <div
                                                        className={`h-full ${getStatusColor(item.status)} opacity-90`}
                                                        style={{ width: `${item.status}%` }}
                                                    />
                                                </div>

                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 bg-slate-900 text-xs px-2 py-1 rounded border border-slate-700 transition-opacity pointer-events-none z-10">
                                                    {item.status}% • {item.delivery}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            };

            const DetailView = ({ item, devData }) => {
                if (!item) return null;

                // Calculate total allocation from dev data
                const team = devData.filter(d => d.initiative === item.initiative);
                const totalAllocation = team.reduce((acc, curr) => acc + curr.percentage, 0) / 100;
                const displayAllocation = totalAllocation > 0 ? totalAllocation : item.allocation;

                return (
                    <div className="space-y-6 animate-shimmer" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* SPI Gauge */}
                            <div className="glass rounded-2xl p-6 flex flex-col items-center">
                                <h3 className="text-slate-400 text-sm font-medium mb-4 w-full text-left">SPI (Schedule Performance Index)</h3>
                                <SPIGauge value={item.spi} />
                            </div>

                            {/* Allocation */}
                            <div className="glass rounded-2xl p-6 flex flex-col items-center">
                                <h3 className="text-slate-400 text-sm font-medium mb-4 w-full text-left">Squad by Team Allocation</h3>
                                <AllocationDonut allocation={displayAllocation} squad={item.squad} />
                            </div>

                            {/* Progress */}
                            <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-800/50">
                                <h3 className="text-slate-400 text-sm font-medium mb-2 w-full text-center">Progress</h3>
                                <ProgressGauge value={item.status} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Info Box */}
                            <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Initiative</div>
                                        <div className="text-lg font-medium text-white mt-1">{item.initiative}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Start</div>
                                        <div className="text-lg font-medium text-white mt-1">{item.start}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estimated Delivery</div>
                                        <div className="text-lg font-medium text-white mt-1">{item.delivery}</div>
                                    </div>
                                </div>

                                <div className="space-y-4 mt-4">
                                    <div className="flex gap-4">
                                        <div className="w-24 shrink-0 text-sm font-semibold text-slate-400">Scope</div>
                                        <div className="text-sm text-slate-200 leading-relaxed">{item.scope}</div>
                                    </div>
                                    <div className="h-px bg-white/5" />
                                    <div className="flex gap-4">
                                        <div className="w-24 shrink-0 text-sm font-semibold text-slate-400">Comments</div>
                                        <div className="text-sm text-slate-200 leading-relaxed">{item.comments}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Team List */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-slate-400 text-sm font-medium mb-4 flex items-center gap-2">
                                    <Icons.Users size={16} /> Team Composition
                                </h3>
                                <TeamList initiative={item.initiative} devData={devData} />
                            </div>
                        </div>

                        {/* Roadmap / Gantt for Single Item */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-slate-400 text-sm font-medium mb-4">Roadmap</h3>
                            <GanttChart data={[item]} />
                        </div>
                    </div>
                );
            };

            const AllocationChart = ({ data }) => {
                const squadData = useMemo(() => {
                    return data.reduce((acc, curr) => {
                        const existing = acc.find(item => item.name === curr.squad);
                        if (existing) {
                            existing.value += curr.allocation;
                        } else {
                            acc.push({ name: curr.squad, value: curr.allocation });
                        }
                        return acc;
                    }, []);
                }, [data]);

                const COLORS = ['#00D9FF', '#0EA5E9', '#22D3EE'];

                return (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={squadData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {squadData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            };

            const DeveloperWorkload = ({ devData }) => {
                const workload = useMemo(() => {
                    if (!devData) return [];
                    const map = {};
                    devData.forEach(item => {
                        if (item.dev === 'None') return;
                        if (!map[item.dev]) {
                            map[item.dev] = { name: item.dev, total: 0, tasks: [] };
                        }
                        map[item.dev].total += item.percentage;
                        map[item.dev].tasks.push({ initiative: item.initiative, pct: item.percentage, squad: item.squad });
                    });
                    return Object.values(map).sort((a, b) => b.total - a.total);
                }, [devData]);

                return (
                    <div className="glass rounded-2xl p-6 mt-8">
                        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                            <Icons.Users className="text-cyan-400 w-5 h-5" /> Developer Workload & Allocation
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workload.map((dev, i) => (
                                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 font-medium border border-white/5">
                                                {dev.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{dev.name}</div>
                                                <div className={`text-xs font-medium ${dev.total > 100 ? 'text-rose-400' : dev.total >= 80 ? 'text-cyan-400' : 'text-sky-400'}`}>
                                                    {dev.total}% Allocation
                                                </div>
                                            </div>
                                        </div>
                                        {dev.total > 100 && (
                                            <div className="text-rose-400" title="Overallocated">
                                                <Icons.AlertCircle size={16} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {dev.tasks.map((task, t) => (
                                            <div key={t} className="text-xs">
                                                <div className="flex justify-between text-slate-400 mb-1">
                                                    <span className="truncate pr-2" title={task.initiative}>{task.initiative}</span>
                                                    <span className="shrink-0">{task.pct}%</span>
                                                </div>
                                                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${task.squad === 'Core Infrastructure' ? 'bg-cyan-500' : task.squad === 'Integration' ? 'bg-sky-500' : 'bg-teal-500'}`}
                                                        style={{ width: `${task.pct}%` }}
                                                    />
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

            const Dashboard = () => {
                const [projectData, setProjectData] = useState([]);
                const [devAllocationData, setDevAllocationData] = useState([]);
                const [loading, setLoading] = useState(true);
                const [error, setError] = useState(null);

                const [selectedSquad, setSelectedSquad] = useState('All');
                const [selectedInitiative, setSelectedInitiative] = useState('All');

                useEffect(() => {
                    const fetchWithFallback = async (url) => {
                        let lastError;

                        for (const proxy of CORS_PROXIES) {
                            try {
                                const fullUrl = proxy + (proxy ? encodeURIComponent(url) : url);
                                const response = await fetch(fullUrl);

                                if (response.ok) {
                                    return await response.text();
                                }
                            } catch (err) {
                                lastError = err;
                                console.warn(`Proxy ${proxy || 'direct'} failed, trying next...`);
                            }
                        }

                        throw lastError || new Error('All proxies failed');
                    };

                    const loadData = async () => {
                        try {
                            setLoading(true);

                            const [projText, allocText] = await Promise.all([
                                fetchWithFallback(SHEET_URLS.project),
                                fetchWithFallback(SHEET_URLS.allocation)
                            ]);

                            setProjectData(parseCSV(projText, 'project'));
                            setDevAllocationData(parseCSV(allocText, 'allocation'));
                            setLoading(false);
                        } catch (err) {
                            console.error("Fetch failed, using mock data:", err);
                            // Fallback to mock data
                            setProjectData(MOCK_PROJECT_DATA);
                            setDevAllocationData(MOCK_ALLOCATION_DATA);
                            setError(null); // Clear error to show dashboard
                            setLoading(false);

                            // Show toast for offline mode
                            const overlay = document.getElementById('error-overlay');
                            if (overlay) {
                                overlay.style.display = 'block';
                                overlay.style.background = 'rgba(245, 158, 11, 0.9)'; // Amber warning
                                overlay.style.color = '#fff';
                                overlay.innerHTML = `<strong>Offline Mode:</strong> Unable to fetch live data. Showing cached/mock data.<br><small>${err.message}</small>`;
                                setTimeout(() => { overlay.style.display = 'none'; }, 5000);
                            }
                        }
                    };

                    loadData();
                }, []);

                const squads = useMemo(() => ['All', ...new Set(projectData.map(d => d.squad))], [projectData]);

                const filteredInitiatives = useMemo(() => {
                    if (selectedSquad === 'All') return projectData;
                    return projectData.filter(d => d.squad === selectedSquad);
                }, [selectedSquad, projectData]);

                const initiativeOptions = useMemo(() => ['All', ...filteredInitiatives.map(d => d.initiative)], [filteredInitiatives]);

                const activeItem = useMemo(() => {
                    if (selectedInitiative !== 'All') {
                        return projectData.find(d => d.initiative === selectedInitiative);
                    }
                    return null;
                }, [selectedInitiative, projectData]);

                const metrics = useMemo(() => {
                    if (projectData.length === 0) return { total: 0, avgSPI: 0, totalAlloc: 0, critical: 0, criticalItems: [] };
                    const data = selectedSquad === 'All' ? projectData : projectData.filter(d => d.squad === selectedSquad);
                    const total = data.length;
                    const avgSPI = total > 0 ? data.reduce((a, c) => a + c.spi, 0) / total : 0;
                    const totalAlloc = data.reduce((a, c) => a + c.allocation, 0);
                    const criticalItems = data.filter(i => i.spi < 0.8 || i.status < 20);
                    const critical = criticalItems.length;
                    const criticalNames = criticalItems.map(i => i.initiative);
                    return { total, avgSPI, totalAlloc, critical, criticalNames };
                }, [selectedSquad, projectData]);

                if (loading) {
                    return (
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <h2 className="text-xl text-slate-300">Loading Project Data...</h2>
                            </div>
                        </div>
                    );
                }

                if (error) {
                    return (
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="text-center max-w-md p-8 glass rounded-2xl border-rose-500/30">
                                <Icons.AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                                <h2 className="text-xl text-white font-bold mb-2">Unable to Load Data</h2>
                                <p className="text-slate-400 mb-4">{error}</p>
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                                    Retry
                                </button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
                        {/* Header */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <img src="logo.svg" alt="Logo" className="h-8 brightness-0 invert" />
                                    Delivery Dashboard
                                </h1>
                                <p className="text-slate-400 mt-1">Real-time project tracking & resource allocation</p>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-4">
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-slate-800 border border-slate-700 text-white py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        value={selectedSquad}
                                        onChange={(e) => { setSelectedSquad(e.target.value); setSelectedInitiative('All'); }}
                                    >
                                        {squads.map(s => <option key={s} value={s}>{s === 'All' ? 'All Squads' : s}</option>)}
                                    </select>
                                    <Icons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-slate-800 border border-slate-700 text-white py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        value={selectedInitiative}
                                        onChange={(e) => setSelectedInitiative(e.target.value)}
                                    >
                                        {initiativeOptions.map(i => <option key={i} value={i}>{i === 'All' ? 'All Initiatives' : i}</option>)}
                                    </select>
                                    <Icons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </header>

                        {activeItem ? (
                            // DETAIL VIEW
                            <DetailView item={activeItem} devData={devAllocationData} />
                        ) : (
                            // OVERVIEW
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KPICard
                                        title="Active Initiatives"
                                        value={metrics.total}
                                        label="Total projects"
                                        trend="positive"
                                        color="cyan"
                                        icon={Icons.Activity}
                                        explanation="Total number of active projects currently being tracked in the dashboard."
                                    />
                                    <KPICard
                                        title="Avg SPI"
                                        value={metrics.avgSPI.toFixed(2)}
                                        label="Schedule Performance"
                                        trend={metrics.avgSPI >= 0.9 ? "positive" : "negative"}
                                        color="cyan"
                                        icon={Icons.Calendar}
                                        explanation="Schedule Performance Index (SPI). A value < 1.0 indicates the project is behind schedule, while > 1.0 indicates ahead of schedule."
                                    />
                                    <KPICard
                                        title="Team Allocation"
                                        value={metrics.totalAlloc.toFixed(1)}
                                        label="FTE across squads"
                                        trend="positive"
                                        color="emerald"
                                        icon={Icons.Users}
                                        explanation="Total Full-Time Equivalent (FTE) developers currently assigned across all squads."
                                    />
                                    <KPICard
                                        title="At Risk"
                                        value={metrics.critical}
                                        label="Need attention"
                                        trend={metrics.critical > 0 ? "negative" : "positive"}
                                        color="rose"
                                        icon={Icons.AlertCircle}
                                        tooltip={metrics.critical > 0 ? metrics.criticalNames : null}
                                        explanation="Initiatives with SPI < 0.8 or Progress < 20% that require immediate attention."
                                    />
                                </div>

                                {/* Full-width Timeline */}
                                <div className="glass rounded-2xl p-6">
                                    <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                                        <Icons.Calendar className="text-cyan-400 w-5 h-5" /> Delivery Timeline
                                    </h2>
                                    <GanttChart data={selectedSquad === 'All' ? projectData : filteredInitiatives} />
                                </div>

                                {/* Squad Allocation - Horizontal */}
                                <div className="glass rounded-2xl p-6">
                                    <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                                        <Icons.Activity className="text-cyan-400 w-5 h-5" /> Squad Allocation
                                    </h2>
                                    <AllocationChart data={selectedSquad === 'All' ? projectData : filteredInitiatives} />
                                </div>

                                <DeveloperWorkload devData={selectedSquad === 'All' ? devAllocationData : devAllocationData.filter(d => d.squad === selectedSquad)} />
                            </>
                        )}
                    </div>
                );
            };

            // Render
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<Dashboard />);
        } catch (error) {
            const overlay = document.getElementById('error-overlay');
            if (overlay) {
                overlay.style.display = 'block';
                overlay.innerHTML = `Critical Error:\n${error.message}\n\nStack:\n${error.stack}`;
            }
            console.error(error);
        }
    </script>
