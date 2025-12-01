import React from 'react';
import { Layout, Box, Truck, AlertCircle } from 'lucide-react';

const Navbar = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'overall', label: 'Overall', icon: Layout },
        { id: 'product', label: 'Product Roadmap', icon: Box },
        { id: 'delivery', label: 'Delivery Roadmap', icon: Truck },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-8 py-4 flex justify-between items-center backdrop-blur-md bg-slate-900/80">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">A</div>
                <span className="text-lg font-semibold text-slate-100 tracking-tight">Antigravity</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`text-sm font-medium transition-colors flex items-center gap-2 ${activeView === item.id ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                    <AlertCircle size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                </button>
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-xs text-slate-300">CC</div>
            </div>
        </nav>
    );
};

export default Navbar;
