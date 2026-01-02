import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPICard = ({ title, value, label, icon: Icon, trend, color }) => {
    const colorMap = {
        blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
        emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
        rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400',
        amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    };

    const theme = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${theme} p-6 backdrop-blur-sm glass`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-400">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-white">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${theme.split(' ').pop()}`}>
                    <Icon size={24} />
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                {trend && (
                    <span className={`flex items-center text-xs font-medium ${trend === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trend === 'positive' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {trend === 'positive' ? '+2.5%' : '-1.2%'}
                    </span>
                )}
                <span className="text-xs text-slate-400">{label}</span>
            </div>
        </motion.div>
    );
};

export default KPICard;
