import React from 'react';
import { Layout, Box, Truck, Map, Users, BarChart, Activity, Gauge, TrendingUp, ChevronLeft, ChevronRight, LogOut, AlertCircle } from 'lucide-react';
import { getNavbarModules } from '../config/permissions';
import { getCurrentUser } from '../utils/authService';

// Mapeo de iconos
const iconMap = {
    Layout,
    Box,
    Truck,
    Map,
    Users,
    BarChart,
    Activity,
    Gauge,
    TrendingUp
};

/**
 * Sidebar lateral con navegación
 * Reemplaza el navbar horizontal anterior
 */
const Sidebar = ({ activeView, setActiveView, onLogout, isOpen, setIsOpen }) => {
    const currentUser = getCurrentUser();
    const navItems = getNavbarModules(currentUser?.role || 'regular').map(module => ({
        ...module,
        icon: iconMap[module.icon] || Layout
    }));

    return (
        <>
            {/* Overlay para móvil cuando el sidebar está abierto */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-full z-50 glass border-r border-white/10 backdrop-blur-md bg-slate-900/95 transition-all duration-300 ease-in-out ${
                isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-16'
            } overflow-hidden`}>
                <div className="flex flex-col h-full">
                    {/* Header del Sidebar */}
                    <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-white/10`}>
                        {isOpen ? (
                            <div className="flex items-center gap-3">
                                <img 
                                    src="/logo.png" 
                                    alt="Agentic Logo" 
                                    className="w-8 h-8 rounded-lg object-contain"
                                />
                                <span className="text-white font-semibold text-sm">Dashboard</span>
                            </div>
                        ) : (
                            <img 
                                src="/logo.png" 
                                alt="Agentic Logo" 
                                className="w-8 h-8 rounded-lg object-contain"
                            />
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`p-2 text-slate-400 hover:text-white transition-colors ${isOpen ? 'ml-auto' : ''}`}
                            aria-label="Toggle sidebar"
                        >
                            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    </div>

                    {/* Navegación */}
                    <nav className="flex-1 overflow-y-auto py-4">
                        <div className="space-y-1 px-2">
                            {navItems.map(item => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;
                                
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            console.log('🟢 [Sidebar] Click en:', item.id, item.label);
                                            setActiveView(item.id);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            isActive
                                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                        }`}
                                        title={!isOpen ? item.label : ''}
                                    >
                                        <Icon size={20} className="flex-shrink-0" />
                                        {isOpen && (
                                            <span className="text-sm font-medium truncate">{item.label}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Footer del Sidebar */}
                    <div className={`border-t border-white/10 p-4 ${isOpen ? '' : 'flex flex-col items-center'}`}>
                        {currentUser && isOpen && (
                            <div className="mb-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10">
                                <div className="text-xs text-slate-400 truncate">{currentUser.displayName || 'Usuario'}</div>
                                <div className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 mt-1 inline-block">
                                    {currentUser.role || 'regular'}
                                </div>
                            </div>
                        )}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors ${isOpen ? '' : 'justify-center'}`}
                                title={!isOpen ? 'Logout' : ''}
                            >
                                <LogOut size={20} />
                                {isOpen && <span className="text-sm font-medium">Logout</span>}
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

