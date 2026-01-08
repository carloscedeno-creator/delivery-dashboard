import React, { useState, useEffect } from 'react';
import { Layout, Box, Truck, Map, Users, BarChart, Activity, Gauge, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, LogOut, AlertCircle, UserCheck, Shield, MessageSquare } from 'lucide-react';
import { getNavbarModules } from '../config/permissions';
import { getCurrentUser } from '../utils/authService';

// Helper para obtener la ruta correcta del logo en desarrollo y producción
const getLogoPath = () => {
    const baseUrl = import.meta.env.BASE_URL || '';
    // En desarrollo: BASE_URL es '/' o ''
    // En producción: BASE_URL es '/delivery-dashboard/'
    // Los archivos de public/ se copian a la raíz de dist/, así que la ruta debe ser relativa a BASE_URL
    return `${baseUrl}logo.png`;
};

// Componente Logo con manejo robusto de errores y fallbacks
const LogoImage = () => {
    const [logoSrc, setLogoSrc] = useState(getLogoPath());
    const [attempts, setAttempts] = useState(0);
    const maxAttempts = 3;
    
    const handleError = (e) => {
        const currentSrc = e.target.src;
        console.warn('[Sidebar] Failed to load logo:', currentSrc, 'BASE_URL:', import.meta.env.BASE_URL, 'Attempt:', attempts + 1);
        
        if (attempts < maxAttempts) {
            setAttempts(prev => prev + 1);
            // Intentar rutas alternativas
            const alternatives = [
                '/logo.png', // Ruta absoluta desde raíz
                '/delivery-dashboard/logo.png', // Ruta con base path
                './logo.png', // Ruta relativa
                'logo.png' // Solo nombre del archivo
            ];
            
            const nextAlt = alternatives[attempts];
            if (nextAlt) {
                console.log('[Sidebar] Trying alternative logo path:', nextAlt);
                setLogoSrc(nextAlt);
            } else {
                // Si todas las alternativas fallaron, ocultar el logo
                e.target.style.display = 'none';
            }
        } else {
            // Después de maxAttempts, ocultar el logo
            e.target.style.display = 'none';
        }
    };
    
    return (
        <img 
            src={logoSrc}
            alt="Agentic Logo" 
            className="w-8 h-8 rounded-lg object-contain"
            onError={handleError}
            key={logoSrc} // Forzar re-render cuando cambia la src
        />
    );
};

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
    TrendingUp,
    UserCheck,
    Shield,
    MessageSquare
};

/**
 * Sidebar lateral con navegación
 * Reemplaza el navbar horizontal anterior
 */
const Sidebar = ({ activeView, setActiveView, onLogout, isOpen, setIsOpen }) => {
    const currentUser = getCurrentUser();
    const [expandedMenus, setExpandedMenus] = useState({});
    const [navItems, setNavItems] = useState([]);
    
    // Update nav items when user or permissions change
    useEffect(() => {
        const updateNavItems = () => {
            const modules = getNavbarModules(currentUser?.role || 'regular');
            const items = modules.map(module => ({
                ...module,
                icon: iconMap[module.icon] || Layout,
                submodules: module.submodules?.map(sub => ({
                    ...sub,
                    icon: iconMap[sub.icon] || Layout
                }))
            }));
            setNavItems(items);
            console.log('[Sidebar] Updated nav items:', items.map(i => i.id));
        };
        
        updateNavItems();
        
        // Listen for custom permission update events
        const handlePermissionsUpdate = () => {
            console.log('[Sidebar] Permissions updated, refreshing nav items...');
            updateNavItems();
        };
        
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate);
        
        return () => {
            window.removeEventListener('permissionsUpdated', handlePermissionsUpdate);
        };
    }, [currentUser?.role]);
    
    const toggleSubmenu = (menuId) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    };
    
    const isSubmenuActive = (submodules) => {
        if (!submodules) return false;
        return submodules.some(sub => activeView === sub.id);
    };

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
                                <LogoImage />
                                <span className="text-white font-semibold text-sm">Dashboard</span>
                            </div>
                        ) : (
                            <LogoImage />
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
                                const hasSubmenu = item.hasSubmenu && item.submodules && item.submodules.length > 0;
                                const isSubmenuExpanded = expandedMenus[item.id] || false;
                                const isSubmenuItemActive = hasSubmenu && isSubmenuActive(item.submodules);
                                
                                return (
                                    <div key={item.id}>
                                        <button
                                            onClick={() => {
                                                if (hasSubmenu) {
                                                    toggleSubmenu(item.id);
                                                } else {
                                                    console.log('🟢 [Sidebar] Click en:', item.id, item.label);
                                                    setActiveView(item.id);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                                isActive || isSubmenuItemActive
                                                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                            }`}
                                            title={!isOpen ? item.label : ''}
                                        >
                                            <Icon size={20} className="flex-shrink-0" />
                                            {isOpen && (
                                                <>
                                                    <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
                                                    {hasSubmenu && (
                                                        <ChevronDown 
                                                            size={16} 
                                                            className={`transition-transform flex-shrink-0 ${
                                                                isSubmenuExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </button>
                                        
                                        {/* Submenu items */}
                                        {hasSubmenu && isOpen && isSubmenuExpanded && (
                                            <div className="ml-4 mt-1 space-y-1 border-l border-slate-700/50 pl-2">
                                                {item.submodules.map(subItem => {
                                                    const SubIcon = subItem.icon;
                                                    const isSubActive = activeView === subItem.id;
                                                    
                                                    return (
                                                        <button
                                                            key={subItem.id}
                                                            onClick={() => {
                                                                console.log('🟢 [Sidebar] Click en submenu:', subItem.id, subItem.label);
                                                                setActiveView(subItem.id);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                                                isSubActive
                                                                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                            }`}
                                                        >
                                                            <SubIcon size={18} className="flex-shrink-0" />
                                                            <span className="text-sm font-medium truncate">{subItem.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
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

