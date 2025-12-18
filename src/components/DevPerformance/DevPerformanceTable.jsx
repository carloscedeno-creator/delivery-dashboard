/**
 * Dev Performance Table Component
 * Displays detailed status breakdown table
 */

import React from 'react';

const DevPerformanceTable = ({ statusBreakdowns }) => {
    if (!statusBreakdowns || !statusBreakdowns.all || statusBreakdowns.all.length === 0) {
        return null;
    }

    return (
        <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-4 text-slate-400">Status</th>
                            <th className="text-right py-2 px-4 text-slate-400">Count</th>
                            <th className="text-right py-2 px-4 text-slate-400">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statusBreakdowns.all.map((metric, idx) => (
                            <tr key={idx} className="border-b border-slate-800">
                                <td className="py-2 px-4 text-slate-200">{metric.status}</td>
                                <td className="py-2 px-4 text-right text-slate-300">{metric.count}</td>
                                <td className="py-2 px-4 text-right text-slate-400">{metric.percentage}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DevPerformanceTable;





