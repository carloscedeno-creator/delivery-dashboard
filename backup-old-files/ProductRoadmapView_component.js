// Complete ProductRoadmapView Component Implementation
const ProductRoadmapView = () => {
    const [data, setData] = useState([]);
    const [bugsData, setBugsData] = useState([]);
    const [releasesData, setReleasesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        ba: 'All',
        designer: 'All',
        team: 'All',
        quarter: 'All'
    });

    // CSV URLs
    const CSV_URLS = {
        initiatives: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv',
        bugRelease: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=1707343419&single=true&output=csv'
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch initiatives data
                const initRes = await fetch(CSV_URLS.initiatives);
                const initText = await initRes.text();
                const initLines = initText.trim().split('\n');
                const initHeaders = initLines[3].split(','); // Line 4 has headers
                const initDataParsed = initLines.slice(4).map(line => {
                    const values = line.split(',');
                    return {
                        initiative: values[1] || '',
                        ba: values[3] || '',
                        designer: values[4] || '',
                        team: (values[5] || '').trim(),
                        quarter: values[6] || '',
                        status: values[11] || 'Unknown',
                        effortDays: parseInt(values[12]) || 0,
                        completion: parseInt((values[21] || '0').replace('%', '')) || 0
                    };
                }).filter(item => item.initiative && item.initiative.trim());

                setData(initDataParsed);

                // Fetch bugs and releases data
                const bugRes = await fetch(CSV_URLS.bugRelease);
                const bugText = await bugRes.text();
                const bugLines = bugText.trim().split('\n');

                // Parse bugs (lines 3-5)
                const bugs = bugLines.slice(3, 6).map(line => {
                    const values = line.split(',');
                    return {
                        month: values[1] || '',
                        reported: parseInt(values[2]) || 0,
                        attended: parseInt(values[3]) || 0,
                        attendance: parseInt((values[4] || '0').replace('%', '')) || 0
                    };
                }).filter(b => b.month);

                setBugsData(bugs);

                // Parse releases (lines 9+)
                const releases = bugLines.slice(9).map(line => {
                    const values = line.split(',');
                    return {
                        release: values[1] || '',
                        devDone: values[2] || '',
                        handover: values[3] || '',
                        deployment: values[4] || ''
                    };
                }).filter(r => r.release && r.release.trim());

                setReleasesData(releases);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load product data:', err);
                setError('Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Filter data based on selected filters
    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (filters.ba !== 'All' && item.ba !== filters.ba) return false;
            if (filters.designer !== 'All' && item.designer !== filters.designer) return false;
            if (filters.team !== 'All' && item.team !== filters.team) return false;
            if (filters.quarter !== 'All' && item.quarter !== filters.quarter) return false;
            return true;
        });
    }, [data, filters]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalInitiatives = filteredData.length;
        const avgCompletion = filteredData.length > 0
            ? Math.round(filteredData.reduce((sum, item) => sum + item.completion, 0) / filteredData.length)
            : 0;
        const avgEffort = filteredData.length > 0
            ? Math.round(filteredData.reduce((sum, item) => sum + item.effortDays, 0) / filteredData.length)
            : 0;
        const totalReleases = releasesData.length;

        return { totalInitiatives, avgCompletion, avgEffort, totalReleases };
    }, [filteredData, releasesData]);

    // Get unique filter options
    const filterOptions = useMemo(() => {
        return {
            bas: ['All', ...new Set(data.map(d => d.ba).filter(Boolean))],
            designers: ['All', ...new Set(data.map(d => d.designer).filter(Boolean))],
            teams: ['All', ...new Set(data.map(d => d.team).filter(Boolean))],
            quarters: ['All', ...new Set(data.map(d => d.quarter).filter(Boolean))]
        };
    }, [data]);

    // Chart data
    const chartData = useMemo(() => {
        // Initiatives per Quarter
        const quarterMap = {};
        filteredData.forEach(item => {
            quarterMap[item.quarter] = (quarterMap[item.quarter] || 0) + 1;
        });
        const quarterData = Object.entries(quarterMap).map(([name, value]) => ({ name, value }));

        // Initiatives per Team
        const teamMap = {};
        filteredData.forEach(item => {
            teamMap[item.team] = (teamMap[item.team] || 0) + 1;
        });
        const teamData = Object.entries(teamMap).map(([name, value]) => ({ name, value }));

        // Initiatives per BA
        const baMap = {};
        filteredData.forEach(item => {
            baMap[item.ba] = (baMap[item.ba] || 0) + 1;
        });
        const baData = Object.entries(baMap).map(([name, value]) => ({ name, value }));

        // Initiatives per Designer
        const designerMap = {};
        filteredData.forEach(item => {
            designerMap[item.designer] = (designerMap[item.designer] || 0) + 1;
        });
        const designerData = Object.entries(designerMap).map(([name, value]) => ({ name, value }));

        // Initiatives per Status
        const statusMap = {};
        filteredData.forEach(item => {
            statusMap[item.status] = (statusMap[item.status] || 0) + 1;
        });
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        return { quarterData, teamData, baData, designerData, statusData };
    }, [filteredData]);

    const STATUS_COLORS = {
        'Early': '#00D9FF',
        'On Time': '#0EA5E9',
        'Delay': '#f59e0b',
        'Not Started': '#64748b'
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;
    if (error) return <div className="text-rose-400 text-center">{error}</div>;

    return (
        <div className="space-y-8">
            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass rounded-2xl p-6 hover:scale-105 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-slate-400 text-sm font-medium">Total Initiatives</h3>
                            <div className="text-3xl font-bold text-white mt-2">{kpis.totalInitiatives}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                            <Icons.Activity size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs">Active projects</p>
                </div>

                <div className="glass rounded-2xl p-6 hover:scale-105 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-slate-400 text-sm font-medium">Avg Completion</h3>
                            <div className="text-3xl font-bold text-white mt-2">{kpis.avgCompletion}%</div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Icons.CheckCircle size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs">Average progress</p>
                </div>

                <div className="glass rounded-2xl p-6 hover:scale-105 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-slate-400 text-sm font-medium">Avg Effort</h3>
                            <div className="text-3xl font-bold text-white mt-2">{kpis.avgEffort}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                            <Icons.Calendar size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs">Days on average</p>
                </div>

                <div className="glass rounded-2xl p-6 hover:scale-105 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-slate-400 text-sm font-medium">Total Releases</h3>
                            <div className="text-3xl font-bold text-white mt-2">{kpis.totalReleases}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <Icons.Truck size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs">Planned releases</p>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-3">
                    <label className="text-xs text-slate-400 block mb-1">BA</label>
                    <select
                        value={filters.ba}
                        onChange={(e) => setFilters({ ...filters, ba: e.target.value })}
                        className="w-full bg-transparent text-white border-none outline-none"
                    >
                        {filterOptions.bas.map(ba => <option key={ba} value={ba}>{ba}</option>)}
                    </select>
                </div>

                <div className="glass rounded-lg p-3">
                    <label className="text-xs text-slate-400 block mb-1">Designer</label>
                    <select
                        value={filters.designer}
                        onChange={(e) => setFilters({ ...filters, designer: e.target.value })}
                        className="w-full bg-transparent text-white border-none outline-none"
                    >
                        {filterOptions.designers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="glass rounded-lg p-3">
                    <label className="text-xs text-slate-400 block mb-1">Team</label>
                    <select
                        value={filters.team}
                        onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                        className="w-full bg-transparent text-white border-none outline-none"
                    >
                        {filterOptions.teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="glass rounded-lg p-3">
                    <label className="text-xs text-slate-400 block mb-1">Quarter</label>
                    <select
                        value={filters.quarter}
                        onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
                        className="w-full bg-transparent text-white border-none outline-none"
                    >
                        {filterOptions.quarters.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quarter Chart */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-300 font-medium mb-4">Initiatives per Quarter</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.quarterData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Bar dataKey="value" fill="#00D9FF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Team Chart */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-300 font-medium mb-4">Initiatives per Team</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.teamData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* BA Chart */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-300 font-medium mb-4">Initiatives per BA</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.baData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Bar dataKey="value" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Designer Chart */}
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-slate-300 font-medium mb-4">Initiatives per Designer</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.designerData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Pie Chart */}
                <div className="glass rounded-2xl p-6 lg:col-span-2">
                    <h3 className="text-slate-300 font-medium mb-4">Initiatives per Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={chartData.statusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {chartData.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Initiatives Table */}
            <div className="glass rounded-2xl p-6 overflow-x-auto">
                <h3 className="text-slate-300 font-medium mb-4">Initiatives Details</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Initiative</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">BA</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Designer</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Team</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Completion</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Effort</th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Quarter</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 px-4 text-white">{item.initiative}</td>
                                <td className="py-3 px-4 text-slate-300">{item.ba}</td>
                                <td className="py-3 px-4 text-slate-300">{item.designer}</td>
                                <td className="py-3 px-4 text-slate-300">{item.team}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs ${item.status === 'Early' ? 'bg-cyan-500/20 text-cyan-400' :
                                            item.status === 'On Time' ? 'bg-blue-500/20 text-blue-400' :
                                                item.status === 'Delay' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-slate-300">{item.completion}%</td>
                                <td className="py-3 px-4 text-slate-300">{item.effortDays} days</td>
                                <td className="py-3 px-4 text-slate-300">{item.quarter}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bugs Section */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Bugs Tracking</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {bugsData.map((bug, idx) => (
                        <div key={idx} className="glass rounded-2xl p-6">
                            <h3 className="text-slate-400 text-sm font-medium mb-4">{bug.month}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs">Reported</span>
                                    <span className="text-white font-bold">{bug.reported}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs">Attended</span>
                                    <span className="text-white font-bold">{bug.attended}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs">Attendance</span>
                                    <span className="text-emerald-400 font-bold">{bug.attendance}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Releases Section */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Releases</h2>
                <div className="glass rounded-2xl p-6 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Release</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Development Done</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Handover</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Deployment Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {releasesData.map((release, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 px-4 text-white">{release.release}</td>
                                    <td className="py-3 px-4 text-slate-300">{release.devDone || '-'}</td>
                                    <td className="py-3 px-4 text-slate-300">{release.handover || '-'}</td>
                                    <td className="py-3 px-4 text-slate-300">{release.deployment || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
