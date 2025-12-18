/**
 * Dev Performance View Component
 * Main component that orchestrates all Dev Performance sub-components
 */

import React from 'react';
import { useDevPerformance } from '../../hooks/useDevPerformance';
import DevPerformanceSelectors from './DevPerformanceSelectors';
import DevPerformanceMetrics from './DevPerformanceMetrics';
import DevPerformanceCharts from './DevPerformanceCharts';
import DevPerformanceTable from './DevPerformanceTable';

const DevPerformanceView = () => {
    const {
        squads,
        filteredSprints,
        filteredDevelopers,
        selectedSquad,
        selectedSprint,
        selectedDeveloper,
        handleSquadChange,
        handleSprintChange,
        handleDeveloperChange,
        metrics,
        statusBreakdowns,
        loading,
        error
    } = useDevPerformance();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass rounded-xl p-6 text-center">
                <div className="text-rose-400 mb-2">Error loading data</div>
                <div className="text-slate-400 text-sm">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <DevPerformanceSelectors
                squads={squads}
                filteredSprints={filteredSprints}
                filteredDevelopers={filteredDevelopers}
                selectedSquad={selectedSquad}
                selectedSprint={selectedSprint}
                selectedDeveloper={selectedDeveloper}
                onSquadChange={handleSquadChange}
                onSprintChange={handleSprintChange}
                onDeveloperChange={handleDeveloperChange}
            />

            <DevPerformanceMetrics metrics={metrics} />

            <DevPerformanceCharts statusBreakdowns={statusBreakdowns} />

            <DevPerformanceTable statusBreakdowns={statusBreakdowns} />
        </div>
    );
};

export default DevPerformanceView;





