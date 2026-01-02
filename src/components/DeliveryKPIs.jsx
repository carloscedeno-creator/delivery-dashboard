import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Rocket, Code, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import CycleTimeBreakdown from './CycleTimeBreakdown';
import DeliveryScoreChart from './kpis/DeliveryScoreChart';
import ComponentBreakdownChart from './kpis/ComponentBreakdownChart';
import { mockDeliveryKPIData } from '../data/kpiMockData';
import { getScoreLevel, getScoreColor } from '../utils/kpiCalculations';
import { Q1_2026_TARGETS } from '../config/kpiConfig';
import { getDeliveryKPIData } from '../services/deliveryKPIService';

/**
 * Componente de Delivery KPIs
 * Muestra el Delivery Success Score y sus métricas componentes
 */
const DeliveryKPIs = () => {
  const [kpiData, setKpiData] = useState(mockDeliveryKPIData);
  const [loading, setLoading] = useState(true);

  // Load real data from API
  useEffect(() => {
    const loadKPIData = async () => {
      try {
        setLoading(true);
        const data = await getDeliveryKPIData();
        setKpiData(data);
      } catch (error) {
        console.error('[DeliveryKPIs] Error loading KPI data:', error);
        // Fallback a mock data en caso de error
        setKpiData(mockDeliveryKPIData);
      } finally {
        setLoading(false);
      }
    };

    loadKPIData();
  }, []);

  const deliveryScore = kpiData.deliverySuccessScore;
  const scoreLevel = getScoreLevel(deliveryScore);
  const scoreColor = getScoreColor(deliveryScore);

  // Determinar si está en target
  const isOnTarget = deliveryScore >= Q1_2026_TARGETS.DELIVERY_SUCCESS;
  const isCritical = deliveryScore < 60;

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading Delivery metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta si está en nivel crítico */}
      {isCritical && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3"
        >
          <AlertCircle className="text-rose-400" size={24} />
          <div>
            <p className="text-rose-400 font-semibold">Atención Requerida</p>
            <p className="text-slate-300 text-sm">
              El Delivery Success Score está por debajo de 60. Se requiere acción correctiva urgente.
            </p>
          </div>
        </motion.div>
      )}

      {/* KPI Principal: Delivery Success Score */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Delivery Success Score</h2>
            <p className="text-slate-400 text-sm">
              Mide la velocidad y eficiencia de entrega de valor a producción
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isOnTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <span className="text-sm font-medium">
              Target: {Q1_2026_TARGETS.DELIVERY_SUCCESS}/100
            </span>
          </div>
        </div>

        {/* Score grande con semáforo */}
        <div className="flex items-center gap-8">
          <div className="relative">
            <div className={`text-7xl font-bold ${
              scoreColor === 'emerald' ? 'text-emerald-400' :
              scoreColor === 'blue' ? 'text-blue-400' :
              scoreColor === 'amber' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {deliveryScore}
            </div>
            <div className="text-slate-400 text-sm mt-1">/ 100</div>
          </div>

          {/* Semáforo visual */}
          <div className="flex gap-2">
            {['emerald', 'blue', 'amber', 'rose'].map((color) => (
              <div
                key={color}
                className={`w-4 h-4 rounded-full ${
                  scoreColor === color
                    ? color === 'emerald' ? 'bg-emerald-500' :
                      color === 'blue' ? 'bg-blue-500' :
                      color === 'amber' ? 'bg-amber-500' :
                      'bg-rose-500'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="ml-auto text-right">
            <div className="text-slate-400 text-sm">Nivel</div>
            <div className={`text-xl font-semibold ${
              scoreColor === 'emerald' ? 'text-emerald-400' :
              scoreColor === 'blue' ? 'text-blue-400' :
              scoreColor === 'amber' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {scoreLevel.label}
            </div>
          </div>
        </div>

        {/* Descripción del nivel */}
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <p className="text-slate-300 text-sm">
            {scoreLevel.label === 'Elite' && 'Velocidad excepcional. El equipo está operando en niveles de excelencia.'}
            {scoreLevel.label === 'Good' && 'Cumpliendo con el target. El equipo está entregando valor de manera eficiente.'}
            {scoreLevel.label === 'Fair' && 'Necesita mejora. Hay oportunidades para optimizar el proceso de entrega.'}
            {scoreLevel.label === 'Poor' && 'Requiere atención urgente. Se necesitan acciones correctivas inmediatas.'}
          </p>
        </div>
      </div>

      {/* Métricas Componentes */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Métricas Componentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Cycle Time"
            value={`${kpiData.cycleTime.hours}h`}
            label={`Score: ${kpiData.cycleTime.score}/100`}
            icon={Clock}
            trend={kpiData.cycleTime.score >= 75 ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.cycleTime.score)}
          />
          <KPICard
            title="Deploy Frequency"
            value={`${kpiData.deployFrequency.deploysPerDay.toFixed(1)}/día`}
            label={`Score: ${kpiData.deployFrequency.score}/100`}
            icon={Rocket}
            trend={kpiData.deployFrequency.score >= 75 ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.deployFrequency.score)}
          />
          <KPICard
            title="PR Size"
            value={`${kpiData.prSize.averageLines} líneas`}
            label={`Score: ${kpiData.prSize.score}/100`}
            icon={Code}
            trend={kpiData.prSize.score >= 75 ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.prSize.score)}
          />
        </div>
      </div>

      {/* Información de pesos */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Fórmula:</strong> Delivery Success Score = 
          (Cycle Time × 40%) + (Deploy Frequency × 30%) + (PR Size × 30%)
        </p>
      </div>

      {/* Cycle Time Breakdown */}
      <div className="mt-8">
        <CycleTimeBreakdown cycleTimeData={kpiData.cycleTime} />
      </div>

      {/* Gráficos de tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <DeliveryScoreChart trends={kpiData.trends} />
        <ComponentBreakdownChart trends={kpiData.trends} />
      </div>
    </div>
  );
};

export default DeliveryKPIs;

