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
        <div className="relative z-30" style={{ minWidth: '100px' }}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`glass rounded-xl px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors border border-slate-700/50 bg-slate-800/80 ${
                    disabled 
                        ? 'text-slate-500 cursor-not-allowed opacity-50' 
                        : 'text-slate-300 hover:bg-slate-800/50 cursor-pointer hover:border-cyan-500/50'
                }`}
                title={`Fuente de datos: ${currentSource.label}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <CurrentIcon size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{currentSource.label}</span>
                <span className="sm:hidden whitespace-nowrap">{currentSource.value === 'csv' ? 'CSV' : 'BD'}</span>
                <ChevronDown 
                    size={14}
                    className={`sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 sm:w-48 glass rounded-lg shadow-xl z-20 overflow-hidden">
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
