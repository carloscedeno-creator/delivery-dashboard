import React, { useMemo } from 'react';
import { format, differenceInDays, addDays, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { motion } from 'framer-motion';

const GanttChart = ({ data }) => {
    // 1. Determine Date Range
    const { startDate, endDate, totalDays, months } = useMemo(() => {
        if (!data.length) return { startDate: new Date(), endDate: new Date(), totalDays: 0, months: [] };

        const dates = data.flatMap(d => [parseISO(d.start), parseISO(d.delivery)]);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Add some buffer
        const start = startOfMonth(minDate);
        const end = endOfMonth(maxDate);

        const days = differenceInDays(end, start) + 1;
        const monthIntervals = eachMonthOfInterval({ start, end });

        return { startDate: start, endDate: end, totalDays: days, months: monthIntervals };
    }, [data]);

    // 2. Helper to calculate position and width
    const getPosition = (start, end) => {
        const startOffset = differenceInDays(parseISO(start), startDate);
        const duration = differenceInDays(parseISO(end), parseISO(start));

        const left = (startOffset / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return { left: `${left}%`, width: `${width}%` };
    };

    const getStatusColor = (status) => {
        if (status >= 90) return 'bg-emerald-500';
        if (status >= 50) return 'bg-blue-500';
        if (status > 0) return 'bg-amber-500';
        return 'bg-slate-600';
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px]">
                {/* Timeline Header */}
                <div className="flex border-b border-white/10 mb-4 pb-2">
                    <div className="w-1/4 shrink-0 font-medium text-muted-foreground pl-4">Initiative</div>
                    <div className="w-3/4 relative h-8">
                        {months.map((month, index) => {
                            const monthStart = differenceInDays(month, startDate);
                            const left = (monthStart / totalDays) * 100;
                            return (
                                <div
                                    key={index}
                                    className="absolute top-0 text-xs text-muted-foreground border-l border-white/5 pl-1"
                                    style={{ left: `${left}%` }}
                                >
                                    {format(month, 'MMM yyyy')}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rows */}
                <div className="space-y-3">
                    {data.map((item, index) => {
                        const { left, width } = getPosition(item.start, item.delivery);
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center group hover:bg-white/5 rounded-lg py-2 transition-colors"
                            >
                                {/* Label */}
                                <div className="w-1/4 shrink-0 px-4">
                                    <div className="font-medium text-sm truncate" title={item.initiative}>{item.initiative}</div>
                                    <div className="text-xs text-muted-foreground truncate">{item.squad}</div>
                                </div>

                                {/* Bar Track */}
                                <div className="w-3/4 relative h-8 flex items-center px-2">
                                    {/* Grid Lines */}
                                    {months.map((month, i) => {
                                        const monthStart = differenceInDays(month, startDate);
                                        const l = (monthStart / totalDays) * 100;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-0 bottom-0 border-l border-white/5"
                                                style={{ left: `${l}%` }}
                                            />
                                        );
                                    })}

                                    {/* Progress Bar */}
                                    <div
                                        className="absolute h-4 rounded-full bg-slate-800/50 overflow-hidden"
                                        style={{ left, width }}
                                    >
                                        <div
                                            className={`h-full ${getStatusColor(item.status)}/80 relative`}
                                            style={{ width: `${item.status}%` }}
                                        >
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                                        </div>

                                        {/* Tooltip on hover (simple implementation) */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-xs px-2 py-1 rounded border border-white/10 whitespace-nowrap z-10 transition-opacity pointer-events-none">
                                            {item.status}% Complete • SPI: {item.spi}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GanttChart;
