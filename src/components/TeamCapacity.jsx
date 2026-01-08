import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, AlertCircle, Plus, Edit, Save, X, RefreshCw, CheckCircle2, Check } from 'lucide-react';
import { getCurrentUser } from '../utils/authService';
import {
  getCapacityForSquadSprint,
  getAllSquads,
  getAllSprints,
  upsertCapacity,
  recalculateSpDone,
  getAllDevelopers,
  getAllDevelopersForCapacity,
  batchUpsertDeveloperParticipations,
  getLastCapacityAllocations,
  getLastSquadAssignments
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
  const [developerParticipations, setDeveloperParticipations] = useState({}); // {developerId: {isParticipating: boolean, capacity_sp: number}}
  const [lastSquadAssignments, setLastSquadAssignments] = useState({}); // {developerId: squad_name}
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [formData, setFormData] = useState({
    capacity_goal_sp: '',
    capacity_available_sp: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      setLastSquadAssignments({});
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
      console.error('[TeamCapacity] Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityAndDevelopers = async () => {
    try {
      setLoading(true);
      
      // Load ALL developers (for multisquad support)
      const allDevelopers = await getAllDevelopers();
      console.log('[TeamCapacity] Loaded all developers:', allDevelopers.length);
      setDevelopers(allDevelopers);
      
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
          participationMap[dp.developer_id] = {
            isParticipating: dp.is_participating || false,
            capacity_sp: dp.capacity_allocation_sp || 0
          };
        });
        
        // Load last squad assignments for display (even if capacity exists)
        const developerIds = allDevelopers.map(d => d.id);
        const lastSquads = await getLastSquadAssignments(developerIds, selectedSprint);
        setLastSquadAssignments(lastSquads);
      } else {
        setFormData({
          capacity_goal_sp: '',
          capacity_available_sp: ''
        });
        
        // Load last capacity allocations and squad assignments from previous sprints
        const developerIds = allDevelopers.map(d => d.id);
        const [lastCapacities, lastSquads] = await Promise.all([
          getLastCapacityAllocations(developerIds, selectedSprint),
          getLastSquadAssignments(developerIds, selectedSprint)
        ]);
        console.log('[TeamCapacity] Loaded last capacity allocations:', lastCapacities);
        console.log('[TeamCapacity] Loaded last squad assignments:', lastSquads);
        
        // Store last squad assignments
        setLastSquadAssignments(lastSquads);
        
        // Initialize with last capacity allocations
        allDevelopers.forEach(dev => {
          participationMap[dev.id] = {
            isParticipating: false,
            capacity_sp: lastCapacities[dev.id] || 0 // Use last capacity or 0 if first time
          };
        });
      }
      
      // Load last squad assignments even if capacity exists (for display)
      if (capacity) {
        const developerIds = allDevelopers.map(d => d.id);
        const lastSquads = await getLastSquadAssignments(developerIds, selectedSprint);
        setLastSquadAssignments(lastSquads);
      }
      
      // Initialize participations for developers not yet in the map
      allDevelopers.forEach(dev => {
        if (!(dev.id in participationMap)) {
          participationMap[dev.id] = {
            isParticipating: false,
            capacity_sp: 0
          };
        }
      });
      setDeveloperParticipations(participationMap);
      setHasChanges(false);
      
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
      [developerId]: {
        ...prev[developerId],
        isParticipating: !prev[developerId]?.isParticipating
      }
    }));
    setHasChanges(true);
    setTimeout(() => recalculateTotalCapacity(), 0);
  };

  const handleCapacityChange = (developerId, capacitySp) => {
    setDeveloperParticipations(prev => ({
      ...prev,
      [developerId]: {
        ...prev[developerId],
        capacity_sp: parseFloat(capacitySp) || 0
      }
    }));
    setHasChanges(true);
    setTimeout(() => recalculateTotalCapacity(), 0);
  };

  const recalculateTotalCapacity = () => {
    const totalCapacity = Object.values(developerParticipations)
      .filter(p => p?.isParticipating)
      .reduce((sum, p) => sum + (parseFloat(p.capacity_sp) || 0), 0);
    
    // Update form data with calculated total (only if no capacity data exists or editing)
    if (!capacityData || editingCapacity) {
      setFormData(prev => ({
        ...prev,
        capacity_goal_sp: totalCapacity > 0 ? totalCapacity.toFixed(1) : prev.capacity_goal_sp,
        capacity_available_sp: totalCapacity > 0 ? totalCapacity.toFixed(1) : prev.capacity_available_sp
      }));
    }
  };

  const handleSave = async () => {
    if (!selectedSquad || !selectedSprint) {
      alert('Please select both Squad and Sprint');
      return;
    }

    try {
      setSaving(true);
      
      // Calculate total capacity from individual developer capacities
      const calculatedTotal = Object.values(developerParticipations)
        .filter(p => p?.isParticipating)
        .reduce((sum, p) => sum + (parseFloat(p.capacity_sp) || 0), 0);
      
      // Use calculated total or form data (whichever is higher, or form data if manually set)
      const finalGoalSP = calculatedTotal > 0 ? calculatedTotal : (parseFloat(formData.capacity_goal_sp) || 0);
      const finalAvailableSP = calculatedTotal > 0 ? calculatedTotal : (parseFloat(formData.capacity_available_sp) || 0);
      
      // First, save/update capacity with calculated values
      const capacityResult = await upsertCapacity(
        {
          squad_id: selectedSquad,
          sprint_id: selectedSprint,
          capacity_goal_sp: finalGoalSP,
          capacity_available_sp: finalAvailableSP
        },
        currentUser?.id
      );

      if (!capacityResult) {
        alert('Error saving capacity data');
        return;
      }

      // Then, save developer participations with individual capacities
      const participations = developers.map(dev => {
        const participation = developerParticipations[dev.id] || { isParticipating: false, capacity_sp: 0 };
        return {
          developer_id: dev.id,
          is_participating: participation.isParticipating || false,
          capacity_allocation_sp: participation.capacity_sp || 0
        };
      });

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
  
  const participatingCount = Object.values(developerParticipations).filter(p => p?.isParticipating).length;
  const totalCalculatedCapacity = Object.values(developerParticipations)
    .filter(p => p?.isParticipating)
    .reduce((sum, p) => sum + (parseFloat(p.capacity_sp) || 0), 0);
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
                    <div className="text-2xl font-bold text-white">{(capacityData.capacity_goal_sp || 0).toFixed(1)}</div>
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
                    <div className="text-2xl font-bold text-white">{(capacityData.capacity_available_sp || 0).toFixed(1)}</div>
                  )}
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
                      ? `Select developers and assign individual capacity (${participatingCount} selected, Total: ${totalCalculatedCapacity.toFixed(1)} SP)`
                      : 'No developers found'}
                  </p>
                </div>
                {!capacityData && developers.length > 0 && (
                  <button
                    onClick={handleSave}
                    disabled={saving || participatingCount === 0 || totalCalculatedCapacity === 0}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Create Capacity
                  </button>
                )}
                {capacityData && hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>

              {/* Calculated Total Capacity Display */}
              {participatingCount > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-400 font-semibold mb-1">Calculated Total Capacity</p>
                      <p className="text-xs text-slate-400">Sum of individual developer capacities</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">{totalCalculatedCapacity.toFixed(1)} SP</div>
                      <div className="text-xs text-slate-400">{participatingCount} developer{participatingCount !== 1 ? 's' : ''}</div>
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
                  <p className="text-slate-400 mb-2">No developers found</p>
                  <p className="text-slate-500 text-sm">Ensure developers are marked as active in the database</p>
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
                          checked={developers.length > 0 && developers.every(dev => developerParticipations[dev.id]?.isParticipating)}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            const newParticipations = {};
                            developers.forEach(dev => {
                              newParticipations[dev.id] = {
                                isParticipating: newState,
                                capacity_sp: developerParticipations[dev.id]?.capacity_sp || 0
                              };
                            });
                            setDeveloperParticipations(newParticipations);
                            setHasChanges(true);
                            setTimeout(() => recalculateTotalCapacity(), 0);
                          }}
                          className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
                          title="Select/Deselect all developers"
                        />
                          </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Developer</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm">Last Project Assigned</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-semibold text-sm">Participating</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-semibold text-sm">Capacity SP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {developers.map(developer => {
                          const participation = developerParticipations[developer.id] || { isParticipating: false, capacity_sp: 0 };
                          const isParticipating = participation.isParticipating;
                          const capacitySp = participation.capacity_sp || 0;
                          
                          return (
                            <tr key={developer.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={isParticipating}
                                  onChange={() => handleToggleDeveloper(developer.id)}
                                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 text-white font-medium">{developer.display_name}</td>
                              <td className="py-3 px-4 text-slate-400">
                                {lastSquadAssignments[developer.id] || '-'}
                              </td>
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
                              <td className="py-3 px-4 text-right">
                                {isParticipating ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={capacitySp}
                                    onChange={(e) => handleCapacityChange(developer.id, e.target.value)}
                                    className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0.0"
                                  />
                                ) : (
                                  <span className="text-slate-500 text-sm">-</span>
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
                        <strong>Note:</strong> Select developers and assign individual capacity SP. The total capacity is calculated automatically. Click "Create Capacity" to save.
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
