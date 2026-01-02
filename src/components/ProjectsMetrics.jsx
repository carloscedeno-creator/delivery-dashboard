import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, Star, Download } from 'lucide-react';
import { 
  getSquads, 
  getSprintsForSquad, 
  getProjectMetricsData,
  getSquadById,
  getSprintById
} from '../utils/projectMetricsApi';
import { generateProjectMetricsPDF, getIssuesForPDF, getSprintGoal } from '../utils/pdfGenerator';
import { supabase } from '../utils/supabaseApi';

const ProjectsMetrics = () => {
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [squadInfo, setSquadInfo] = useState(null);
  const [sprintInfo, setSprintInfo] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Refs para los gráficos
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Colores para los Board States (basados en la imagen)
  // Nota: Los estados ahora están normalizados a mayúsculas
  const statusColors = {
    'QA': '#fef3c7',           // Light yellow
    'QA EXTERNAL': '#fb923c',   // Orange
    'DEVELOPMENT DONE': '#86efac', // Light green
    'STAGING': '#4ade80',       // Medium green
    'READY TO RELEASE': '#16a34a', // Dark green
    'TO DO': '#3b82f6',        // Blue (cambiar de negro a azul para mejor visibilidad)
    'REOPEN': '#ef4444',        // Red
    'IN PROGRESS': '#60a5fa',   // Light blue (cambiar de gris para mejor visibilidad)
    'BLOCKED': '#f9a8d4',       // Pink
    'DONE': '#10b981',         // Green
    'SECURITY REVIEW': '#3b82f6', // Blue
    'TESTING': '#fbbf24',      // Yellow/Amber
    'COMPLIANCE CHECK': '#a78bfa', // Purple
    'IN REVIEW': '#8b5cf6',     // Purple variant
    'OPEN': '#06b6d4',         // Cyan
    'HOLD': '#f59e0b',         // Amber
    'REQUISITIONS': '#ec4899',  // Pink variant
    'Unknown': '#6b7280'        // Gray
  };

  // Cargar squads al montar
  useEffect(() => {
    loadSquads();
  }, []);

  // Cargar sprints cuando se selecciona un squad
  useEffect(() => {
    if (selectedSquad) {
      loadSprints(selectedSquad);
      loadSquadInfo(selectedSquad);
    } else {
      setSprints([]);
      setSelectedSprint(null);
    }
  }, [selectedSquad]);

  // Cargar métricas cuando cambian los filtros
  useEffect(() => {
    if (selectedSquad) {
      loadMetrics();
      if (selectedSprint) {
        loadSprintInfo(selectedSprint);
      }
    }
  }, [selectedSquad, selectedSprint]);

  const loadSquads = async () => {
    try {
      const data = await getSquads();
      setSquads(data || []);
      if (data && data.length > 0) {
        setSelectedSquad(data[0].id);
      }
    } catch (error) {
      console.error('[ProjectsMetrics] Error cargando squads:', error);
    }
  };

  const loadSprints = async (squadId) => {
    try {
      const data = await getSprintsForSquad(squadId);
      setSprints(data || []);
      // Seleccionar sprint actual o el primero
      const currentSprint = data?.find(s => s.is_active) || data?.[0];
      if (currentSprint) {
        setSelectedSprint(currentSprint.id);
      }
    } catch (error) {
      console.error('[ProjectsMetrics] Error cargando sprints:', error);
    }
  };

  const loadSquadInfo = async (squadId) => {
    try {
      const data = await getSquadById(squadId);
      setSquadInfo(data);
    } catch (error) {
      console.error('[ProjectsMetrics] Error cargando info del squad:', error);
    }
  };

  const loadSprintInfo = async (sprintId) => {
    try {
      const data = await getSprintById(sprintId);
      setSprintInfo(data);
    } catch (error) {
      console.error('[ProjectsMetrics] Error cargando info del sprint:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await getProjectMetricsData(selectedSquad, selectedSprint);
      setMetricsData(data);
    } catch (error) {
      console.error('[ProjectsMetrics] Error cargando métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para los gráficos con colores
  const chartData = useMemo(() => {
    if (!metricsData || !metricsData.statusData) return [];

    console.log('[ProjectsMetrics] 📊 Datos recibidos:', metricsData.statusData);
    console.log('[ProjectsMetrics] 🎨 Colores disponibles:', Object.keys(statusColors));

    const data = metricsData.statusData.map(status => {
      // Normalizar el nombre del estado
      const normalizedName = status.name.toUpperCase().trim();
      
      // Intentar encontrar el color con diferentes variaciones
      let color = statusColors[normalizedName] || 
                  statusColors[status.name] || 
                  statusColors[normalizedName.replace(/\s+/g, ' ')] ||
                  statusColors['Unknown'] || 
                  '#6b7280';
      
      // Debug detallado
      console.log(`[ProjectsMetrics] 🔍 Estado: "${status.name}" -> Normalizado: "${normalizedName}" -> Color encontrado: ${color}`);
      console.log(`[ProjectsMetrics]    - statusColors["${normalizedName}"]:`, statusColors[normalizedName]);
      console.log(`[ProjectsMetrics]    - statusColors["${status.name}"]:`, statusColors[status.name]);
      
      const result = {
        name: status.name,
        value: status.value,
        percentage: status.percentage,
        color: color
      };
      
      console.log(`[ProjectsMetrics] ✅ Resultado final:`, result);
      
      return result;
    });
    
    console.log('[ProjectsMetrics] 📈 chartData final:', data);
    
    return data;
  }, [metricsData]);

  // Título dinámico
  const title = useMemo(() => {
    if (!squadInfo) return 'Dev Team Metrics';
    if (sprintInfo) {
      return `Dev Team Metrics - ${squadInfo.squad_name} - ${sprintInfo.sprint_name}`;
    }
    return `Dev Team Metrics - ${squadInfo.squad_name}`;
  }, [squadInfo, sprintInfo]);

  // Función para descargar el PDF
  const handleDownloadPDF = async () => {
    if (!selectedSquad || !selectedSprint || !metricsData) {
      return;
    }

    try {
      setGeneratingPDF(true);

      // Obtener datos adicionales para el PDF
      const [issues, sprintGoal] = await Promise.all([
        getIssuesForPDF(selectedSquad, selectedSprint, supabase),
        getSprintGoal(selectedSprint, supabase)
      ]);

      console.log(`[ProjectsMetrics] Issues para PDF: ${issues?.length || 0}`);

      // Obtener referencias a los elementos de los gráficos
      // Buscar los contenedores de los gráficos específicamente
      const pieChartContainer = pieChartRef.current?.querySelector('.recharts-wrapper');
      const barChartContainer = barChartRef.current?.querySelector('.recharts-wrapper');

      const chartElements = [];
      if (pieChartContainer) chartElements.push(pieChartContainer);
      if (barChartContainer) chartElements.push(barChartContainer);

      // Generar el PDF
      await generateProjectMetricsPDF({
        squadName: squadInfo?.squad_name || 'Unknown Squad',
        sprintName: sprintInfo?.sprint_name || 'Unknown Sprint',
        sprintGoal: sprintGoal,
        chartElements: chartElements,
        issues: issues,
        metricsData: metricsData,
        squadId: selectedSquad,
        sprintId: selectedSprint
      });
    } catch (error) {
      console.error('[ProjectsMetrics] Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading && !metricsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {title}
          </h1>
          <p className="text-slate-400 mt-2">Project metrics by squad and sprint</p>
        </div>
        {selectedSquad && selectedSprint && metricsData && metricsData.totalTickets > 0 && (
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            {generatingPDF ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="glass rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Squad Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Squad
            </label>
            <div className="relative">
              <select
                value={selectedSquad || ''}
                onChange={(e) => setSelectedSquad(e.target.value ? String(e.target.value) : null)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select Squad</option>
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.squad_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
          </div>

          {/* Sprint Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sprint
            </label>
            <div className="relative">
              <select
                value={selectedSprint || ''}
                onChange={(e) => setSelectedSprint(e.target.value ? String(e.target.value) : null)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={!selectedSquad || sprints.length === 0}
              >
                <option value="">Select Sprint</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.sprint_name} {sprint.is_active && '⭐ Current'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {metricsData && metricsData.totalTickets > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Board State Distribution */}
          <div className="glass rounded-2xl p-6" ref={pieChartRef}>
            <h3 className="text-xl font-semibold text-white mb-6">Board State Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={120}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => {
                    // Obtener color con múltiples intentos
                    const normalizedName = entry.name.toUpperCase().trim();
                    const fillColor = entry.color || 
                                     statusColors[normalizedName] || 
                                     statusColors[entry.name] || 
                                     statusColors['Unknown'] || 
                                     '#6b7280';
                    
                    console.log(`[ProjectsMetrics] 🎨 Pie Cell ${index}: "${entry.name}" (normalized: "${normalizedName}") -> fill: ${fillColor}, entry.color: ${entry.color}`);
                    
                    return (
                      <Cell 
                        key={`pie-cell-${index}-${entry.name}`} 
                        fill={fillColor}
                        stroke={fillColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value, name, props) => [
                    `${value} (${props.payload.percentage.toFixed(1)}%)`,
                    'Count'
                  ]}
                />
                <Legend 
                  formatter={(value, entry) => `${value}: ${entry.payload.value} (${entry.payload.percentage.toFixed(1)}%)`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Board State Counts */}
          <div className="glass rounded-2xl p-6" ref={barChartRef}>
            <h3 className="text-xl font-semibold text-white mb-6">Board State Counts</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#9ca3af"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value} tickets`, 'Count']}
                />
                <Legend />
                <Bar dataKey="value" name="Tickets" isAnimationActive={true}>
                  {chartData.map((entry, index) => {
                    // Obtener color con múltiples intentos
                    const normalizedName = entry.name.toUpperCase().trim();
                    const fillColor = entry.color || 
                                     statusColors[normalizedName] || 
                                     statusColors[entry.name] || 
                                     statusColors['Unknown'] || 
                                     '#6b7280';
                    
                    console.log(`[ProjectsMetrics] 🎨 Bar Cell ${index}: "${entry.name}" (normalized: "${normalizedName}") -> fill: ${fillColor}, entry.color: ${entry.color}`);
                    
                    return (
                      <Cell 
                        key={`bar-cell-${index}-${entry.name}`} 
                        fill={fillColor}
                        stroke={fillColor}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-lg">
            {!selectedSquad 
              ? 'Please select a squad to view metrics'
              : metricsData?.totalTickets === 0
              ? 'No tickets found for the selected squad and sprint'
              : 'Loading metrics...'}
          </p>
        </div>
      )}

      {/* Resumen de métricas */}
      {metricsData && metricsData.totalTickets > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{metricsData.totalTickets}</div>
              <div className="text-sm text-slate-400">Total Tickets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{metricsData.totalSP}</div>
              <div className="text-sm text-slate-400">Total Story Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {metricsData.completedSP || 0}
              </div>
              <div className="text-sm text-slate-400">Completed Story Points</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Épicas/Iniciativas */}
      {metricsData && metricsData.epicMetrics && metricsData.epicMetrics.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Initiatives Progress</h3>
          
          {/* Leyenda de colores */}
          <div className="mb-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-500"></div>
              <span className="text-slate-300">Total Work (Tickets)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-slate-300">Completed Before Sprint</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-slate-300">Completed in Sprint</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-700"></div>
              <span className="text-slate-300">Remaining in Sprint</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Initiative</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">Total Tickets</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">Lifetime Completion</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">Sprint Completion</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {metricsData.epicMetrics.map((epic, index) => {
                  // Calcular porcentajes para la barra
                  const totalTickets = epic.totalTickets;
                  const completedLifetime = epic.completedTicketsLifetime;
                  const completedInSprint = epic.completedTicketsInSprint;
                  const remainingInSprint = epic.remainingTicketsInSprint;
                  
                  // Porcentajes basados en total de tickets
                  const lifetimePercent = totalTickets > 0 ? (completedLifetime / totalTickets) * 100 : 0;
                  const sprintCompletedPercent = totalTickets > 0 ? (completedInSprint / totalTickets) * 100 : 0;
                  const remainingPercent = totalTickets > 0 ? (remainingInSprint / totalTickets) * 100 : 0;
                  
                  // Calcular la posición del naranja (completados durante sprint)
                  // El azul muestra todos los completados lifetime
                  // El naranja muestra solo los completados durante el sprint (dentro del azul, pero destacado)
                  // El gris oscuro muestra los remaining en el sprint
                  const completedBeforeSprint = completedLifetime - completedInSprint;
                  const completedBeforeSprintPercent = totalTickets > 0 ? (completedBeforeSprint / totalTickets) * 100 : 0;
                  
                  return (
                    <tr key={epic.epicId || `no-initiative-${index}`} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-4 px-4 text-white font-medium">{epic.epicName}</td>
                      <td className="py-4 px-4 text-center text-slate-300">{totalTickets}</td>
                      <td className="py-4 px-4 text-center text-slate-300">
                        {epic.lifetimeCompletionPercentage.toFixed(1)}%
                        <div className="text-xs text-slate-500 mt-1">
                          {completedLifetime}/{totalTickets} tickets
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-300">
                        {epic.sprintCompletionPercentage.toFixed(1)}%
                        <div className="text-xs text-slate-500 mt-1">
                          {completedInSprint} tickets
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="relative w-full h-8 bg-slate-500 rounded overflow-hidden">
                          {/* Base gris: Total de trabajo (100%) - ya está como fondo */}
                          
                          {/* Azul: Completados antes del sprint (lifetime menos los del sprint) */}
                          {completedBeforeSprintPercent > 0 && (
                            <div 
                              className="absolute left-0 top-0 h-full bg-blue-500"
                              style={{ width: `${completedBeforeSprintPercent}%` }}
                            ></div>
                          )}
                          
                          {/* Naranja: Completados durante el sprint (después del azul, en sección) */}
                          {sprintCompletedPercent > 0 && (
                            <div 
                              className="absolute top-0 h-full bg-orange-500"
                              style={{ 
                                left: `${completedBeforeSprintPercent}%`,
                                width: `${sprintCompletedPercent}%` 
                              }}
                            ></div>
                          )}
                          
                          {/* Gris oscuro: Remaining en el sprint (después del naranja) */}
                          {remainingPercent > 0 && (
                            <div 
                              className="absolute top-0 h-full bg-slate-700"
                              style={{ 
                                left: `${completedBeforeSprintPercent + sprintCompletedPercent}%`,
                                width: `${remainingPercent}%` 
                              }}
                            ></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsMetrics;

