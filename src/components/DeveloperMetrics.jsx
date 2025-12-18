import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, Star } from 'lucide-react';
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

  // Cargar squads al inicio
  useEffect(() => {
    const loadSquads = async () => {
      try {
        console.log('🟢 [DeveloperMetrics] Cargando squads...');
        const data = await getSquads();
        console.log('🟢 [DeveloperMetrics] Squads cargados:', data);
        setSquads(data);
        if (data.length > 0) {
          setSelectedSquad(data[0].id);
          console.log('🟢 [DeveloperMetrics] Squad seleccionado:', data[0].id, data[0].squad_name);
        }
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error cargando squads:', error);
        setLoading(false);
      }
    };
    loadSquads();
  }, []);

  // Cargar sprints cuando se selecciona un squad
  useEffect(() => {
    if (!selectedSquad) {
      setSprints([]);
      setSelectedSprint(null);
      return;
    }

    const loadSprints = async () => {
      try {
        console.log('🟢 [DeveloperMetrics] Cargando sprints para squad:', selectedSquad);
        const data = await getSprintsForSquad(selectedSquad);
        console.log('🟢 [DeveloperMetrics] Sprints cargados:', data);
        setSprints(data);
        // Seleccionar sprint actual si existe
        const currentSprint = data.find(s => s.is_active);
        if (currentSprint) {
          setSelectedSprint(currentSprint.id);
          console.log('🟢 [DeveloperMetrics] Sprint actual seleccionado:', currentSprint.id, currentSprint.sprint_name);
        } else if (data.length > 0) {
          setSelectedSprint(data[0].id);
          console.log('🟢 [DeveloperMetrics] Primer sprint seleccionado:', data[0].id, data[0].sprint_name);
        }
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error cargando sprints:', error);
        setSprints([]);
      }
    };
    loadSprints();
  }, [selectedSquad]);

  // Cargar developers cuando se selecciona un squad
  useEffect(() => {
    if (!selectedSquad) {
      setDevelopers([]);
      setSelectedDeveloper(null);
      return;
    }

    const loadDevelopers = async () => {
      try {
        console.log('🟢 [DeveloperMetrics] Cargando developers para squad:', selectedSquad);
        const data = await getDevelopersForSquad(selectedSquad);
        console.log('🟢 [DeveloperMetrics] Developers cargados:', data);
        setDevelopers(data);
        if (data.length > 0 && !selectedDeveloper) {
          setSelectedDeveloper(data[0].id);
          console.log('🟢 [DeveloperMetrics] Developer seleccionado:', data[0].id, data[0].display_name);
        }
        setLoading(false);
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error cargando developers:', error);
        setDevelopers([]);
        setLoading(false);
      }
    };
    loadDevelopers();
  }, [selectedSquad]);

  // Cargar métricas cuando cambian los filtros
  useEffect(() => {
    if (!selectedDeveloper) {
      setMetricsData(null);
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoading(true);
        console.log('🟢 [DeveloperMetrics] Cargando métricas para developer:', selectedDeveloper, 'squad:', selectedSquad, 'sprint:', selectedSprint);
        
        // Obtener info del developer
        const devInfo = await getDeveloperById(selectedDeveloper);
        console.log('🟢 [DeveloperMetrics] Developer info:', devInfo);
        setDeveloperInfo(devInfo);

        // Obtener métricas
        const data = await getDeveloperMetricsData(
          selectedDeveloper,
          selectedSquad,
          selectedSprint
        );
        
        console.log('🟢 [DeveloperMetrics] Métricas cargadas:', data);
        setMetricsData(data);
      } catch (error) {
        console.error('🔴 [DeveloperMetrics] Error cargando métricas:', error);
        setMetricsData(null);
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
    
    return Object.entries(metricsData.statusBreakdown).map(([status, data]) => ({
      name: status,
      value: data.count,
      percentage: data.percentage
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
              setSelectedSquad(e.target.value ? parseInt(e.target.value) : null);
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
              setSelectedSprint(e.target.value ? parseInt(e.target.value) : null);
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
              setSelectedDeveloper(e.target.value ? parseInt(e.target.value) : null);
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
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
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
        </>
      )}
    </div>
  );
};

export default DeveloperMetrics;

