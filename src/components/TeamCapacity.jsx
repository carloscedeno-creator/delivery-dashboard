import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, AlertCircle, Plus, Edit, Save, X, RefreshCw, CheckCircle2, Check } from 'lucide-react';
import { getCurrentUser } from '../utils/authService';
import {
  getCapacityForSquadSprint,
  getAllSquads,
  getAllSprints,
  upsertCapacity,
  recalculateSpDone,
  getDevelopersForSquad,
  getAllDevelopersForCapacity,
  batchUpsertDeveloperParticipations
} from '../services/teamCapacityService';

/**
 * Team Capacity Component
 * Allows PM, admin, and 3amigos to configure team capacity for sprints
 * Shows developers with checkboxes to indicate who participates in the sprint
 */
const TeamCapacity = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [capacityData, setCapacityData] = useState(null);
  const [developerParticipations, setDeveloperParticipations] = useState({}); // {developerId: isParticipating}
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [formData, setFormData] = useState({
    capacity_goal_sp: '',
    capacity_available_sp: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSquad && selectedSprint) {
      loadCapacityAndDevelopers();
    } else {
      setCapacityData(null);
      setDevelopers([]);
      setDeveloperParticipations({});
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
      setSprints(sprintsData);
    } catch (error) {
      console.error('[TeamCapacity] Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityAndDevelopers = async () => {
    try {
      setLoading(true);
      
      // Load all developers for the squad FIRST (always needed)
      const squadDevelopers = await getDevelopersForSquad(selectedSquad);
      console.log('[TeamCapacity] Loaded developers:', squadDevelopers.length);
      setDevelopers(squadDevelopers);
      
      // Load capacity data
      const capacity = await getCapacityForSquadSprint(selectedSquad, selectedSprint);
      setCapacityData(capacity);
      
      // Initialize participations map
      const participationMap = {};
      
      if (capacity) {
        setFormData({
          capacity_goal_sp: capacity.capacity_goal_sp || '',
          capacity_available_sp: capacity.capacity_available_sp || ''
        });
        setEditingCapacity(false);
        
        // Load developer participations from database
        const devParticipations = await getAllDevelopersForCapacity(capacity.id);
        devParticipations.forEach(dp => {
          participationMap[dp.developer_id] = dp.is_participating;
        });
      } else {
        setFormData({
          capacity_goal_sp: '',
          capacity_available_sp: ''
        });
      }
      
      // Initialize participations for all developers (default to false if not in database)
      squadDevelopers.forEach(dev => {
        if (!(dev.id in participationMap)) {
          participationMap[dev.id] = false; // Default to not participating
        }
      });
      setDeveloperParticipations(participationMap);
      
    } catch (error) {
      console.error('[TeamCapacity] Error loading capacity and developers:', error);
      setCapacityData(null);
      setDevelopers([]);
      setDeveloperParticipations({});
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeveloper = (developerId) => {
    setDeveloperParticipations(prev => ({
      ...prev,
      [developerId]: !prev[developerId]
    }));
  };

  const handleSave = async () => {
    if (!selectedSquad || !selectedSprint) {
      alert('Please select both Squad and Sprint');
      return;
    }

    try {
      setSaving(true);
      
      // First, save/update capacity
      const capacityResult = await upsertCapacity(
        {
          squad_id: selectedSquad,
          sprint_id: selectedSprint,
          capacity_goal_sp: parseFloat(formData.capacity_goal_sp) || 0,
          capacity_available_sp: parseFloat(formData.capacity_available_sp) || 0
        },
        currentUser?.id
      );

      if (!capacityResult) {
        alert('Error saving capacity data');
        return;
      }

      // Then, save developer participations
      const participations = developers.map(dev => ({
        developer_id: dev.id,
        is_participating: developerParticipations[dev.id] || false
      }));

      const participationSuccess = await batchUpsertDeveloperParticipations(
        capacityResult.id,
        participations
      );

      if (!participationSuccess) {
        console.warn('[TeamCapacity] Some developer participations may not have been saved');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setEditingCapacity(false);
      setHasChanges(false);
      
      // Reload data
      await loadCapacityAndDevelopers();
    } catch (error) {
      console.error('[TeamCapacity] Error saving:', error);
      alert('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedSquad || !selectedSprint) return;
    
    try {
      const spDone = await recalculateSpDone(selectedSquad, selectedSprint);
      if (spDone !== null) {
        alert(`SP Done recalculated: ${spDone.toFixed(2)}`);
        await loadCapacityAndDevelopers();
      }
    } catch (error) {
      console.error('[TeamCapacity] Error recalculating:', error);
      alert('Error recalculating SP Done: ' + error.message);
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
  
  const participatingCount = Object.values(developerParticipations).filter(Boolean).length;
  const completionPct = capacityData && capacityData.capacity_goal_sp > 0
    ? ((capacityData.sp_done || 0) / capacityData.capacity_goal_sp) * 100
    : 0;
  const utilizationPct = capacityData && capacityData.capacity_available_sp > 0
    ? ((capacityData.sp_done || 0) / capacityData.capacity_available_sp) * 100
    : 0;

  if (loading && !capacityData && !selectedSquad) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading capacity data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Team Capacity Configuration</h2>
            <p className="text-slate-400 text-sm">
              Configure capacity goals and team composition for squads by sprint. SP Done is automatically calculated.
            </p>
          </div>
        </div>

        {/* Squad and Sprint Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    {sprint.sprint_name} ({sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : 'N/A'} - {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'N/A'})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Info Alert */}
        <div className="glass rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="text-blue-400 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-blue-400 font-semibold text-sm mb-1">Capacity Configuration</p>
            <p className="text-slate-300 text-sm">
              <strong>Capacity Goal SP:</strong> Planned story points for the sprint (from planning)
              <br />
              <strong>Capacity Available SP:</strong> Actual available story points (considering time off, etc.)
              <br />
              <strong>SP Done:</strong> Automatically calculated from issues that reached "Done" or "Development Done" during the sprint
              <br />
              <strong>Team Composition:</strong> Check the developers who will participate in this sprint
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 glass rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={18} />
            <p className="text-emerald-400 text-sm">Capacity and team composition saved successfully!</p>
          </div>
        )}
      </div>

      {/* Capacity Configuration */}
      {selectedSquad && selectedSprint && (
        <>
          {/* Capacity Summary Card */}
          {capacityData && (
            <div className="glass rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
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
                <div className="flex gap-2">
                  {!editingCapacity ? (
                    <button
                      onClick={() => setEditingCapacity(true)}
                      className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit Capacity
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save All'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCapacity(false);
                          loadCapacityAndDevelopers();
                        }}
                        className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleRecalculate}
                    className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                    title="Recalculate SP Done"
                  >
                    <RefreshCw size={16} />
                    Recalculate SP Done
                  </button>
                </div>
              </div>

              {/* Capacity Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-400 mb-1">Goal SP</div>
                  {editingCapacity ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.capacity_goal_sp}
                      onChange={(e) => setFormData({ ...formData, capacity_goal_sp: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-lg font-semibold text-right"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">{capacityData.capacity_goal_sp.toFixed(1)}</div>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-400 mb-1">Available SP</div>
                  {editingCapacity ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.capacity_available_sp}
                      onChange={(e) => setFormData({ ...formData, capacity_available_sp: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-lg font-semibold text-right"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">{capacityData.capacity_available_sp.toFixed(1)}</div>
                  )}
                </div>
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-400 mb-1">SP Done</div>
                  <div className={`text-2xl font-bold ${
                    capacityData.sp_done > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {capacityData.sp_done.toFixed(1)}
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
            </div>
          )}

          {/* Developers Table - Always visible when squad and sprint are selected */}
          {selectedSquad && selectedSprint && (
            <div className="glass rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Team Composition</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {developers.length > 0 
                      ? `Select developers who will participate in this sprint (${participatingCount} selected)`
                      : 'No developers found for this squad'}
                  </p>
                </div>
                {!capacityData && developers.length > 0 && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.capacity_goal_sp || !formData.capacity_available_sp}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Create Capacity
                  </button>
                )}
              </div>

              {/* Capacity Input Fields - Show at top if no capacity data exists */}
              {!capacityData && developers.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-sm text-slate-400 mb-4">Set capacity goals to save team composition:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2 font-medium">Goal SP</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.capacity_goal_sp}
                        onChange={(e) => setFormData({ ...formData, capacity_goal_sp: e.target.value })}
                        placeholder="0.0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2 font-medium">Available SP</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.capacity_available_sp}
                        onChange={(e) => setFormData({ ...formData, capacity_available_sp: e.target.value })}
                        placeholder="0.0"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Developers Table - Always visible */}
              {loading && developers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading developers...</p>
                </div>
              ) : developers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-400 mb-2">No developers found for this squad</p>
                  <p className="text-slate-500 text-sm">Developers are identified by issues assigned to initiatives in this squad</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm w-12">
                            <input
                              type="checkbox"
                              checked={developers.length > 0 && developers.every(dev => developerParticipations[dev.id])}
                              onChange={(e) => {
                                const newState = e.target.checked;
                                const newParticipations = {};
                                developers.forEach(dev => {
                                  newParticipations[dev.id] = newState;
                                });
                                setDeveloperParticipations(newParticipations);
                                setHasChanges(true);
                              }}
                              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
                              title="Select/Deselect all developers"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Developer</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Email</th>
                          <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Participating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {developers.map(developer => {
                          const isParticipating = developerParticipations[developer.id] || false;
                          
                          return (
                            <tr key={developer.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={isParticipating}
                                  onChange={() => {
                                    handleToggleDeveloper(developer.id);
                                    if (!capacityData) {
                                      setHasChanges(true);
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 text-white font-medium">{developer.display_name}</td>
                              <td className="py-3 px-4 text-slate-400">{developer.email || 'N/A'}</td>
                              <td className="py-3 px-4 text-center">
                                {isParticipating ? (
                                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-500 text-xs font-medium">
                                    No
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Info message when no capacity data */}
                  {!capacityData && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-sm text-amber-400">
                        <strong>Note:</strong> Set Goal SP and Available SP above, then click "Create Capacity" to save the team composition.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {(!selectedSquad || !selectedSprint) && (
        <div className="glass rounded-2xl p-12 border border-slate-700/50 text-center">
          <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400 mb-2">Select Squad and Sprint to configure capacity</p>
          <p className="text-slate-500 text-sm">Choose a squad and sprint from the dropdowns above to begin</p>
        </div>
      )}
    </div>
  );
};

export default TeamCapacity;
