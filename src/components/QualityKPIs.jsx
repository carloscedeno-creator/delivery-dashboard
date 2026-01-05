import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Target, Bug, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import NoDataAvailable from './NoDataAvailable';
import { 
  getScoreLevel, 
  getScoreColor,
  calculateDevelopmentQualityScore,
  calculateChangeFailureRateScore,
  calculateNetBugFlowScore,
  calculateReworkRateScore
} from '../utils/kpiCalculations';
import { Q1_2026_TARGETS, DEVELOPMENT_QUALITY_WEIGHTS } from '../config/kpiConfig';

/**
 * Componente de Quality KPIs
 * Shows the Development Quality Score and its component metrics
 */
const QualityKPIs = () => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load real data from API
  useEffect(() => {
    const loadKPIData = async () => {
      try {
        setLoading(true);
        const { getQualityKPIData } = await import('../services/qualityKPIService');
        const data = await getQualityKPIData();
        setKpiData(data);
      } catch (error) {
        console.error('[QualityKPIs] Error loading KPI data:', error);
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
        <p className="text-slate-400 text-lg">Loading Quality metrics...</p>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <NoDataAvailable 
        message="No Quality KPI Data Available"
        details="Change Failure Rate, Net Bug Flow, and Rework Rate data is not available. Ensure Jira data is synced and required migrations are applied."
      />
    );
  }

  // Count available metrics
  const availableMetrics = [
    kpiData.changeFailureRate,
    kpiData.netBugFlow,
    kpiData.reworkRate
  ].filter(Boolean).length;

  // Check if we have insufficient data (missing more than 1 metric, or missing Change Failure Rate which has 50% weight)
  const hasInsufficientData = availableMetrics < 2 || !kpiData.changeFailureRate;

  // Calculate scores using the new functions
  const changeFailureRateScore = kpiData.changeFailureRate 
    ? calculateChangeFailureRateScore(kpiData.changeFailureRate.percentage)
    : null;
  const netBugFlowScore = kpiData.netBugFlow
    ? calculateNetBugFlowScore(kpiData.netBugFlow.value)
    : null;
  const reworkRateScore = kpiData.reworkRate
    ? calculateReworkRateScore(kpiData.reworkRate.percentage)
    : null;
  
  // Calculate Development Quality Score only if we have sufficient data
  const qualityScore = hasInsufficientData
    ? null
    : calculateDevelopmentQualityScore(
        changeFailureRateScore || 0,
        netBugFlowScore || 0,
        reworkRateScore || 0
      );
  
  const scoreLevel = qualityScore !== null ? getScoreLevel(qualityScore) : { label: 'Insufficient Data' };
  const scoreColor = qualityScore !== null ? getScoreColor(qualityScore) : 'slate';

  // Determine if it's on target (only if we have a valid score)
  const isOnTarget = qualityScore !== null && qualityScore >= Q1_2026_TARGETS.DEVELOPMENT_QUALITY;
  const isCritical = qualityScore !== null && qualityScore < 60;

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
              Cannot calculate Development Quality Score. Need at least 2 metrics available, including Change Failure Rate (50% weight).
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
              Development Quality Score is below 60. Urgent corrective action required.
            </p>
          </div>
        </motion.div>
      )}

      {/* KPI Principal: Development Quality Score */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Development Quality Score</h2>
            <p className="text-slate-400 text-sm">
              Measures development quality and delivery stability
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isOnTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <span className="text-sm font-medium">
              Target: {Q1_2026_TARGETS.DEVELOPMENT_QUALITY}/100
            </span>
          </div>
        </div>

        {/* Large score with traffic light */}
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
                  {qualityScore}
                </div>
                <div className="text-slate-400 text-sm mt-1">/ 100</div>
              </>
            )}
          </div>

          {/* Visual traffic light */}
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

        {/* Level description */}
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          {hasInsufficientData ? (
            <p className="text-slate-300 text-sm">
              Cannot calculate Development Quality Score. Available metrics: {availableMetrics}/3. 
              {!kpiData.changeFailureRate && ' Missing Change Failure Rate (50% weight).'} 
              {!kpiData.netBugFlow && ' Missing Net Bug Flow (30% weight).'} 
              {!kpiData.reworkRate && ' Missing Rework Rate (20% weight).'}
            </p>
          ) : (
            <p className="text-slate-300 text-sm">
              {scoreLevel.label === 'Elite' && 'Exceptional quality. The team is delivering high-quality code with minimal errors.'}
              {scoreLevel.label === 'Good' && 'Meeting target. The team maintains good quality standards.'}
              {scoreLevel.label === 'Fair' && 'Needs improvement. There are opportunities to improve code quality and reduce errors.'}
              {scoreLevel.label === 'Poor' && 'Requires urgent attention. Immediate corrective actions are needed to improve quality.'}
            </p>
          )}
        </div>
      </div>

      {/* Component Metrics */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Component Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiData.changeFailureRate ? (
            <KPICard
              title="Change Failure Rate"
              value={`${kpiData.changeFailureRate.percentage}%`}
              label={`${kpiData.changeFailureRate.failedDeploys} failures / ${kpiData.changeFailureRate.totalDeploys} deploys | Score: ${changeFailureRateScore}/100 (${(DEVELOPMENT_QUALITY_WEIGHTS.CHANGE_FAILURE_RATE * 100).toFixed(0)}%)`}
              icon={AlertTriangle}
              trend={kpiData.changeFailureRate.percentage <= Q1_2026_TARGETS.CHANGE_FAILURE_RATE ? 'positive' : 'negative'}
              color={getScoreColor(changeFailureRateScore)}
            />
          ) : (
            <KPICard
              title="Change Failure Rate"
              value="N/A"
              label="No data available"
              icon={AlertTriangle}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.netBugFlow ? (
            <KPICard
              title="Net Bug Flow"
              value={kpiData.netBugFlow.value.toFixed(2)}
              label={`${kpiData.netBugFlow.bugsResolved} resolved / ${kpiData.netBugFlow.bugsCreated} created | Score: ${netBugFlowScore}/100 (${(DEVELOPMENT_QUALITY_WEIGHTS.NET_BUG_FLOW * 100).toFixed(0)}%)`}
              icon={Bug}
              trend={kpiData.netBugFlow.value >= Q1_2026_TARGETS.NET_BUG_FLOW ? 'positive' : 'negative'}
              color={getScoreColor(netBugFlowScore)}
            />
          ) : (
            <KPICard
              title="Net Bug Flow"
              value="N/A"
              label="No data available"
              icon={Bug}
              trend="neutral"
              color="slate"
            />
          )}
          {kpiData.reworkRate ? (
            <KPICard
              title="Rework Rate"
              value={`${kpiData.reworkRate.percentage}%`}
              label={`Score: ${reworkRateScore}/100 (${(DEVELOPMENT_QUALITY_WEIGHTS.REWORK_RATE * 100).toFixed(0)}%)`}
              icon={Shield}
              trend={kpiData.reworkRate.percentage <= Q1_2026_TARGETS.REWORK_RATE ? 'positive' : 'negative'}
              color={getScoreColor(reworkRateScore)}
            />
          ) : (
            <KPICard
              title="Rework Rate"
              value="N/A"
              label="No data available"
              icon={Shield}
              trend="neutral"
              color="slate"
            />
          )}
        </div>
      </div>

      {/* Información de métricas */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Development Quality Score Formula:</strong>
          <br />
          (Change Failure Rate × {DEVELOPMENT_QUALITY_WEIGHTS.CHANGE_FAILURE_RATE * 100}%) + 
          (Net Bug Flow × {DEVELOPMENT_QUALITY_WEIGHTS.NET_BUG_FLOW * 100}%) + 
          (Rework Rate × {DEVELOPMENT_QUALITY_WEIGHTS.REWORK_RATE * 100}%)
          <br /><br />
          <strong className="text-slate-300">Component Metrics:</strong>
          <br />
          • <strong>Change Failure Rate:</strong> Percentage of deploys that fail in production (target: &lt;{Q1_2026_TARGETS.CHANGE_FAILURE_RATE}%)
          <br />
          • <strong>Net Bug Flow:</strong> Ratio of bugs resolved vs bugs created (target: ≥{Q1_2026_TARGETS.NET_BUG_FLOW})
          <br />
          • <strong>Rework Rate:</strong> Percentage of work that needs to be redone (target: &lt;{Q1_2026_TARGETS.REWORK_RATE}%)
        </p>
      </div>
    </div>
  );
};

export default QualityKPIs;

