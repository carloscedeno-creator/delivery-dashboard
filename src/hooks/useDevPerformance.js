/**
 * Custom Hook for Dev Performance Module
 * Manages data loading, filtering, and metrics calculation
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseApi';
import {
    filterIssues,
    calculateMetrics,
    calculateStatusBreakdown,
    filterAndSortSprints,
    filterDevelopers
} from '../services/devPerformanceService';

export const useDevPerformance = () => {
    const [squads, setSquads] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [developers, setDevelopers] = useState([]);
    const [issues, setIssues] = useState([]);
    const [issueSprints, setIssueSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [selectedSquad, setSelectedSquad] = useState(null);
    const [selectedSprint, setSelectedSprint] = useState(null);
    const [selectedDeveloper, setSelectedDeveloper] = useState(null);

    // Load data from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('[DEV PERFORMANCE] Loading data from Supabase...');
                
                if (!supabase) {
                    throw new Error('Supabase client not available. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
                }

                // Load all data in parallel
                const [
                    { data: squadsData, error: squadsError },
                    { data: sprintsData, error: sprintsError },
                    { data: devsData, error: devsError },
                    { data: issuesData, error: issuesError },
                    { data: isData, error: isError }
                ] = await Promise.all([
                    supabase
                        .from('squads')
                        .select('id,name')
                        .order('name', { ascending: true }),
                    supabase
                        .from('sprints')
                        .select('id,name,squad_id,start_date,end_date,is_current')
                        .order('start_date', { ascending: false }),
                    supabase
                        .from('developers')
                        .select('id,display_name,email')
                        .order('display_name', { ascending: true }),
                    supabase
                        .from('issues')
                        .select('id,issue_key,summary,current_status,current_story_points,assignee_id,squad_id,dev_close_date,created_date,updated_date')
                        .limit(1000),
                    supabase
                        .from('issue_sprints')
                        .select('issue_id,sprint_id')
                        .limit(10000)
                ]);

                // Handle errors
                if (squadsError) console.error('[DEV PERFORMANCE] Error loading squads:', squadsError);
                if (sprintsError) console.error('[DEV PERFORMANCE] Error loading sprints:', sprintsError);
                if (devsError) console.error('[DEV PERFORMANCE] Error loading developers:', devsError);
                if (issuesError) console.error('[DEV PERFORMANCE] Error loading issues:', issuesError);
                if (isError) console.error('[DEV PERFORMANCE] Error loading issue_sprints:', isError);

                setSquads(squadsData || []);
                setSprints(sprintsData || []);
                setDevelopers(devsData || []);
                setIssues(issuesData || []);
                setIssueSprints(isData || []);

                console.log('[DEV PERFORMANCE] Data loaded:', {
                    squads: (squadsData || []).length,
                    sprints: (sprintsData || []).length,
                    developers: (devsData || []).length,
                    issues: (issuesData || []).length,
                    issueSprints: (isData || []).length
                });

                setLoading(false);
            } catch (err) {
                console.error('[DEV PERFORMANCE] Error loading data:', err);
                setError(err.message);
                setLoading(false);
            }
        };
        
        loadData();
    }, []);

    // Filter sprints by selected squad
    const filteredSprints = useMemo(() => {
        return filterAndSortSprints(sprints, selectedSquad);
    }, [sprints, selectedSquad]);

    // Filter developers by selected squad and sprint
    const filteredDevelopers = useMemo(() => {
        return filterDevelopers(developers, issues, issueSprints, selectedSquad, selectedSprint);
    }, [developers, issues, issueSprints, selectedSquad, selectedSprint]);

    // Filter issues based on all filters
    const filteredIssues = useMemo(() => {
        return filterIssues(issues, issueSprints, {
            squadId: selectedSquad,
            sprintId: selectedSprint,
            developerId: selectedDeveloper
        });
    }, [issues, issueSprints, selectedSquad, selectedSprint, selectedDeveloper]);

    // Calculate metrics
    const metrics = useMemo(() => {
        if (filteredIssues.length === 0) return null;
        return calculateMetrics(filteredIssues);
    }, [filteredIssues]);

    // Calculate status breakdowns
    const statusBreakdowns = useMemo(() => {
        if (!filteredIssues.length) return { all: [], withSP: [], noSP: [] };
        
        const all = calculateStatusBreakdown(filteredIssues);
        const withSP = calculateStatusBreakdown(
            filteredIssues.filter(i => (i.current_story_points || 0) > 0)
        );
        const noSP = calculateStatusBreakdown(
            filteredIssues.filter(i => (i.current_story_points || 0) === 0)
        );
        
        return { all, withSP, noSP };
    }, [filteredIssues]);

    // Handlers
    const handleSquadChange = (squadId) => {
        setSelectedSquad(squadId === 'all' ? null : squadId);
        setSelectedSprint(null);
        setSelectedDeveloper(null);
    };

    const handleSprintChange = (sprintId) => {
        setSelectedSprint(sprintId === 'all' ? null : sprintId);
        setSelectedDeveloper(null);
    };

    const handleDeveloperChange = (developerId) => {
        setSelectedDeveloper(developerId === 'all' ? null : developerId);
    };

    return {
        // Data
        squads,
        sprints,
        developers,
        issues,
        issueSprints,
        
        // Filtered data
        filteredSprints,
        filteredDevelopers,
        filteredIssues,
        
        // Metrics
        metrics,
        statusBreakdowns,
        
        // Filters
        selectedSquad,
        selectedSprint,
        selectedDeveloper,
        
        // Handlers
        handleSquadChange,
        handleSprintChange,
        handleDeveloperChange,
        
        // State
        loading,
        error
    };
};





