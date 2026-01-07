import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, AlertCircle, Eye, CheckCircle2 } from 'lucide-react';
import {
  getCapacityForSquadSprint,
  getAllSquads,
  getAllSprints,
  getAllDevelopers,
  getAllDevelopersForCapacity
} from '../services/teamCapacityService';

/**
 * Team Allocation Component (Read-Only Report)
 * Shows team capacity and composition by squad and sprint
 * Visible to admin, 3amigos, and pm roles
 */
const TeamAllocation = () => {
  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [capacityData, setCapacityData] = useState(null);
  const [developerParticipations, setDeveloperParticipations] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSquad && selectedSprint) {
      loadCapacityAndDevelopers();
    } else {
      setCapacityData(null);
      setDevelopers([]);
      setDeveloperParticipations([]);
    }
  }, [selectedSquad, selectedSprint]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [squadsData, sprintsData] = await Promise.all([
        getAllSquads(),
        getAllSprints()
      ]);
      setSquads(squadsData);
      // IMPORTANT: Filter to only include sprints with "Sprint" in the name (already filtered in API, but double-check)
      const validSprints = (sprintsData || []).filter(s => s.sprint_name && s.sprint_name.includes('Sprint'));
      setSprints(validSprints);
    } catch (error) {
      console.error('[TeamAllocation] Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityAndDevelopers = async () => {
    try {
      setLoading(true);
      
      // Load capacity data
      const capacity = await getCapacityForSquadSprint(selectedSquad, selectedSprint);
      setCapacityData(capacity);
      
      if (capacity) {
        // Load developer participations
        const devParticipations = await getAllDevelopersForCapacity(capacity.id);
        setDeveloperParticipations(devParticipations);
      } else {
        setDeveloperParticipations([]);
      }
      
      // Load all developers (multisquad support)
      const allDevelopers = await getAllDevelopers();
      setDevelopers(allDevelopers);
      
    } catch (error) {
      console.error('[TeamAllocation] Error loading capacity and developers:', error);
      setCapacityData(null);
      setDevelopers([]);
      setDeveloperParticipations([]);
    } finally {
      setLoading(false);
    }
  };

  const getSprintName = (sprintId) => {
    const sprint = sprints.find(s => s.id === sprintId);
    return sprint?.sprint_name || 'Unknown Sprint';
  };

  const getSquadName = (squadId) => {
    const squad = squads.find(s => s.id === squadId);
    return squad?.squad_name || 'Unknown Squad';
  };

  const selectedSprintData = sprints.find(s => s.id === selectedSprint);
  const selectedSquadData = squads.find(s => s.id === selectedSquad);
  
  const participatingDevelopers = developers.filter(dev => {
    const participation = developerParticipations.find(dp => dp.developer_id === dev.id);
    return participation?.is_participating || false;
  });
  
  const completionPct = capacityData && capacityData.capacity_goal_sp > 0
    ? ((capacityData.sp_done || 0) / capacityData.capacity_goal_sp) * 100
    : 0;
  const utilizationPct = capacityData && capacityData.capacity_available_sp > 0
    ? ((capacityData.sp_done || 0) / capacityData.capacity_available_sp) * 100
    : 0;

  if (loading && !capacityData && !selectedSquad) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading allocation data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Team Allocation Report</h2>
            <p className="text-slate-400 text-sm">
              View team capacity and composition by squad and sprint (Read-only)
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <Eye className="text-blue-400" size={18} />
            <span className="text-blue-400 text-sm font-medium">Read-Only</span>
          </div>
        </div>

        {/* Squad and Sprint Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Squad
            </label>
            <select
              value={selectedSquad || ''}
              onChange={(e) => setSelectedSquad(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select Squad</option>
              {squads.map(squad => (
                <option key={squad.id} value={squad.id}>
                  {squad.squad_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Sprint
            </label>
            <select
              value={selectedSprint || ''}
              onChange={(e) => setSelectedSprint(e.target.value)}
              disabled={!selectedSquad}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Sprint</option>
              {sprints
                .filter(sprint => !selectedSquad || sprint.squad_id === selectedSquad)
                .map(sprint => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.is_active ? '⭐ ' : ''}{sprint.sprint_name} ({sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : 'N/A'} - {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'N/A'})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Capacity Summary */}
      {selectedSquad && selectedSprint && capacityData && (
        <>
          <div className="glass rounded-2xl p-6 border border-slate-700/50">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">
                Capacity: {selectedSquadData?.squad_name} - {selectedSprintData?.sprint_name}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {selectedSprintData?.start_date && selectedSprintData?.end_date && (
                  <>
                    {new Date(selectedSprintData.start_date).toLocaleDateString()} - {new Date(selectedSprintData.end_date).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>

            {/* Capacity Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Goal SP</div>
                <div className="text-2xl font-bold text-white">{(capacityData.capacity_goal_sp || 0).toFixed(1)}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Available SP</div>
                <div className="text-2xl font-bold text-white">{(capacityData.capacity_available_sp || 0).toFixed(1)}</div>
              </div>
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">SP Done</div>
                <div className={`text-2xl font-bold ${
                  (capacityData.sp_done || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {(capacityData.sp_done || 0).toFixed(1)}
                </div>
              </div>
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Completion %</div>
                <div className={`text-2xl font-bold ${
                  completionPct >= 100 ? 'text-emerald-400' :
                  completionPct >= 80 ? 'text-blue-400' :
                  completionPct >= 50 ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {completionPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Utilization %</div>
                <div className={`text-xl font-bold ${
                  utilizationPct >= 100 ? 'text-rose-400' :
                  utilizationPct >= 90 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {utilizationPct.toFixed(1)}%
                </div>
              </div>
              <div className="glass rounded-lg p-4 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Team Size</div>
                <div className="text-xl font-bold text-white">
                  {participatingDevelopers.length} / {developers.length} developers
                </div>
              </div>
            </div>
          </div>

          {/* Team Composition Table */}
          {developers.length > 0 && (
            <div className="glass rounded-2xl p-6 border border-slate-700/50">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">Team Composition</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {participatingDevelopers.length} developer{participatingDevelopers.length !== 1 ? 's' : ''} participating in this sprint
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Developer</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Email</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Participating</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-semibold text-sm">Allocation SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {developers.map(developer => {
                      const participation = developerParticipations.find(dp => dp.developer_id === developer.id);
                      const isParticipating = participation?.is_participating || false;
                      const allocationSP = participation?.capacity_allocation_sp || null;
                      
                      return (
                        <tr key={developer.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-white font-medium">{developer.display_name}</td>
                          <td className="py-3 px-4 text-slate-400">{developer.email || 'N/A'}</td>
                          <td className="py-3 px-4 text-center">
                            {isParticipating ? (
                              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center justify-center gap-1">
                                <CheckCircle2 size={14} />
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-slate-700 text-slate-500 text-xs font-medium">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {allocationSP !== null ? `${allocationSP.toFixed(1)} SP` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {capacityData && developers.length === 0 && (
            <div className="glass rounded-2xl p-12 border border-slate-700/50 text-center">
              <Users className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-400 mb-2">No developers found for this squad</p>
              <p className="text-slate-500 text-sm">Developers are identified by issues assigned to initiatives in this squad</p>
            </div>
          )}

          {!capacityData && selectedSquad && selectedSprint && (
            <div className="glass rounded-2xl p-12 border border-slate-700/50 text-center">
              <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-400 mb-2">No capacity data configured for this sprint</p>
              <p className="text-slate-500 text-sm">Capacity must be configured in Team Capacity before it appears here</p>
            </div>
          )}
        </>
      )}

      {(!selectedSquad || !selectedSprint) && (
        <div className="glass rounded-2xl p-12 border border-slate-700/50 text-center">
          <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400 mb-2">Select Squad and Sprint to view allocation</p>
          <p className="text-slate-500 text-sm">Choose a squad and sprint from the dropdowns above to begin</p>
        </div>
      )}
    </div>
  );
};

export default TeamAllocation;

