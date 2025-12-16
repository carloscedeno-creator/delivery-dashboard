import React, { useState } from 'react';
import { ChevronDown, Database, FileSpreadsheet } from 'lucide-react';

const DataSourceSelector = ({ dataSource, onSourceChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);

    const sources = [
        { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
        { value: 'db', label: 'Base de Datos', icon: Database }
    ];

    const currentSource = sources.find(s => s.value === dataSource) || sources[0];
    const CurrentIcon = currentSource.icon;

    // Debug: verificar que el componente se renderiza
    console.log('[DataSourceSelector] Rendering with:', { dataSource, disabled, currentSource: currentSource.label });

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
                    <div className="absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl z-50 overflow-hidden border border-slate-700/50">
                        {sources.map((source) => {
                            const Icon = source.icon;
                            const isSelected = source.value === dataSource;
                            return (
                                <button
                                    key={source.value}
                                    onClick={() => {
                                        onSourceChange(source.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm transition-colors ${
                                        isSelected
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-slate-300 hover:bg-slate-700/50'
                                    }`}
                                >
                                    <Icon size={14} className="sm:w-4 sm:h-4" />
                                    <span>{source.label}</span>
                                    {isSelected && (
                                        <span className="ml-auto text-cyan-400">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default DataSourceSelector;
