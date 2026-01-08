import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { supabase } from '../utils/supabaseApi';

/**
 * Componente de filtros para Delivery KPIs
 * Permite filtrar por Squad, Sprint, Developer y Período
 */
const DeliveryKPIFilters = ({ filters, onFiltersChange }) => {
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load squads
      const { data: squadsData, error: squadsError } = await supabase
        .from('squads')
        .select('id, squad_key, squad_name')
        .order('squad_name', { ascending: true });

      if (!squadsError && squadsData) {
        setSquads(squadsData);
      }

      // Load sprints (only sprints with "Sprint" in the name)
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, sprint_name, start_date, end_date, complete_date, state, squad_id')
        .ilike('sprint_name', '%Sprint%')
        .order('end_date', { ascending: false })
        .limit(50);

      if (!sprintsError && sprintsData) {
        // Determinar sprint actual (active state o el más reciente que no ha terminado)
        const now = new Date();
        const sprintsWithCurrent = sprintsData.map(sprint => {
          // Un sprint está activo si:
          // 1. Tiene state === 'active', O
          // 2. No tiene end_date o end_date es en el futuro (y no está cerrado)
          const isActive = sprint.state === 'active' || 
            (sprint.state !== 'closed' && (!sprint.end_date || new Date(sprint.end_date) >= now));
          return { ...sprint, is_active: isActive };
        });
        setSprints(sprintsWithCurrent);
      }

      // Load developers
      const { data: developersData, error: devsError } = await supabase
        .from('developers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name', { ascending: true });

      if (!devsError && developersData) {
        setDevelopers(developersData);
      }
    } catch (error) {
      console.error('[DeliveryKPIFilters] Error loading filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value || null
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      squadId: null,
      sprintId: null,
      developerId: null,
      startDate: null,
      endDate: null
    });
  };

  const hasActiveFilters = filters.squadId || filters.sprintId || filters.developerId || filters.startDate || filters.endDate;

  // Filter sprints by selected squad if squad is selected
  // IMPORTANT: Only show sprints with "Sprint" in the name (exclude "Backlog" and other non-sprint values)
  // Limit to last 6 sprints (ordered by end_date descending)
  let availableSprints = (filters.squadId
    ? sprints.filter(s => s.squad_id === filters.squadId)
    : sprints).filter(s => s.sprint_name && s.sprint_name.includes('Sprint'));
  
  // Sort by end_date descending and limit to last 6 sprints
  availableSprints = availableSprints
    .sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date) : new Date(0);
      const dateB = b.end_date ? new Date(b.end_date) : new Date(0);
      return dateB - dateA; // Descendente
    })
    .slice(0, 6); // Solo últimos 6 sprints

  return (
    <div className="glass rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors text-sm"
          >
            <X size={16} />
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm">Loading filter options...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Squad Filter */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Squad</label>
            <select
              value={filters.squadId || ''}
              onChange={(e) => handleFilterChange('squadId', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All Squads</option>
              {squads.map(squad => (
                <option key={squad.id} value={squad.id}>
                  {squad.squad_name || squad.squad_key}
                </option>
              ))}
            </select>
          </div>

          {/* Sprint Filter */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Sprint</label>
            <select
              value={filters.sprintId || ''}
              onChange={(e) => handleFilterChange('sprintId', e.target.value)}
              disabled={!filters.squadId && sprints.length === 0}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Sprints</option>
              {availableSprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.is_active ? '⭐ ' : ''}{sprint.sprint_name}
                </option>
              ))}
            </select>
            {filters.squadId && availableSprints.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">No sprints found for selected squad</p>
            )}
          </div>

          {/* Developer Filter */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Developer</label>
            <select
              value={filters.developerId || ''}
              onChange={(e) => handleFilterChange('developerId', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">All Developers</option>
              {developers.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Period</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Start date"
                />
              </div>
              <span className="text-slate-400">to</span>
              <div className="flex-1">
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-400">Active filters:</span>
            {filters.squadId && (
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                Squad: {squads.find(s => s.id === filters.squadId)?.squad_name || filters.squadId}
              </span>
            )}
            {filters.sprintId && (
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                Sprint: {sprints.find(s => s.id === filters.sprintId)?.sprint_name || filters.sprintId}
              </span>
            )}
            {filters.developerId && (
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                Developer: {developers.find(d => d.id === filters.developerId)?.display_name || filters.developerId}
              </span>
            )}
            {(filters.startDate || filters.endDate) && (
              <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                Period: {filters.startDate || '...'} to {filters.endDate || '...'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryKPIFilters;

