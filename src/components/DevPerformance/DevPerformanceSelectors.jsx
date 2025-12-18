/**
 * Dev Performance Selectors Component
 * Handles squad, sprint, and developer selection
 */

import React from 'react';

const DevPerformanceSelectors = ({
    squads,
    filteredSprints,
    filteredDevelopers,
    selectedSquad,
    selectedSprint,
    selectedDeveloper,
    onSquadChange,
    onSprintChange,
    onDeveloperChange
}) => {
    return (
        <div className="glass rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Squad Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Squad
                    </label>
                    <select
                        value={selectedSquad || 'all'}
                        onChange={(e) => onSquadChange(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="all">All Squads</option>
                        {squads.map(squad => (
                            <option key={squad.id} value={squad.id}>
                                {squad.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sprint Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Sprint
                    </label>
                    <select
                        value={selectedSprint || 'all'}
                        onChange={(e) => onSprintChange(e.target.value)}
                        disabled={!selectedSquad}
                        className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            !selectedSquad ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <option value="all">All Sprints</option>
                        {filteredSprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>
                                {sprint.is_current ? '⭐ ' : ''}{sprint.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Developer Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Developer
                    </label>
                    <select
                        value={selectedDeveloper || 'all'}
                        onChange={(e) => onDeveloperChange(e.target.value)}
                        disabled={!selectedSquad}
                        className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            !selectedSquad ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <option value="all">All Developers</option>
                        {filteredDevelopers.map(dev => (
                            <option key={dev.id} value={dev.id}>
                                {dev.display_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default DevPerformanceSelectors;





