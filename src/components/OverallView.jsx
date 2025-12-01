import React from 'react';
import { Layout } from 'lucide-react';

const OverallView = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
            <div className="p-6 rounded-full bg-slate-800/50 border border-white/5">
                <Layout size={48} className="text-slate-500" />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Overall Dashboard</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                    This view will combine Product and Delivery insights into a unified timeline.
                    <br />
                    <span className="text-cyan-400 text-sm font-medium mt-2 block">Coming Soon</span>
                </p>
            </div>
        </div>
    );
};

export default OverallView;
