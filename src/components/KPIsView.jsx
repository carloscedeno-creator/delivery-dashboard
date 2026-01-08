import React, { useState, useEffect } from 'react';
import { Truck, Shield, Heart } from 'lucide-react';
import DeliveryKPIs from './DeliveryKPIs';
import QualityKPIs from './QualityKPIs';
import TeamHealthKPIs from './TeamHealthKPIs';
import DeliveryKPIFilters from './DeliveryKPIFilters';

/**
 * Componente principal de KPIs
 * Muestra navegación por subsecciones: Delivery, Quality, Health
 * Puede recibir una prop initialTab para establecer el tab inicial
 * Los filtros son compartidos entre todos los tipos de KPIs
 */
const KPIsView = ({ initialTab = 'delivery' }) => {
  const [activeSubsection, setActiveSubsection] = useState(initialTab);
  const [filters, setFilters] = useState({
    squadId: null,
    sprintId: null,
    developerId: null,
    startDate: null,
    endDate: null
  });

  // Actualizar tab activo si initialTab cambia
  useEffect(() => {
    if (initialTab && ['delivery', 'quality', 'health'].includes(initialTab)) {
      setActiveSubsection(initialTab);
    }
  }, [initialTab]);

  const subsections = [
    { id: 'delivery', label: 'Delivery', icon: Truck, component: DeliveryKPIs },
    { id: 'quality', label: 'Quality', icon: Shield, component: QualityKPIs },
    { id: 'health', label: 'Team Health', icon: Heart, component: TeamHealthKPIs }
  ];

  const activeSubsectionData = subsections.find(s => s.id === activeSubsection);
  const ActiveComponent = activeSubsectionData?.component;

  // Log para debugging en producción
  useEffect(() => {
    console.log('[KPIsView] ✅ Component rendered', {
      activeSubsection,
      hasFilters: !!filters,
      filtersKeys: filters ? Object.keys(filters) : []
    });
  }, [activeSubsection, filters]);

  return (
    <div className="space-y-6">
      {/* Filtros compartidos para todos los KPIs */}
      {console.log('[KPIsView] 🔄 Rendering DeliveryKPIFilters component')}
      <DeliveryKPIFilters filters={filters} onFiltersChange={setFilters} />

      {/* Navegación de subsecciones */}
      <div className="flex gap-4 border-b border-slate-700/50 pb-4">
        {subsections.map((subsection) => {
          const Icon = subsection.icon;
          const isActive = activeSubsection === subsection.id;
          
          return (
            <button
              key={subsection.id}
              onClick={() => setActiveSubsection(subsection.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{subsection.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la subsección activa */}
      <div className="mt-6">
        {ActiveComponent ? (
          <ActiveComponent filters={filters} />
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-lg">
              {activeSubsectionData?.label} KPIs - Coming Soon
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Esta sección está en desarrollo
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIsView;

