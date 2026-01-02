import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Code, Users, Rocket, AlertCircle } from 'lucide-react';
import { CYCLE_TIME_PHASES, ALERT_CONDITIONS } from '../config/kpiConfig';

/**
 * Componente que muestra el breakdown del Cycle Time en sus 4 fases
 * Basado en el documento Delivery OKRS Plan
 */
const CycleTimeBreakdown = ({ cycleTimeData }) => {
  if (!cycleTimeData || !cycleTimeData.breakdown) {
    return null;
  }

  const { breakdown, hours } = cycleTimeData;
  const phases = [
    {
      id: 'coding',
      label: 'Coding Time',
      icon: Code,
      value: breakdown.codingTime,
      target: CYCLE_TIME_PHASES.CODING_TIME.target,
      alert: CYCLE_TIME_PHASES.CODING_TIME.alert,
      description: 'Tiempo escribiendo código',
      color: 'amber'
    },
    {
      id: 'pickup',
      label: 'Pickup Time',
      icon: Users,
      value: breakdown.pickupTime,
      target: CYCLE_TIME_PHASES.PICKUP_TIME.target,
      alert: CYCLE_TIME_PHASES.PICKUP_TIME.alert,
      description: 'Tiempo esperando revisión',
      color: 'rose'
    },
    {
      id: 'review',
      label: 'Review Time',
      icon: Users,
      value: breakdown.reviewTime,
      target: CYCLE_TIME_PHASES.REVIEW_TIME.target,
      alert: CYCLE_TIME_PHASES.REVIEW_TIME.alert,
      description: 'Tiempo de discusión y aprobación',
      color: 'blue'
    },
    {
      id: 'deploy',
      label: 'Deploy Time',
      icon: Rocket,
      value: breakdown.deployTime,
      target: CYCLE_TIME_PHASES.DEPLOY_TIME.target,
      alert: CYCLE_TIME_PHASES.DEPLOY_TIME.alert,
      description: 'Merge → Disponible en producción',
      color: 'emerald'
    }
  ];

  // Determinar estado de cada fase
  const getPhaseStatus = (phase) => {
    if (phase.value <= phase.target) {
      return { status: 'good', color: 'emerald' };
    } else if (phase.value <= phase.alert) {
      return { status: 'warning', color: 'amber' };
    } else {
      return { status: 'critical', color: 'rose' };
    }
  };

  // Calcular porcentaje del total para visualización
  const totalHours = phases.reduce((sum, phase) => sum + phase.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Cycle Time Breakdown</h3>
          <p className="text-slate-400 text-sm">
            Total: <span className="text-white font-semibold">{hours.toFixed(1)}h</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={20} />
          <span className="text-sm">4 Fases del Ciclo</span>
        </div>
      </div>

      {/* Diagrama de flujo visual */}
      <div className="glass rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const status = getPhaseStatus(phase);
            const percentage = (phase.value / totalHours) * 100;
            const isLast = index === phases.length - 1;

            return (
              <React.Fragment key={phase.id}>
                <div className="flex flex-col items-center min-w-[120px]">
                  <div className={`p-4 rounded-xl mb-3 ${
                    status.status === 'good' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                    status.status === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' :
                    'bg-rose-500/20 border border-rose-500/30'
                  }`}>
                    <Icon className={
                      status.status === 'good' ? 'text-emerald-400' :
                      status.status === 'warning' ? 'text-amber-400' :
                      'text-rose-400'
                    } size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">{phase.label}</p>
                    <p className={`text-lg font-bold ${
                      status.status === 'good' ? 'text-emerald-400' :
                      status.status === 'warning' ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {phase.value.toFixed(1)}h
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Target: {phase.target}h
                    </p>
                    {phase.value > phase.alert && (
                      <div className="flex items-center gap-1 mt-1 text-rose-400 text-xs">
                        <AlertCircle size={12} />
                        <span>Alerta</span>
                      </div>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-slate-700 to-slate-700 mt-8 min-w-[40px]">
                    <div className="h-full bg-gradient-to-r from-cyan-500/50 to-blue-500/50"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Barras de progreso detalladas */}
      <div className="space-y-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const status = getPhaseStatus(phase);
          const percentage = Math.min((phase.value / phase.alert) * 100, 100);

          return (
            <div key={phase.id} className="glass rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Icon className={
                    status.status === 'good' ? 'text-emerald-400' :
                    status.status === 'warning' ? 'text-amber-400' :
                    'text-rose-400'
                  } size={20} />
                  <div>
                    <p className="text-sm font-medium text-white">{phase.label}</p>
                    <p className="text-xs text-slate-400">{phase.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    status.status === 'good' ? 'text-emerald-400' :
                    status.status === 'warning' ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>
                    {phase.value.toFixed(1)}h
                  </p>
                  <p className="text-xs text-slate-400">
                    Target: {phase.target}h
                  </p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                  style={{ left: `${(phase.target / phase.alert) * 100}%` }}
                >
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-slate-400">
                    Target
                  </div>
                </div>

                {/* Progress bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${
                    status.status === 'good' ? 'bg-emerald-500' :
                    status.status === 'warning' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                />
              </div>

              {/* Alertas específicas */}
              {phase.value > phase.alert && (
                <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-rose-400 mt-0.5" size={16} />
                    <div className="text-xs text-rose-300">
                      {phase.id === 'coding' && 'PR demasiado grande. Máximo recomendado: 200 líneas por PR.'}
                      {phase.id === 'pickup' && 'Problema de colaboración. Implementar alertas Slack + revisores dedicados.'}
                      {phase.id === 'review' && 'PRs muy complejos o pocos revisores. Simplificar PRs o aumentar revisores.'}
                      {phase.id === 'deploy' && 'Pipeline lento o problemas CI/CD. Revisar y optimizar pipeline.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen de acciones correctivas */}
      {phases.some(p => p.value > p.alert) && (
        <div className="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/10">
          <h4 className="text-sm font-semibold text-amber-400 mb-2">Acciones Correctivas Sugeridas</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            {phases.filter(p => p.value > p.alert).map(phase => (
              <li key={phase.id} className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>
                  <strong>{phase.label}:</strong> {phase.value.toFixed(1)}h excede el límite de {phase.alert}h
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CycleTimeBreakdown;

