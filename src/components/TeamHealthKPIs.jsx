import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle, TrendingUp, Smile, AlertCircle } from 'lucide-react';
import KPICard from './KPICard';
import { mockTeamHealthKPIData } from '../data/kpiMockData';
import { getScoreLevel, getScoreColor } from '../utils/kpiCalculations';
import { Q1_2026_TARGETS } from '../config/kpiConfig';

/**
 * Componente de Team Health KPIs
 * Muestra el Team Health Score y sus métricas componentes
 */
const TeamHealthKPIs = () => {
  const [kpiData, setKpiData] = useState(mockTeamHealthKPIData);
  const [loading, setLoading] = useState(true);

  // TODO: Cargar datos reales desde API
  useEffect(() => {
    // Por ahora usamos mock data
    setLoading(false);
    setKpiData(mockTeamHealthKPIData);
  }, []);

  const healthScore = kpiData.teamHealthScore;
  const scoreLevel = getScoreLevel(healthScore);
  const scoreColor = getScoreColor(healthScore);

  // Determinar si está en target
  const isOnTarget = healthScore >= Q1_2026_TARGETS.TEAM_HEALTH;
  const isCritical = healthScore < 60;

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
              El Team Health Score está por debajo de 60. Se requiere atención al bienestar del equipo.
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
              Mide la salud y bienestar del equipo de desarrollo
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
            <div className={`text-7xl font-bold ${
              scoreColor === 'emerald' ? 'text-emerald-400' :
              scoreColor === 'blue' ? 'text-blue-400' :
              scoreColor === 'amber' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {healthScore}
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
            {scoreLevel.label === 'Elite' && 'Salud del equipo excepcional. El equipo está funcionando de manera óptima y satisfecho.'}
            {scoreLevel.label === 'Good' && 'Cumpliendo con el target. El equipo está saludable y productivo.'}
            {scoreLevel.label === 'Fair' && 'Necesita mejora. Hay oportunidades para mejorar el bienestar y la satisfacción del equipo.'}
            {scoreLevel.label === 'Poor' && 'Requiere atención urgente. Se necesitan acciones inmediatas para mejorar la salud del equipo.'}
          </p>
        </div>
      </div>

      {/* Métricas Componentes */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Métricas Componentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Sprint Completion"
            value={`${kpiData.sprintCompletion.percentage}%`}
            label={`Score: ${kpiData.sprintCompletion.score}/100`}
            icon={CheckCircle}
            trend={kpiData.sprintCompletion.percentage >= 80 ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.sprintCompletion.score)}
          />
          <KPICard
            title="Velocity"
            value={`${kpiData.velocity.averageSP} SP`}
            label={`Score: ${kpiData.velocity.score}/100`}
            icon={TrendingUp}
            trend={kpiData.velocity.trend === 'increasing' ? 'positive' : kpiData.velocity.trend === 'stable' ? 'neutral' : 'negative'}
            color={getScoreColor(kpiData.velocity.score)}
          />
          <KPICard
            title="Team Satisfaction"
            value={`${kpiData.teamSatisfaction.averageRating}/5`}
            label={`Score: ${kpiData.teamSatisfaction.score}/100`}
            icon={Smile}
            trend={kpiData.teamSatisfaction.averageRating >= 4.0 ? 'positive' : 'negative'}
            color={getScoreColor(kpiData.teamSatisfaction.score)}
          />
        </div>
      </div>

      {/* Información de métricas */}
      <div className="glass rounded-xl p-4 border border-slate-700/50">
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-300">Métricas de Salud del Equipo:</strong>
          <br />
          • <strong>Sprint Completion:</strong> Porcentaje de sprints completados exitosamente (target: &gt;80%)
          <br />
          • <strong>Velocity:</strong> Promedio de Story Points completados por sprint (target: estable o creciente)
          <br />
          • <strong>Team Satisfaction:</strong> Satisfacción promedio del equipo basada en encuestas (target: &gt;4.0/5)
        </p>
      </div>
    </div>
  );
};

export default TeamHealthKPIs;


