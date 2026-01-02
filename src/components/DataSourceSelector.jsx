import React, { useState, useEffect } from 'react';
import { ChevronDown, Database, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';

const DataSourceSelector = ({ dataSource, onSourceChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);

    // Verificar si Supabase está configurado intentando una conexión real
    useEffect(() => {
        const checkSupabase = async () => {
            try {
                const { supabase } = await import('../utils/supabaseApi.js');
                if (supabase) {
                    // Intentar una consulta simple para verificar que realmente funciona
                    const { error } = await supabase.from('squads').select('id').limit(1);
                    // Si no hay error o el error es solo de permisos (no de conexión), considerar configurado
                    setIsSupabaseConfigured(!error || (error && !error.message?.includes('Invalid API key') && !error.message?.includes('JWT')));
                } else {
                    setIsSupabaseConfigured(false);
                }
            } catch (error) {
                console.warn('[DataSourceSelector] Error verificando Supabase:', error);
                setIsSupabaseConfigured(false);
            }
        };
        checkSupabase();
    }, []);

    const sources = [
        { value: 'csv', label: 'CSV', icon: FileSpreadsheet, alwaysEnabled: true },
        { 
            value: 'db', 
            label: 'Base de Datos', 
            icon: Database, 
            alwaysEnabled: false,
            disabled: !isSupabaseConfigured,
            tooltip: !isSupabaseConfigured ? 'Supabase no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env' : ''
        }
    ];

    const currentSource = sources.find(s => s.value === dataSource) || sources[0];
    const CurrentIcon = currentSource.icon;

    // Debug: verificar que el componente se renderiza
    console.log('[DataSourceSelector] Rendering with:', { 
        dataSource, 
        disabled, 
        currentSource: currentSource.label,
        isSupabaseConfigured 
    });

    return (
        <div className="relative z-50" style={{ minWidth: '120px', display: 'block' }}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`glass rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm transition-colors border border-slate-700/50 bg-slate-800/90 backdrop-blur-sm ${
                    disabled 
                        ? 'text-slate-500 cursor-not-allowed opacity-50' 
                        : 'text-slate-200 hover:bg-slate-700/70 cursor-pointer hover:border-cyan-500/50 active:scale-95'
                }`}
                title={`Fuente de datos: ${currentSource.label}`}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    width: '100%',
                    minWidth: '120px'
                }}
            >
                <CurrentIcon size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap font-medium">{currentSource.label}</span>
                <ChevronDown 
                    size={16}
                    className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 glass rounded-lg shadow-xl z-50 overflow-hidden border border-slate-700/50">
                        {sources.map((source) => {
                            const Icon = source.icon;
                            const isSelected = source.value === dataSource;
                            const isSourceDisabled = source.disabled || (disabled && !source.alwaysEnabled);
                            
                            return (
                                <button
                                    key={source.value}
                                    onClick={() => {
                                        if (!isSourceDisabled) {
                                            onSourceChange(source.value);
                                            setIsOpen(false);
                                        }
                                    }}
                                    disabled={isSourceDisabled}
                                    title={source.tooltip || ''}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm transition-colors ${
                                        isSourceDisabled
                                            ? 'text-slate-500 cursor-not-allowed opacity-50'
                                            : isSelected
                                                ? 'bg-cyan-500/20 text-cyan-400'
                                                : 'text-slate-300 hover:bg-slate-700/50'
                                    }`}
                                >
                                    <Icon size={14} className="sm:w-4 sm:h-4" />
                                    <span className="flex-1 text-left">{source.label}</span>
                                    {!isSupabaseConfigured && source.value === 'db' && (
                                        <Info size={12} className="text-amber-400" title={source.tooltip} />
                                    )}
                                    {isSelected && !isSourceDisabled && (
                                        <span className="ml-auto text-cyan-400">✓</span>
                                    )}
                                </button>
                            );
                        })}
                        {!isSupabaseConfigured && (
                            <div className="px-3 py-2 text-xs text-amber-400 bg-amber-500/10 border-t border-slate-700/50">
                                <AlertCircle size={12} className="inline mr-1" />
                                Supabase no configurado
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default DataSourceSelector;
