import React, { useMemo, useEffect, useRef } from 'react';
import { format, differenceInDays, addDays, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isValid, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

/**
 * Normalizes data from different sources to a common format
 * Supports both Delivery Roadmap and Product Roadmap formats
 */
const normalizeGanttData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    return data.map(item => {
        // Normalize field names - support multiple input formats
        let statusValue = 0;
        
        // Handle status: can be a number (completion %) or a string (status text)
        if (item.completion !== undefined && !isNaN(parseFloat(item.completion))) {
            statusValue = parseFloat(item.completion);
        } else if (item.status !== undefined) {
            // Convert status text to completion percentage
            const status = String(item.status).toLowerCase();
            if (status === 'complete' || status.includes('done') || status.includes('completed')) {
                statusValue = 100;
            } else if (status === 'early' || status === 'on time') {
                statusValue = 75;
            } else if (status === 'delay' || status === 'delayed') {
                statusValue = 50;
            } else if (status === 'incomplete' || status.includes('progress')) {
                statusValue = 25;
            } else if (!isNaN(parseFloat(item.status))) {
                statusValue = parseFloat(item.status);
            }
        }
        
        const normalized = {
            initiative: item.initiative || item.name || item.title || 'Unknown',
            squad: item.squad || item.team || item.group || 'Unassigned',
            start: item.start || item.startDate || item.begin || null,
            delivery: item.delivery || item.endDate || item.expectedDate || item.end || item.dueDate || null,
            status: statusValue,
            spi: item.spi !== undefined ? item.spi : 1.0
        };

        return normalized;
    }).filter(item => {
        // Filter out items without valid start and delivery dates
        return item.start && item.delivery && 
               item.start.toString().trim() !== '' && 
               item.delivery.toString().trim() !== '';
    });
};

const GanttChart = ({ data }) => {
    // Normalize data to ensure consistent format
    const normalizedData = useMemo(() => {
        if (!data || !Array.isArray(data)) {
            console.warn('🟢 [GANTT] No data provided or data is not an array');
            return [];
        }
        
        const normalized = normalizeGanttData(data);
        console.log('🟢 [GANTT] ====== COMPONENTE RENDERIZADO ======');
        console.log('🟢 [GANTT] Original data length:', data.length);
        console.log('🟢 [GANTT] Normalized data length:', normalized.length);
        console.log('🟢 [GANTT] Primeros 2 items originales:', data.slice(0, 2));
        console.log('🟢 [GANTT] Primeros 2 items normalizados:', normalized.slice(0, 2));
        console.log('🟢 [GANTT] Sample normalized item:', normalized[0]);
        return normalized;
    }, [data]);

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

        // Try YYYY/MM/DD format (CSV format)
        const slashParts = dateStr.split('/');
        if (slashParts.length === 3) {
            const part1 = parseInt(slashParts[0], 10);
            const part2 = parseInt(slashParts[1], 10);
            const part3 = parseInt(slashParts[2], 10);
            
            // Si el primer número es > 31, es YYYY/MM/DD
            if (part1 > 31 && !isNaN(part1) && !isNaN(part2) && !isNaN(part3)) {
                const date = new Date(part1, part2 - 1, part3);
                if (isValid(date)) {
                    return date;
                }
            }
            // Si no, es DD/MM/YYYY
            else if (!isNaN(part1) && !isNaN(part2) && !isNaN(part3)) {
                const date = new Date(part3, part2 - 1, part1);
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
        console.log('[GANTT] Procesando datos:', { count: normalizedData.length });
        
        if (!normalizedData.length) {
            console.warn('[GANTT] No hay datos para mostrar');
            return { startDate: new Date(), endDate: new Date(), totalDays: 0, months: [] };
        }

        // Log primeros 3 items para debug
        console.log('[GANTT] Primeros 3 items:', normalizedData.slice(0, 3).map(d => ({
            initiative: d.initiative,
            start: d.start,
            delivery: d.delivery,
            startType: typeof d.start,
            deliveryType: typeof d.delivery
        })));

        const parsedDates = normalizedData
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
                normalizedData.slice(0, 3).map(d => ({ 
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

        // Always include the current month
        const today = startOfDay(new Date());
        const currentMonth = startOfMonth(today);
        const currentMonthEnd = endOfMonth(today);
        
        const minMonthStart = startOfMonth(minDate);
        const maxMonthEnd = endOfMonth(maxDate);

        // Start from the earliest month or current month (whichever is earlier)
        const start = minMonthStart < currentMonth ? minMonthStart : currentMonth;
        
        // End at the latest month end or current month end (whichever is later)
        const end = maxMonthEnd > currentMonthEnd ? maxMonthEnd : currentMonthEnd;

        const days = differenceInDays(end, start) + 1;
        const monthIntervals = eachMonthOfInterval({ start, end });

        console.log('[GANTT] 📅 Date range calculated:', {
            minDate: format(minDate, 'yyyy-MM-dd'),
            maxDate: format(maxDate, 'yyyy-MM-dd'),
            today: format(today, 'yyyy-MM-dd'),
            currentMonth: format(currentMonth, 'yyyy-MM-dd'),
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd'),
            totalDays: days,
            months: monthIntervals.map(m => format(m, 'MMM yyyy'))
        });

        return { startDate: start, endDate: end, totalDays: days, months: monthIntervals };
    }, [normalizedData]);

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

    // Calculate today's position for the red line
    const todayPosition = useMemo(() => {
        if (!normalizedData || normalizedData.length === 0 || totalDays === 0) {
            console.log('[GANTT] No data or totalDays is 0, skipping today line');
            return null;
        }

        const today = startOfDay(new Date());
        const todayTime = today.getTime();
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        
        console.log('[GANTT] 🔴 Calculating today position:', {
            today: format(today, 'yyyy-MM-dd'),
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            todayTime,
            startTime,
            endTime,
            isBeforeStart: today < startDate,
            isAfterEnd: today > endDate,
            totalDays
        });
        
        // Always show the line if today is within the date range
        // If today is before start, show at 0%
        // If today is after end, show at 100%
        // Otherwise, calculate the percentage
        
        let position;
        if (today < startDate) {
            // Today is before the start date - show at the beginning
            position = 0;
            console.log('[GANTT] 🔴 Today is before start date, showing at 0%');
        } else if (today > endDate) {
            // Today is after the end date - show at the end
            position = 100;
            console.log('[GANTT] 🔴 Today is after end date, showing at 100%');
        } else {
            // Today is within the range - calculate exact position
            const daysFromStart = differenceInDays(today, startDate);
            position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
            console.log('[GANTT] 🔴 Today is within range:', {
                daysFromStart,
                totalDays,
                position: `${position}%`
            });
        }
        
        console.log('[GANTT] 🔴 Today line will be shown at:', `${position}%`);
        
        return position;
    }, [startDate, endDate, totalDays, normalizedData]);

    // Scroll to today's position on mount
    const scrollContainerRef = useRef(null);
    const todayLineRef = useRef(null);
    
    useEffect(() => {
        if (todayPosition !== null && scrollContainerRef.current) {
            // Wait for the DOM to be ready and ensure layout is complete
            const timeoutId = setTimeout(() => {
                const container = scrollContainerRef.current;
                if (!container) {
                    console.log('[GANTT] 🔴 Scroll container not found');
                    return;
                }
                
                // Get container dimensions
                const containerWidth = container.clientWidth;
                const scrollWidth = container.scrollWidth;
                
                // Calculate today's position in pixels
                const timelineWidth = scrollWidth;
                const todayPositionPx = (todayPosition / 100) * timelineWidth;
                
                // Calculate scroll position to center today's line
                const scrollPosition = todayPositionPx - (containerWidth / 2);
                const finalScroll = Math.max(0, Math.min(scrollPosition, scrollWidth - containerWidth));
                
                console.log('[GANTT] 🔴 Scrolling to today:', {
                    todayPosition: `${todayPosition}%`,
                    todayPositionPx: `${todayPositionPx}px`,
                    containerWidth: `${containerWidth}px`,
                    scrollWidth: `${scrollWidth}px`,
                    timelineWidth: `${timelineWidth}px`,
                    scrollPosition: `${scrollPosition}px`,
                    finalScroll: `${finalScroll}px`
                });
                
                // Scroll to position
                container.scrollTo({
                    left: finalScroll,
                    behavior: 'smooth'
                });
                
                // Also try scrolling after a short delay to ensure it works
                setTimeout(() => {
                    if (container.scrollLeft !== finalScroll) {
                        console.log('[GANTT] 🔴 Retrying scroll...');
                        container.scrollTo({
                            left: finalScroll,
                            behavior: 'smooth'
                        });
                    }
                }, 300);
            }, 200);
            
            return () => clearTimeout(timeoutId);
        } else {
            console.log('[GANTT] 🔴 Cannot scroll - todayPosition:', todayPosition, 'container:', !!scrollContainerRef.current);
        }
    }, [todayPosition, normalizedData]);

    // Calculate minimum width for the timeline
    const minTimelineWidth = useMemo(() => {
        const calculatedWidth = Math.max(800, totalDays * 3);
        console.log('[GANTT] Timeline width calculated:', {
            totalDays,
            calculatedWidth,
            minWidth: 800
        });
        return calculatedWidth;
    }, [totalDays]);

    return (
        <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto overflow-y-visible custom-scrollbar" 
            style={{ 
                scrollbarWidth: 'thin', 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
            }}
        >
            <div className="relative overflow-visible" style={{ minWidth: `${minTimelineWidth}px`, width: '100%' }}>
                {/* Timeline Header */}
                <div className="flex border-b border-white/10 mb-4 pb-2 relative">
                    <div className="w-1/3 md:w-1/4 shrink-0 font-medium text-slate-300 pl-2 md:pl-4 text-xs md:text-sm">Initiative</div>
                    <div className="w-2/3 md:w-3/4 relative h-8">
                                    {months.map((month, index) => {
                            const monthStart = differenceInDays(month, startDate);
                            const left = (monthStart / totalDays) * 100;
                            const monthAbbr = format(month, 'MMM');
                            const year = format(month, 'yy');
                            return (
                                <div
                                    key={index}
                                    className="absolute top-0 text-xs md:text-sm text-slate-300 border-l border-white/10 pl-2 font-medium"
                                    style={{ left: `${left}%` }}
                                >
                                    {monthAbbr} {year}
                                </div>
                            );
                        })}
                        {/* Today's red line in header */}
                        {todayPosition !== null && (
                            <div
                                ref={todayLineRef}
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-lg shadow-red-500/70"
                                style={{ 
                                    left: `${todayPosition}%`,
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 0 4px rgba(239, 68, 68, 0.6)'
                                }}
                                title={`Today: ${format(new Date(), 'MMM dd, yyyy')}`}
                            >
                                {/* Make it more visible with a thicker visual indicator */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full -mt-1 border-2 border-white/20" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Rows */}
                <div className="space-y-3">
                    {normalizedData.map((item, index) => {
                        const startDateObj = parseDate(item.start);
                        const endDateObj = parseDate(item.delivery);
                        const { left, width } = getPosition(item.start, item.delivery);
                        
                        // Debug: Log si las fechas no se pueden parsear
                        if (!startDateObj || !endDateObj) {
                            console.warn(`[GANTT] Fechas inválidas para ${item.initiative}:`, {
                                start: item.start,
                                delivery: item.delivery,
                                startParsed: startDateObj,
                                endParsed: endDateObj
                            });
                        }
                        
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
                                <div className="w-2/3 md:w-3/4 relative h-8 flex items-center px-1 md:px-2 overflow-visible">
                                    {/* Grid Lines */}
                                    {months.map((month, i) => {
                                        const monthStart = differenceInDays(month, startDate);
                                        const l = (monthStart / totalDays) * 100;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-0 bottom-0 border-l border-white/10"
                                                style={{ left: `${l}%` }}
                                            />
                                        );
                                    })}
                                    
                                    {/* Today's red line */}
                                    {todayPosition !== null && (
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 shadow-lg shadow-red-500/70"
                                            style={{ 
                                                left: `${todayPosition}%`,
                                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 0 4px rgba(239, 68, 68, 0.6)'
                                            }}
                                            title={`Today: ${format(new Date(), 'MMM dd, yyyy')}`}
                                        />
                                    )}

                                    {/* Progress Bar */}
                                    {startDateObj && endDateObj && isValid(startDateObj) && isValid(endDateObj) ? (
                                        <div
                                            className="absolute h-6 md:h-7 rounded overflow-visible"
                                            style={{ left, width }}
                                        >
                                            {/* Completed portion */}
                                            <div
                                                className={`h-full ${getStatusColor(item.status)} relative`}
                                                style={{ width: `${Math.min(item.status || 0, 100)}%` }}
                                            />
                                            {/* Remaining portion */}
                                            {item.status < 100 && (
                                                <div
                                                    className="absolute top-0 bottom-0 bg-slate-700/50"
                                                    style={{ left: `${item.status || 0}%`, width: `${100 - (item.status || 0)}%` }}
                                                />
                                            )}

                                            {/* Tooltip on hover - positioned dynamically to avoid clipping */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/98 text-[10px] md:text-xs px-3 md:px-4 py-2 md:py-3 rounded-lg border border-white/20 whitespace-nowrap z-50 transition-opacity pointer-events-none shadow-2xl min-w-max">
                                                {/* Arrow pointing down */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900/98"></div>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20"></div>
                                                
                                                <div className="font-semibold text-white mb-1.5 text-xs md:text-sm">{item.initiative}</div>
                                                <div className="text-slate-300 space-y-1 text-[10px] md:text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400">Start:</span>
                                                        <span className="text-white font-medium">{formatDateForTooltip(startDateObj)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400">End:</span>
                                                        <span className="text-white font-medium">{formatDateForTooltip(endDateObj)}</span>
                                                    </div>
                                                    <div className="pt-1.5 border-t border-white/10 mt-1.5 flex items-center gap-3">
                                                        <span>
                                                            <span className="text-slate-400">Progress:</span>{' '}
                                                            <span className="text-white font-medium">{item.status}%</span>
                                                        </span>
                                                        <span className="text-white/30">•</span>
                                                        <span>
                                                            <span className="text-slate-400">SPI:</span>{' '}
                                                            <span className="text-white font-medium">{item.spi?.toFixed(2) || '1.00'}</span>
                                                        </span>
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
