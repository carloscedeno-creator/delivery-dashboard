/**
 * Dev Performance Metrics Cards Component
 * Displays key performance metrics
 */

import React from 'react';

const DevPerformanceMetrics = ({ metrics }) => {
    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-6">
                <div className="text-sm text-slate-400 mb-1">Total Issues</div>
                <div className="text-3xl font-bold text-white">{metrics.totalIssues}</div>
            </div>
            
            <div className="glass rounded-xl p-6">
                <div className="text-sm text-slate-400 mb-1">Dev Done Rate</div>
                <div className="text-3xl font-bold text-cyan-400">{metrics.devDoneRate}%</div>
                <div className="text-xs text-slate-500 mt-1">
                    {metrics.doneCount} of {metrics.totalIssues}
                </div>
            </div>
            
            <div className="glass rounded-xl p-6">
                <div className="text-sm text-slate-400 mb-1">Total SP</div>
                <div className="text-3xl font-bold text-white">{metrics.totalSP}</div>
            </div>
            
            <div className="glass rounded-xl p-6">
                <div className="text-sm text-slate-400 mb-1">SP Dev Done</div>
                <div className="text-3xl font-bold text-emerald-400">{metrics.spDevDone}</div>
                <div className="text-xs text-slate-500 mt-1">
                    {metrics.spDevDoneRate}% complete
                </div>
            </div>
        </div>
    );
};

export default DevPerformanceMetrics;





