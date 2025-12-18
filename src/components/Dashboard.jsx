import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { projectData } from '../data';
import KPICard from './KPICard';
import GanttChart from './GanttChart';
import AllocationChart from './AllocationChart';
import { LayoutGrid, List, Calendar, Users, Activity } from 'lucide-react';

const Dashboard = () => {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Calculate aggregate metrics
    const metrics = useMemo(() => {
        const totalInitiatives = projectData.length;
        const avgSPI = projectData.reduce((acc, curr) => acc + curr.spi, 0) / totalInitiatives;
        const totalAllocation = projectData.reduce((acc, curr) => acc + curr.allocation, 0);
        const criticalItems = projectData.filter(i => i.spi < 0.8 || i.status < 20).length;

        return { totalInitiatives, avgSPI, totalAllocation, criticalItems };
    }, []);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Project Delivery Hub
                    </h1>
                    <p className="text-muted-foreground mt-2">Real-time insights across all squads</p>
                </div>
                <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg backdrop-blur-sm border border-white/10">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Schedule Performance"
                    value={metrics.avgSPI.toFixed(2)}
                    label="avg. SPI!"
                    icon={Activity}
                    trend={metrics.avgSPI >= 0.9 ? 'positive' : 'negative'}
                    color="blue"
                />
                <KPICard
                    title="Resource Load"
                    value={metrics.totalAllocation.toFixed(1)}
                    label="Total FTEs"
                    icon={Users}
                    color="purple"
                />
                <KPICard
                    title="Active Initiatives"
                    value={metrics.totalInitiatives}
                    label="In Progress"
                    icon={Calendar}
                    color="emerald"
                />
                <KPICard
                    title="Critical Items"
                    value={metrics.criticalItems}
                    label="Needs Attention"
                    icon={Activity}
                    trend="negative"
                    color="rose"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gantt Chart Section - Takes up 2 columns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Calendar className="text-blue-400" size={20} />
                            Timeline & Delivery
                        </h2>
                    </div>
                    <GanttChart data={projectData} />
                </motion.div>

                {/* Allocation Chart Section - Takes up 1 column */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Users className="text-purple-400" size={20} />
                            Team Allocation
                        </h2>
                    </div>
                    <AllocationChart data={projectData} />
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
