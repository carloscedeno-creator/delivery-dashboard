import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  getSquads,
  getSprintsForSquad,
  getDevelopersForSquad
} from '@/utils/developerMetricsApi';
import { getDeveloperBurndownData, getProjectsForSquad } from '@/utils/developerBurndownApi';

const DeveloperBurndown = () => {
  const [squads, setSquads] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [selectedSquad, setSelectedSquad] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [burndownData, setBurndownData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSquads = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[DeveloperBurndown] Loading squads...');
        const data = await getSquads();
        setSquads(data || []);
        if (data?.length > 0) {
          setSelectedSquad(data[0].id);
        } else {
          setError('No squads found. Verify Supabase configuration.');
        }
      } catch (loadError) {
        console.error('[DeveloperBurndown] Error loading squads:', loadError);
        setError(`Error loading squads: ${loadError.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadSquads();
  }, []);

  useEffect(() => {
    if (!selectedSquad) {
      setSprints([]);
      setDevelopers([]);
      setProjects([]);
      setSelectedSprint(null);
      setSelectedDeveloper(null);
      setSelectedProject(null);
      return;
    }

    const loadFilters = async () => {
      try {
        console.log('[DeveloperBurndown] Loading filters for squad:', selectedSquad);
        const [sprintData, developerData, projectData] = await Promise.all([
          getSprintsForSquad(selectedSquad),
          getDevelopersForSquad(selectedSquad),
          getProjectsForSquad(selectedSquad)
        ]);

        setSprints(sprintData || []);
        setDevelopers(developerData || []);
        setProjects(projectData || []);

        const currentSprint = (sprintData || []).find((sprint) => sprint.is_active);
        if (currentSprint) {
          setSelectedSprint(currentSprint.id);
        } else if (sprintData?.length > 0) {
          setSelectedSprint(sprintData[0].id);
        }

        if (developerData?.length > 0) {
          setSelectedDeveloper((prev) => prev || developerData[0].id);
        } else {
          setSelectedDeveloper(null);
        }

        setSelectedProject(null);
      } catch (loadError) {
        console.error('[DeveloperBurndown] Error loading filters:', loadError);
        setError(`Error loading filters: ${loadError.message}`);
      }
    };

    loadFilters();
  }, [selectedSquad]);

  useEffect(() => {
    if (!selectedSprint || !selectedDeveloper) {
      setBurndownData(null);
      return;
    }

    const loadBurndown = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[DeveloperBurndown] Loading burndown data', {
          squad: selectedSquad,
          sprint: selectedSprint,
          developer: selectedDeveloper,
          project: selectedProject
        });
        const data = await getDeveloperBurndownData(selectedSprint, selectedDeveloper, {
          squadId: selectedSquad,
          projectId: selectedProject
        });
        setBurndownData(data);
      } catch (loadError) {
        console.error('[DeveloperBurndown] Error loading burndown:', loadError);
        setError(`Error loading burndown data: ${loadError.message}`);
        setBurndownData(null);
      } finally {
        setLoading(false);
      }
    };

    loadBurndown();
  }, [selectedSprint, selectedDeveloper, selectedSquad, selectedProject]);

  const selectedSprintName = sprints.find((sprint) => sprint.id === selectedSprint)?.sprint_name || '';
  const selectedDeveloperName = developers.find((developer) => developer.id === selectedDeveloper)?.display_name || '';

  const chartData = useMemo(() => {
    if (!burndownData?.days) return [];
    return burndownData.days.map((day) => ({
      date: day.date,
      Planned: day.planned,
      Completed: day.completed,
      Remaining: day.remaining
    }));
  }, [burndownData]);

  if (loading && squads.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-rose-500/50">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle size={24} />
            <div>
              <h3 className="text-lg font-semibold">Error loading burndown</h3>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[180px]"
          value={selectedSquad || ''}
          onChange={(event) => setSelectedSquad(event.target.value || null)}
        >
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.squad_name}
            </option>
          ))}
        </select>

        <select
          className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[220px]"
          value={selectedSprint || ''}
          onChange={(event) => setSelectedSprint(event.target.value || null)}
        >
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.sprint_name}
              {sprint.is_active ? ' (Active)' : ''}
            </option>
          ))}
        </select>

        <select
          className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[220px]"
          value={selectedDeveloper || ''}
          onChange={(event) => setSelectedDeveloper(event.target.value || null)}
        >
          {developers.map((developer) => (
            <option key={developer.id} value={developer.id}>
              {developer.display_name}
            </option>
          ))}
        </select>

        <select
          className="appearance-none bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 pr-10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer min-w-[220px]"
          value={selectedProject || ''}
          onChange={(event) => setSelectedProject(event.target.value || null)}
        >
          <option value="">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.initiative_name || project.initiative_key || project.id}
            </option>
          ))}
        </select>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-2xl font-semibold text-slate-100">
            {selectedDeveloperName || 'Developer'} · {selectedSprintName || 'Sprint'}
          </h2>
          <p className="text-slate-400 text-sm">
            Planned vs Remaining story points, calculated using historical assignee when available.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        )}

        {!loading && (!chartData || chartData.length === 0) && (
          <div className="text-center text-slate-400 py-12">
            No burndown data available for the selected filters.
          </div>
        )}

        {!loading && chartData.length > 0 && (
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Planned" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Remaining" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {!loading && burndownData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Total Planned SP</p>
            <p className="text-2xl font-semibold text-slate-100">{burndownData.totalPlanned}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Completed SP</p>
            <p className="text-2xl font-semibold text-slate-100">{burndownData.totalCompleted}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Tickets in Scope</p>
            <p className="text-2xl font-semibold text-slate-100">{burndownData.totalTickets}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperBurndown;
