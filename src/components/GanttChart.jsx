import React, { useMemo } from 'react';
import { format, differenceInDays, addDays, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isValid } from 'date-fns';
import { motion } from 'framer-motion';

const GanttChart = ({ data }) => {
    // Helper to parse dates in multiple formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
    const parseDate = (dateStr) => {
        if (!dateStr || !dateStr.trim()) return null;
        
        // Try ISO format first (YYYY-MM-DD)
        try {
            const isoDate = parseISO(dateStr);
            if (isValid(isoDate)) {
                return isoDate;
            }
        } catch (e) {
            // Continue to try other formats
        }

        // Try DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const date = new Date(year, month - 1, day);
                if (isValid(date)) {
                    return date;
                }
            }
        }

        // Try standard Date parsing as fallback
        const fallbackDate = new Date(dateStr);
        if (isValid(fallbackDate)) {
            return fallbackDate;
        }

        return null;
    };

    // 1. Determine Date Range
    const { startDate, endDate, totalDays, months } = useMemo(() => {
        console.log('[GANTT] Procesando datos:', { count: data.length });
        
        if (!data.length) {
            console.warn('[GANTT] No hay datos para mostrar');
            return { startDate: new Date(), endDate: new Date(), totalDays: 0, months: [] };
        }

        // Log primeros 3 items para debug
        console.log('[GANTT] Primeros 3 items:', data.slice(0, 3).map(d => ({
            initiative: d.initiative,
            start: d.start,
            delivery: d.delivery,
            startType: typeof d.start,
            deliveryType: typeof d.delivery
        })));

        const parsedDates = data
            .flatMap(d => {
                const start = parseDate(d.start);
                const delivery = parseDate(d.delivery);
                return [start, delivery];
            })
            .filter(d => d !== null && isValid(d));

        console.log('[GANTT] Fechas parseadas:', { 
            total: parsedDates.length, 
            sample: parsedDates.slice(0, 3).map(d => d.toISOString())
        });

        if (parsedDates.length === 0) {
            console.warn('[GANTT] No se pudieron parsear fechas. Datos recibidos:', 
                data.slice(0, 3).map(d => ({ 
                    initiative: d.initiative, 
                    start: d.start, 
                    delivery: d.delivery,
                    startType: typeof d.start,
                    deliveryType: typeof d.delivery
                }))
            );
            return { startDate: new Date(), endDate: new Date(), totalDays: 0, months: [] };
        }

        const minDate = new Date(Math.min(...parsedDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...parsedDates.map(d => d.getTime())));

        // Add some buffer
        const start = startOfMonth(minDate);
        const end = endOfMonth(maxDate);

        const days = differenceInDays(end, start) + 1;
        const monthIntervals = eachMonthOfInterval({ start, end });

        return { startDate: start, endDate: end, totalDays: days, months: monthIntervals };
    }, [data]);

    // 2. Helper to calculate position and width
    const getPosition = (start, end) => {
        const startDateObj = parseDate(start);
        const endDateObj = parseDate(end);

        if (!startDateObj || !endDateObj || !isValid(startDateObj) || !isValid(endDateObj)) {
            return { left: '0%', width: '0%' };
        }

        const startOffset = differenceInDays(startDateObj, startDate);
        const duration = differenceInDays(endDateObj, startDateObj);

        const left = Math.max(0, (startOffset / totalDays) * 100);
        const width = Math.max(0, (duration / totalDays) * 100);

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
            <div className="min-w-full md:min-w-[600px] lg:min-w-[800px]">
                {/* Timeline Header */}
                <div className="flex border-b border-white/10 mb-4 pb-2">
                    <div className="w-1/3 md:w-1/4 shrink-0 font-medium text-muted-foreground pl-2 md:pl-4 text-xs md:text-sm">Initiative</div>
                    <div className="w-2/3 md:w-3/4 relative h-8">
                        {months.map((month, index) => {
                            const monthStart = differenceInDays(month, startDate);
                            const left = (monthStart / totalDays) * 100;
                            return (
                                <div
                                    key={index}
                                    className="absolute top-0 text-[10px] md:text-xs text-muted-foreground border-l border-white/5 pl-1"
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
                        const startDateObj = parseDate(item.start);
                        const endDateObj = parseDate(item.delivery);
                        const { left, width } = getPosition(item.start, item.delivery);
                        
                        // Format dates for tooltip
                        const formatDateForTooltip = (dateObj) => {
                            if (!dateObj || !isValid(dateObj)) return 'N/A';
                            return format(dateObj, 'MMM dd, yyyy');
                        };

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center group hover:bg-white/5 rounded-lg py-2 transition-colors"
                            >
                                {/* Label */}
                                <div className="w-1/3 md:w-1/4 shrink-0 px-2 md:px-4">
                                    <div className="font-medium text-xs md:text-sm truncate text-white" title={item.initiative}>{item.initiative}</div>
                                    <div className="text-[10px] md:text-xs text-slate-400 truncate">{item.squad}</div>
                                </div>

                                {/* Bar Track */}
                                <div className="w-2/3 md:w-3/4 relative h-8 flex items-center px-1 md:px-2">
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
                                    {startDateObj && endDateObj && isValid(startDateObj) && isValid(endDateObj) ? (
                                        <div
                                            className="absolute h-4 md:h-5 rounded-full bg-slate-800/50 overflow-hidden border border-slate-700/50"
                                            style={{ left, width }}
                                        >
                                            <div
                                                className={`h-full ${getStatusColor(item.status)}/80 relative`}
                                                style={{ width: `${item.status}%` }}
                                            >
                                                {/* Shine effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                                            </div>

                                            {/* Tooltip on hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-2 rounded-lg border border-white/10 whitespace-nowrap z-10 transition-opacity pointer-events-none shadow-lg">
                                                <div className="font-semibold text-white mb-1">{item.initiative}</div>
                                                <div className="text-slate-300 space-y-0.5">
                                                    <div>Start: {formatDateForTooltip(startDateObj)}</div>
                                                    <div>End: {formatDateForTooltip(endDateObj)}</div>
                                                    <div className="pt-1 border-t border-white/10 mt-1">
                                                        Progress: {item.status}% • SPI: {item.spi?.toFixed(2) || '1.00'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute left-0 text-xs text-slate-500 px-2">
                                            Invalid dates: {item.start || 'N/A'} - {item.delivery || 'N/A'}
                                        </div>
                                    )}
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
