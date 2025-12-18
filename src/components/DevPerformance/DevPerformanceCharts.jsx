/**
 * Dev Performance Charts Component
 * Displays status breakdown charts
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DevPerformanceCharts = ({ statusBreakdowns }) => {
    if (!statusBreakdowns || !statusBreakdowns.all) return null;

    const { all, withSP, noSP } = statusBreakdowns;

    const ChartCard = ({ title, data }) => (
        <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="status" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4">
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.status === 'Done' ? '#10b981' : '#06b6d4'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="Tickets by Status" data={all} />
            <ChartCard title={`Tickets by Status (SP ${'>'} 0)`} data={withSP} />
            <ChartCard title="Tickets by Status (No SP)" data={noSP} />
        </div>
    );
};

export default DevPerformanceCharts;





