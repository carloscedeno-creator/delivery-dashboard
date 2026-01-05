import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Rocket, Code, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import NoDataAvailable from './NoDataAvailable';
import CycleTimeBreakdown from './CycleTimeBreakdown';
import DeliveryScoreChart from './kpis/DeliveryScoreChart';
import ComponentBreakdownChart from './kpis/ComponentBreakdownChart';
import { getScoreLevel, getScoreColor } from '../utils/kpiCalculations';
import { Q1_2026_TARGETS } from '../config/kpiConfig';
import { getDeliveryKPIData } from '../services/deliveryKPIService';

/**
 * Componente de Delivery KPIs
 * Muestra el Delivery Success Score y sus métricas componentes
 */
const DeliveryKPIs = () => {
  const [kpiData, setKpiData] = useState(null);
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
        setKpiData(null);
      } finally {
        setLoading(false);
      }
    };

    loadKPIData();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading Delivery metrics...</p>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <NoDataAvailable 
        message="No Delivery KPI Data Available"
        details="Cycle Time, Deploy Frequency, and PR Size data is not available. Ensure Jira data is synced and sprint metrics are calculated."
      />
    );
  }

  // Count available metrics
  const availableMetrics = [
    kpiData.cycleTime,
    kpiData.deployFrequency,
    kpiData.prSize
  ].filter(Boolean).length;

  // Check if we have insufficient data (missing more than 1 metric, or missing Cycle Time which has 40% weight)
  const hasInsufficientData = availableMetrics < 2 || !kpiData.cycleTime;

  const deliveryScore = hasInsufficientData ? null : kpiData.deliverySuccessScore;
  const scoreLevel = deliveryScore !== null ? getScoreLevel(deliveryScore) : { label: 'Insufficient Data' };
  const scoreColor = deliveryScore !== null ? getScoreColor(deliveryScore) : 'slate';

  // Determinar si está en target (only if we have a valid score)
  const isOnTarget = deliveryScore !== null && deliveryScore >= Q1_2026_TARGETS.DELIVERY_SUCCESS;
  const isCritical = deliveryScore !== null && deliveryScore < 60;

  return (
    <div className="space-y-6">
      {/* Alert if insufficient data */}
      {hasInsufficientData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3"
        >
          <AlertCircle className="text-amber-400" size={24} />
          <div>
            <p className="text-amber-400 font-semibold">Insufficient Data</p>
            <p className="text-slate-300 text-sm">
              Cannot calculate Delivery Success Score. Need at least 2 metrics available, including Cycle Time (40% weight).
            </p>
          </div>
        </motion.div>
      )}

      {/* Alert if at critical level */}
      {!hasInsufficientData && isCritical && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3"
        >
          <AlertCircle className="text-rose-400" size={24} />
          <div>
            <p className="text-rose-400 font-semibold">Attention Required</p>
            <p className="text-slate-300 text-sm">
              Delivery Success Score is below 60. Urgent corrective action is required.
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
              Measures the speed and efficiency of delivering value to production
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
            {hasInsufficientData ? (
              <>
                <div className="text-7xl font-bold text-slate-400">
                  N/A
                </div>
                <div className="text-slate-400 text-sm mt-1">Insufficient Data</div>
              </>
            ) : (
              <>
                <div className={`text-7xl font-bold ${
                  scoreColor === 'emerald' ? 'text-emerald-400' :
                  scoreColor === 'blue' ? 'text-blue-400' :
                  scoreColor === 'amber' ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {deliveryScore}
                </div>
                <div className="text-slate-400 text-sm mt-1">/ 100</div>
              </>
            )}
          </div>

          {/* Semáforo visual */}
          {!hasInsufficientData && (
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
          )}

          <div className="ml-auto text-right">
            <div className="text-slate-400 text-sm">Level</div>
            <div className={`text-xl font-semibold ${
              hasInsufficientData ? 'text-slate-400' :
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
          {hasInsufficientData ? (
            <p className="text-slate-300 text-sm">
              Cannot calculate Delivery Success Score. Available metrics: {availableMetrics}/3. 
              {!kpiData.cycleTime && ' Missing Cycle Time (40% weight).'} 
              {!kpiData.deployFrequency && ' Missing Deploy Frequency (30% weight).'} 
              {!kpiData.prSize && ' Missing PR Size (30% weight - requires Git integration).'}
            </p>
          ) : (
            <p className="text-slate-300 text-sm">
              {scoreLevel.label === 'Elite' && 'Exceptional speed. The team is operating at excellence levels.'}
              {scoreLevel.label === 'Good' && 'Meeting target. The team is delivering value efficiently.'}
              {scoreLevel.label === 'Fair' && 'Needs improvement. There are opportunities to optimize the delivery process.'}
              {scoreLevel.label === 'Poor' && 'Requires urgent attention. Immediate corrective actions are needed.'}
            </p>
          )}
        </div>
      </div>

      {/* Métricas Componentes */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Component Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiData.cycleTime ? (
            <KPICard
              title="Cycle Time"
              value={`${kpiData.cycleTime.hours}h`}
              label={`Score: ${kpiData.cycleTime.score}/100`}
              icon={Clock}
              trend={kpiData.cycleTime.score >= 75 ? 'positive' : 'negative'}
              color={getScoreColor(kpiData.cycleTime.score)}
            />
          ) : (
            <KPICard
              title="Cycle Time"
              value="N/A"
              label="No data available"
              icon={Clock}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.deployFrequency ? (
            <KPICard
              title="Deploy Frequency"
              value={`${kpiData.deployFrequency.deploysPerDay.toFixed(1)}/day`}
              label={`Score: ${kpiData.deployFrequency.score}/100`}
              icon={Rocket}
              trend={kpiData.deployFrequency.score >= 75 ? 'positive' : 'negative'}
              color={getScoreColor(kpiData.deployFrequency.score)}
            />
          ) : (
            <KPICard
              title="Deploy Frequency"
              value="N/A"
              label="No data available"
              icon={Rocket}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.prSize ? (
            <KPICard
              title="PR Size"
              value={`${kpiData.prSize.averageLines} lines`}
              label={`Score: ${kpiData.prSize.score}/100`}
              icon={Code}
              trend={kpiData.prSize.score >= 75 ? 'positive' : 'negative'}
              color={getScoreColor(kpiData.prSize.score)}
            />
          ) : (
            <KPICard
              title="PR Size"
              value="N/A"
              label="No data available (requires Git integration)"
              icon={Code}
              trend="neutral"
              color="slate"
            />
          )}
        </div>
      </div>

      {/* Información de pesos */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Formula:</strong> Delivery Success Score = 
          (Cycle Time × 40%) + (Deploy Frequency × 30%) + (PR Size × 30%)
        </p>
      </div>

      {/* Cycle Time Breakdown */}
      {kpiData.cycleTime && (
        <div className="mt-8">
          <CycleTimeBreakdown cycleTimeData={kpiData.cycleTime} />
        </div>
      )}

      {/* Gráficos de tendencias */}
      {kpiData.trends && kpiData.trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <DeliveryScoreChart trends={kpiData.trends} />
          <ComponentBreakdownChart trends={kpiData.trends} />
        </div>
      )}
    </div>
  );
};

export default DeliveryKPIs;

