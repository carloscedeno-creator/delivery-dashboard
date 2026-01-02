import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Target, Bug, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import { mockQualityKPIData } from '../data/kpiMockData';
import { getScoreLevel, getScoreColor } from '../utils/kpiCalculations';
import { Q1_2026_TARGETS } from '../config/kpiConfig';

/**
 * Componente de Quality KPIs
 * Muestra el Development Quality Score y sus métricas componentes
 */
const QualityKPIs = () => {
  const [kpiData, setKpiData] = useState(mockQualityKPIData);
  const [loading, setLoading] = useState(true);

  // TODO: Cargar datos reales desde API
  useEffect(() => {
    // Por ahora usamos mock data
    setLoading(false);
    setKpiData(mockQualityKPIData);
  }, []);

  const qualityScore = kpiData.developmentQualityScore;
  const scoreLevel = getScoreLevel(qualityScore);
  const scoreColor = getScoreColor(qualityScore);

  // Determinar si está en target
  const isOnTarget = qualityScore >= Q1_2026_TARGETS.DEVELOPMENT_QUALITY;
  const isCritical = qualityScore < 60;

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
              El Development Quality Score está por debajo de 60. Se requiere acción correctiva urgente.
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
              Mide la calidad del desarrollo y la estabilidad de las entregas
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

        {/* Score grande con semáforo */}
        <div className="flex items-center gap-8">
          <div className="relative">
            <div className={`text-7xl font-bold ${
              scoreColor === 'emerald' ? 'text-emerald-400' :
              scoreColor === 'blue' ? 'text-blue-400' :
              scoreColor === 'amber' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {qualityScore}
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
            {scoreLevel.label === 'Elite' && 'Calidad excepcional. El equipo está entregando código de alta calidad con mínimos errores.'}
            {scoreLevel.label === 'Good' && 'Cumpliendo con el target. El equipo mantiene buenos estándares de calidad.'}
            {scoreLevel.label === 'Fair' && 'Necesita mejora. Hay oportunidades para mejorar la calidad del código y reducir errores.'}
            {scoreLevel.label === 'Poor' && 'Requiere atención urgente. Se necesitan acciones correctivas inmediatas para mejorar la calidad.'}
          </p>
        </div>
      </div>

      {/* Métricas Componentes */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Métricas Componentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Change Failure Rate"
            value={`${kpiData.changeFailureRate.percentage}%`}
            label={`${kpiData.changeFailureRate.failedDeploys} fallos / ${kpiData.changeFailureRate.totalDeploys} deploys | Score: ${kpiData.changeFailureRate.score}/100`}
            icon={AlertTriangle}
            trend={kpiData.changeFailureRate.percentage <= Q1_2026_TARGETS.CHANGE_FAILURE_RATE ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.changeFailureRate.score)}
          />
          <KPICard
            title="Planning Accuracy"
            value={`${kpiData.planningAccuracy.percentage}%`}
            label={`${kpiData.planningAccuracy.completedSP} SP / ${kpiData.planningAccuracy.plannedSP} planificados | Score: ${kpiData.planningAccuracy.score}/100`}
            icon={Target}
            trend={kpiData.planningAccuracy.percentage >= Q1_2026_TARGETS.PLANNING_ACCURACY.min ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.planningAccuracy.score)}
          />
          <KPICard
            title="Net Bug Flow"
            value={kpiData.netBugFlow.value.toFixed(1)}
            label={`${kpiData.netBugFlow.bugsResolved} resueltos / ${kpiData.netBugFlow.bugsCreated} creados | Score: ${kpiData.netBugFlow.score}/100`}
            icon={Bug}
            trend={kpiData.netBugFlow.value >= Q1_2026_TARGETS.NET_BUG_FLOW ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.netBugFlow.score)}
          />
        </div>
      </div>

      {/* Información de métricas */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Métricas de Calidad:</strong>
          <br />
          • <strong>Change Failure Rate:</strong> Porcentaje de deploys que fallan en producción (target: &lt;{Q1_2026_TARGETS.CHANGE_FAILURE_RATE}%)
          <br />
          • <strong>Planning Accuracy:</strong> Porcentaje de SP completados vs planificados (target: {Q1_2026_TARGETS.PLANNING_ACCURACY.min}-{Q1_2026_TARGETS.PLANNING_ACCURACY.max}%)
          <br />
          • <strong>Net Bug Flow:</strong> Ratio de bugs resueltos vs creados (target: &gt;{Q1_2026_TARGETS.NET_BUG_FLOW})
        </p>
      </div>
    </div>
  );
};

export default QualityKPIs;

