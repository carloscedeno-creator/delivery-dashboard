import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle, TrendingUp, Smile, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import NoDataAvailable from './NoDataAvailable';
import { 
  getScoreLevel, 
  getScoreColor,
  calculateTeamHealthScore,
  calculateENPSScore,
  calculatePlanningAccuracyScore,
  calculateCapacityAccuracyScore
} from '../utils/kpiCalculations';
import { Q1_2026_TARGETS, TEAM_HEALTH_WEIGHTS } from '../config/kpiConfig';

/**
 * Team Health KPIs Component
 * Shows the Team Health Score and its component metrics
 * Recibe filtros como props desde KPIsView
 */
const TeamHealthKPIs = ({ filters = {} }) => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load real data from API when filters change
  useEffect(() => {
    const loadKPIData = async () => {
      try {
        setLoading(true);
        const { getTeamHealthKPIData } = await import('../services/teamHealthKPIService.js');
        const data = await getTeamHealthKPIData({ filters });
        console.log('[TeamHealthKPIs] 📥 Received KPI data:', {
          hasData: !!data,
          hasEnps: !!data?.enps,
          enpsValue: data?.enps?.value,
          enpsScore: data?.enps?.score,
          enpsObject: data?.enps,
          hasPlanningAccuracy: !!data?.planningAccuracy,
          hasCapacityAccuracy: !!data?.capacityAccuracy,
          teamHealthScore: data?.teamHealthScore
        });
        setKpiData(data);
      } catch (error) {
        console.error('[TeamHealthKPIs] Error loading KPI data:', error);
        setKpiData(null);
      } finally {
        setLoading(false);
      }
    };

    loadKPIData();
  }, [filters]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading Team Health metrics...</p>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <NoDataAvailable 
        message="No Team Health KPI Data Available"
        details="eNPS, Planning Accuracy, and Capacity Accuracy data is not available. Ensure Jira data is synced and required migrations are applied."
      />
    );
  }

  // Count available metrics
  const availableMetrics = [
    kpiData.enps,
    kpiData.planningAccuracy,
    kpiData.capacityAccuracy
  ].filter(Boolean).length;

  // Check if we have insufficient data (missing more than 1 metric, or missing eNPS which has 40% weight)
  const hasInsufficientData = availableMetrics < 2 || !kpiData.enps;

  // Calculate scores using the new functions
  // Note: enps.value can be 0, which is a valid value (not null/undefined)
  const enpsScore = kpiData.enps !== null && kpiData.enps !== undefined
    ? calculateENPSScore(kpiData.enps.value)
    : null;
  const planningAccuracyScore = kpiData.planningAccuracy
    ? calculatePlanningAccuracyScore(kpiData.planningAccuracy.percentage)
    : null;
  const capacityAccuracyScore = kpiData.capacityAccuracy
    ? calculateCapacityAccuracyScore(kpiData.capacityAccuracy.value)
    : null;
  
  // Calculate Team Health Score only if we have sufficient data
  const healthScore = hasInsufficientData 
    ? null 
    : calculateTeamHealthScore(
        enpsScore || 0,
        planningAccuracyScore || 0,
        capacityAccuracyScore || 0
      );
  
  const scoreLevel = healthScore !== null ? getScoreLevel(healthScore) : { label: 'Insufficient Data' };
  const scoreColor = healthScore !== null ? getScoreColor(healthScore) : 'slate';

  // Determinar si está en target (only if we have a valid score)
  const isOnTarget = healthScore !== null && healthScore >= Q1_2026_TARGETS.TEAM_HEALTH;
  const isCritical = healthScore !== null && healthScore < 60;

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
              Cannot calculate Team Health Score. Need at least 2 metrics available, including eNPS (40% weight).
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
              Team Health Score is below 60. Team wellbeing attention is required.
            </p>
          </div>
        </motion.div>
      )}

      {/* KPI Principal: Team Health Score */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Team Health Score</h2>
            <p className="text-slate-400 text-sm">
              Measures team wellbeing and development health
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isOnTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <span className="text-sm font-medium">
              Target: {Q1_2026_TARGETS.TEAM_HEALTH}/100
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
                  {healthScore}
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
              Cannot calculate Team Health Score. Available metrics: {availableMetrics}/3. 
              {!kpiData.enps && ' Missing eNPS (40% weight).'} 
              {!kpiData.planningAccuracy && ' Missing Planning Accuracy (30% weight).'} 
              {!kpiData.capacityAccuracy && ' Missing Capacity Accuracy (30% weight).'}
            </p>
          ) : (
            <p className="text-slate-300 text-sm">
              {scoreLevel.label === 'Elite' && 'Exceptional team health. The team is functioning optimally and satisfied.'}
              {scoreLevel.label === 'Good' && 'Meeting target. The team is healthy and productive.'}
              {scoreLevel.label === 'Fair' && 'Needs improvement. There are opportunities to improve team wellbeing and satisfaction.'}
              {scoreLevel.label === 'Poor' && 'Requires urgent attention. Immediate actions are needed to improve team health.'}
            </p>
          )}
        </div>
      </div>

      {/* Métricas Componentes */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Component Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiData.enps !== null && kpiData.enps !== undefined ? (
            <KPICard
              title={kpiData.enps.isMock ? "eNPS (Mock Data)" : "eNPS"}
              value={kpiData.enps.value.toFixed(1)}
              label={`${kpiData.enps.isMock ? '📊 Mock Data | ' : ''}Score: ${enpsScore}/100 (${(TEAM_HEALTH_WEIGHTS.ENPS * 100).toFixed(0)}%) | Promoters: ${kpiData.enps.promoters}, Passives: ${kpiData.enps.passives || 0}, Detractors: ${kpiData.enps.detractors}, Total: ${kpiData.enps.totalResponses}`}
              icon={Smile}
              trend={kpiData.enps.value >= Q1_2026_TARGETS.ENPS ? 'positive' : 'negative'}
              color={getScoreColor(enpsScore)}
            />
          ) : (
            <KPICard
              title="eNPS"
              value="N/A"
              label="No data available"
              icon={Smile}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.planningAccuracy ? (
            <KPICard
              title="Planning Accuracy"
              value={`${kpiData.planningAccuracy.percentage}%`}
              label={`Score: ${planningAccuracyScore}/100 (${(TEAM_HEALTH_WEIGHTS.PLANNING_ACCURACY * 100).toFixed(0)}%)`}
              icon={CheckCircle}
              trend={kpiData.planningAccuracy.percentage >= Q1_2026_TARGETS.PLANNING_ACCURACY.min ? 'positive' : 'negative'}
              color={getScoreColor(planningAccuracyScore)}
            />
          ) : (
            <KPICard
              title="Planning Accuracy"
              value="N/A"
              label="No data available"
              icon={CheckCircle}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.capacityAccuracy ? (
            <div>
              <KPICard
                title="Capacity Accuracy"
                value={`${(kpiData.capacityAccuracy.value * 100).toFixed(0)}%`}
                label={`Ratio: ${kpiData.capacityAccuracy.value.toFixed(2)} | Score: ${capacityAccuracyScore}/100 | Planned: ${kpiData.capacityAccuracy.plannedCapacity}h (${kpiData.capacityAccuracy.plannedSP} SP)`}
                icon={TrendingUp}
                trend={kpiData.capacityAccuracy.value >= Q1_2026_TARGETS.CAPACITY_ACCURACY.min && kpiData.capacityAccuracy.value <= Q1_2026_TARGETS.CAPACITY_ACCURACY.max ? 'positive' : 'negative'}
                color={getScoreColor(capacityAccuracyScore)}
              />
              {kpiData.capacityAccuracy.carryoverSP > 0 && (
                <div className="mt-2 glass rounded-xl p-3 border border-amber-500/30 bg-amber-500/10">
                  <p className="text-xs text-amber-400">
                    <strong>Carryover detected:</strong> {kpiData.capacityAccuracy.carryoverSP} SP ({kpiData.capacityAccuracy.carryoverCapacity}h) from previous sprint
                  </p>
                </div>
              )}
            </div>
          ) : (
            <KPICard
              title="Capacity Accuracy"
              value="N/A"
              label="No data available"
              icon={TrendingUp}
              trend="neutral"
              color="slate"
            />
          )}
        </div>
      </div>

      {/* Información de métricas */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Team Health Score Formula:</strong>
          <br />
          (eNPS × {TEAM_HEALTH_WEIGHTS.ENPS * 100}%) + 
          (Planning Accuracy × {TEAM_HEALTH_WEIGHTS.PLANNING_ACCURACY * 100}%) + 
          (Capacity Accuracy × {TEAM_HEALTH_WEIGHTS.CAPACITY_ACCURACY * 100}%)
          <br /><br />
          <strong className="text-slate-300">Component Metrics:</strong>
          <br />
          • <strong>eNPS:</strong> Employee Net Promoter Score - measures team satisfaction (target: &gt;{Q1_2026_TARGETS.ENPS})
          <br />
          • <strong>Planning Accuracy:</strong> Percentage of planned work completed (target: {Q1_2026_TARGETS.PLANNING_ACCURACY.min}-{Q1_2026_TARGETS.PLANNING_ACCURACY.max}%)
          <br />
          • <strong>Capacity Accuracy:</strong> Ratio of actual vs planned capacity based on tickets with SP in "To Do", "Blocked", or "Reopen" states at sprint start. Considers carryover from previous sprint. (target: {Q1_2026_TARGETS.CAPACITY_ACCURACY.min * 100}-{Q1_2026_TARGETS.CAPACITY_ACCURACY.max * 100}% to avoid burnout)
        </p>
      </div>
    </div>
  );
};

export default TeamHealthKPIs;


