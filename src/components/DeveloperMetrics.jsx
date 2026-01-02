import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, Star, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { 
  getSquads, 
  getSprintsForSquad, 
  getDevelopersForSquad, 
  getDeveloperMetricsData,
  getDeveloperById 
} from '../utils/developerMetricsApi';

const DeveloperMetrics = () => {
  console.log('🔵 [DeveloperMetrics] Componente renderizado');
  
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [developers, setDevelopers] = useState([]);
  
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [developerInfo, setDeveloperInfo] = useState(null);
  const [error, setError] = useState(null);

  // Load squads on start
  useEffect(() => {
    const loadSquads = async () => {
      try {
        setError(null);
        setLoading(true);
        console.log('🟢 [DeveloperMetrics] Loading squads...');
        const data = await getSquads();
        console.log('🟢 [DeveloperMetrics] Squads loaded:', data);
        setSquads(data);
        if (data.length > 0) {
          setSelectedSquad(data[0].id);
          console.log('🟢 [DeveloperMetrics] Squad selected:', data[0].id, data[0].squad_name);
        } else {
          setError('No squads found. Verify that Supabase is configured correctly.');
        }
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error loading squads:', error);
        setError(`Error loading squads: ${error.message}. Verify that Supabase is configured correctly.`);
      } finally {
        setLoading(false);
      }
    };
    loadSquads();
  }, []);

  // Load sprints when a squad is selected
  useEffect(() => {
    if (!selectedSquad) {
      setSprints([]);
      setSelectedSprint(null);
      return;
    }

    const loadSprints = async () => {
      try {
        console.log('🟢 [DeveloperMetrics] Loading sprints for squad:', selectedSquad);
        const data = await getSprintsForSquad(selectedSquad);
        console.log('🟢 [DeveloperMetrics] Sprints loaded:', data);
        setSprints(data);
        // Select current sprint if it exists
        const currentSprint = data.find(s => s.is_active);
        if (currentSprint) {
          setSelectedSprint(currentSprint.id);
          console.log('🟢 [DeveloperMetrics] Current sprint selected:', currentSprint.id, currentSprint.sprint_name);
        } else if (data.length > 0) {
          setSelectedSprint(data[0].id);
          console.log('🟢 [DeveloperMetrics] First sprint selected:', data[0].id, data[0].sprint_name);
        }
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error loading sprints:', error);
        setSprints([]);
      }
    };
    loadSprints();
  }, [selectedSquad]);

  // Load developers when a squad is selected
  useEffect(() => {
    if (!selectedSquad) {
      setDevelopers([]);
      setSelectedDeveloper(null);
      return;
    }

    const loadDevelopers = async () => {
      try {
        setError(null);
        console.log('🟢 [DeveloperMetrics] Loading developers for squad:', selectedSquad);
        const data = await getDevelopersForSquad(selectedSquad);
        console.log('🟢 [DeveloperMetrics] Developers loaded:', data);
        setDevelopers(data);
        if (data.length > 0 && !selectedDeveloper) {
          setSelectedDeveloper(data[0].id);
          console.log('🟢 [DeveloperMetrics] Developer selected:', data[0].id, data[0].display_name);
        } else if (data.length === 0) {
          setError('No developers found for this squad.');
        }
        setLoading(false);
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error loading developers:', error);
        setDevelopers([]);
        setError(`Error loading developers: ${error.message}`);
        setLoading(false);
      }
    };
    loadDevelopers();
  }, [selectedSquad]);

  // Load metrics when filters change
  useEffect(() => {
    if (!selectedDeveloper) {
      setMetricsData(null);
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoading(true);
        console.log('🟢 [DeveloperMetrics] Loading metrics for developer:', selectedDeveloper, 'squad:', selectedSquad, 'sprint:', selectedSprint);
        
        // Get developer info
        const devInfo = await getDeveloperById(selectedDeveloper);
        console.log('🟢 [DeveloperMetrics] Developer info:', devInfo);
        setDeveloperInfo(devInfo);

        // Get metrics
        const data = await getDeveloperMetricsData(
          selectedDeveloper,
          selectedSquad,
          selectedSprint
        );
        
        console.log('🟢 [DeveloperMetrics] Metrics loaded:', data);
        setMetricsData(data);
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error loading metrics:', error);
        setMetricsData(null);
        setError(`Error loading metrics: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedDeveloper, selectedSquad, selectedSprint]);

  // Obtener nombres para mostrar
  const selectedSquadName = squads.find(s => s.id === selectedSquad)?.squad_name || 'Global';
  const selectedSprintName = sprints.find(s => s.id === selectedSprint)?.sprint_name || '';
  const selectedSprintIsCurrent = sprints.find(s => s.id === selectedSprint)?.is_active || false;
  const selectedDeveloperName = developerInfo?.display_name || '';

  // Preparar datos para gráficos
  const statusChartData = React.useMemo(() => {
    if (!metricsData?.statusBreakdown) return [];
    
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
      '#6366f1', // Indigo
    ];
    
    return Object.entries(metricsData.statusBreakdown).map(([status, data], index) => ({
      name: status,
      value: data.count,
      percentage: data.percentage,
      color: colors[index % colors.length]
    }));
  }, [metricsData]);

  const spVsNoSPData = React.useMemo(() => {
    if (!metricsData) return [];
    
    return [
      { name: 'With SP', value: metricsData.metrics.withSP, color: '#3b82f6' },
      { name: 'No SP', value: metricsData.metrics.noSP, color: '#8b5cf6' }
    ];
  }, [metricsData]);

  // Calcular porcentajes para doughnut charts
  const devDoneRate = metricsData?.metrics.devDoneRate || 0;
  const spDevDoneRate = metricsData?.metrics.spDevDoneRate || 0;

  const devDoneChartData = [
    { name: 'Done', value: metricsData?.metrics.devDone || 0, color: '#10b981' },
    { name: 'Remaining', value: (metricsData?.metrics.totalTickets || 0) - (metricsData?.metrics.devDone || 0), color: '#1e293b' }
  ];

  const spDevDoneChartData = [
    { name: 'Done', value: metricsData?.metrics.devDoneSP || 0, color: '#10b981' },
    { name: 'Remaining', value: (metricsData?.metrics.totalSPAssigned || 0) - (metricsData?.metrics.devDoneSP || 0), color: '#1e293b' }
  ];

  console.log('🟡 [DeveloperMetrics] Estado actual:', {
    loading,
    hasMetricsData: !!metricsData,
    selectedSquad,
    selectedSprint,
    selectedDeveloper,
    squadsCount: squads.length,
    sprintsCount: sprints.length,
    developersCount: developers.length
  });

  // Mostrar loading inicial
  if (loading && squads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  // Mostrar error si hay uno
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-rose-500/50">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle size={24} />
            <div>
              <h3 className="text-lg font-semibold">Error loading metrics</h3>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Squad Selector */}
        <div className="relative group">
          <select
            className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[180px]"
            value={selectedSquad || ''}
            onChange={(e) => {
              setSelectedSquad(e.target.value || null);
              setSelectedSprint(null);
              setSelectedDeveloper(null);
            }}
          >
            <option value="">Global</option>
            {squads.map(squad => (
              <option key={squad.id} value={squad.id}>
                {squad.squad_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
        </div>

        {/* Sprint Selector */}
        <div className="relative group">
          <select
            className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[200px]"
            value={selectedSprint || ''}
            onChange={(e) => {
              setSelectedSprint(e.target.value || null);
            }}
            disabled={!selectedSquad || sprints.length === 0}
          >
            <option value="">All Sprints</option>
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.sprint_name} {sprint.is_active ? '(Current)' : ''}
              </option>
            ))}
          </select>
          {selectedSprintIsCurrent && (
            <Star className="absolute right-8 top-1/2 -translate-y-1/2 text-yellow-400 fill-yellow-400" size={14} />
          )}
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
        </div>

        {/* Developer Selector */}
        <div className="relative group">
          <select
            className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[200px]"
            value={selectedDeveloper || ''}
            onChange={(e) => {
              setSelectedDeveloper(e.target.value || null);
            }}
            disabled={!selectedSquad || developers.length === 0}
          >
            <option value="">Select Developer</option>
            {developers.map(dev => (
              <option key={dev.id} value={dev.id}>
                {dev.display_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Título dinámico */}
      {selectedDeveloper && (
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Metrics for {selectedSquadName}
            {selectedDeveloperName && ` - ${selectedDeveloperName}`}
          </h2>
        </div>
      )}

      {!selectedDeveloper ? (
        <div className="text-center text-slate-400 py-12">
          Please select a Squad and Developer to view metrics
        </div>
      ) : !metricsData || metricsData.metrics.totalTickets === 0 ? (
        <div className="text-center text-slate-400 py-12">
          No tickets found for the selected filters
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dev Done Rate */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Dev Done Rate</h3>
              <div className="relative h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devDoneChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {devDoneChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-3xl font-bold text-white">{devDoneRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Dev Done: {metricsData.metrics.devDone}/{metricsData.metrics.totalTickets}
                  </div>
                </div>
              </div>
            </div>

            {/* SP Dev Done */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">SP Dev Done</h3>
              <div className="relative h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spDevDoneChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {spDevDoneChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-3xl font-bold text-white">{spDevDoneRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Dev Done SP: {metricsData.metrics.devDoneSP}/{metricsData.metrics.totalSPAssigned}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Tickets:</span>
                  <span className="text-white font-semibold">{metricsData.metrics.totalTickets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">With SP:</span>
                  <span className="text-white font-semibold">{metricsData.metrics.withSP}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">No SP:</span>
                  <span className="text-white font-semibold">{metricsData.metrics.noSP}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-slate-400">Total SP:</span>
                  <span className="text-white font-semibold">{metricsData.metrics.totalSP}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tickets by Status */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Tickets by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ value, percentage }) => `${value}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 60}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value, entry) => (
                      <span style={{ color: '#e2e8f0', fontSize: '12px' }}>
                        {value}: {entry.payload.value} ({entry.payload.percentage}%)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tickets: SP vs No SP */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Tickets: SP vs No SP</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spVsNoSPData}>
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
                  <Bar dataKey="value" name="Tickets">
                    {spVsNoSPData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista de Tickets */}
          {metricsData?.tickets && metricsData.tickets.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">
                Tickets Trabajados en el Sprint ({metricsData.tickets.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Key</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Summary</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Story Points</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Squad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsData.tickets.map((ticket) => {
                      const isDevDone = ticket.status && (
                        ticket.status.toUpperCase() === 'DONE' ||
                        ticket.status.toUpperCase() === 'DEVELOPMENT DONE' ||
                        ticket.status.toUpperCase().includes('DEVELOPMENT DONE') ||
                        ticket.status.toUpperCase().includes('DEV DONE') ||
                        (ticket.status.toUpperCase().includes('DONE') && 
                         !ticket.status.toUpperCase().includes('TO DO') && 
                         !ticket.status.toUpperCase().includes('TODO')) ||
                        ticket.status.toUpperCase() === 'CLOSED' ||
                        ticket.status.toUpperCase() === 'RESOLVED' ||
                        ticket.status.toUpperCase() === 'COMPLETED'
                      );
                      
                      return (
                        <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-cyan-400 font-mono text-sm">{ticket.key}</td>
                          <td className="py-3 px-4 text-slate-300">{ticket.summary}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium ${
                              isDevDone 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                            }`}>
                              {isDevDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                              {ticket.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ticket.hasSP ? (
                              <span className="text-white font-semibold">{ticket.storyPoints}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm">{ticket.squad}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeveloperMetrics;




