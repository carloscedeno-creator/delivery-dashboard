import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Shield, 
  Heart, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import KPICard from './KPICard';
import NoDataAvailable from './NoDataAvailable';
import GanttChart from './GanttChart';
import { getOverallKPIs, getActiveSprints, getQuickAlerts, getUnifiedTimeline } from '../services/overallViewService';
import { getScoreLevel, getScoreColor } from '../utils/kpiCalculations';

/**
 * Overall View Dashboard Component
 * Combines Product and Delivery insights into a unified overview
 */
const OverallView = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [activeSprints, setActiveSprints] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    loadOverallData();
  }, []);

  const loadOverallData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [kpiData, sprintsData, alertsData, timelineDataResult] = await Promise.all([
        getOverallKPIs(),
        getActiveSprints(),
        getQuickAlerts(),
        getUnifiedTimeline()
      ]);

      setKpis(kpiData);
      setActiveSprints(sprintsData);
      setAlerts(alertsData);
      setTimelineData(timelineDataResult);
    } catch (error) {
      console.error('[OverallView] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading overall metrics...</p>
      </div>
    );
  }

  // Format KPI values
  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return Math.round(score);
  };

  const getScoreLabel = (score) => {
    if (score === null || score === undefined) return 'No data';
    const level = getScoreLevel(score);
    // getScoreLevel returns an object with 'label' property, not a string
    return level?.label || 'Unknown';
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'low_velocity':
        return TrendingUp;
      case 'closing_soon':
        return Clock;
      case 'blocked_issues':
        return AlertCircle;
      default:
        return AlertTriangle;
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-rose-500/50 bg-rose-500/10';
      case 'medium':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Overall Dashboard</h1>
          <p className="text-slate-400">
            Unified view of Product and Delivery metrics across all squads
          </p>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Delivery Success Score"
          value={formatScore(kpis?.deliveryScore)}
          label={getScoreLabel(kpis?.deliveryScore)}
          icon={Truck}
          color="blue"
          trend={kpis?.deliveryScore >= 70 ? 'positive' : kpis?.deliveryScore >= 50 ? null : 'negative'}
        />
        <KPICard
          title="Development Quality Score"
          value={formatScore(kpis?.qualityScore)}
          label={getScoreLabel(kpis?.qualityScore)}
          icon={Shield}
          color="purple"
          trend={kpis?.qualityScore >= 70 ? 'positive' : kpis?.qualityScore >= 50 ? null : 'negative'}
        />
        <KPICard
          title="Team Health Score"
          value={formatScore(kpis?.teamHealthScore)}
          label={getScoreLabel(kpis?.teamHealthScore)}
          icon={Heart}
          color="emerald"
          trend={kpis?.teamHealthScore >= 70 ? 'positive' : kpis?.teamHealthScore >= 50 ? null : 'negative'}
        />
        <KPICard
          title="Average Velocity"
          value={kpis?.averageVelocity?.value || 'N/A'}
          label={`${kpis?.averageVelocity?.sprintsCount || 0} sprints`}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Active Sprints Summary */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="text-cyan-400" size={24} />
            Active Sprints
          </h2>
          <span className="text-sm text-slate-400">
            {activeSprints.length} sprint{activeSprints.length !== 1 ? 's' : ''} in progress
          </span>
        </div>

        {activeSprints.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No active sprints found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSprints.map((sprint) => (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl p-4 ${getRiskColor(sprint.risk_level)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{sprint.sprint_name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{sprint.squad_name}</p>
                  </div>
                  {sprint.risk_level === 'high' && (
                    <AlertCircle className="text-rose-400" size={16} />
                  )}
                  {sprint.risk_level === 'medium' && (
                    <AlertTriangle className="text-amber-400" size={16} />
                  )}
                  {sprint.risk_level === 'low' && (
                    <CheckCircle2 className="text-emerald-400" size={16} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white font-medium">
                      {sprint.sp_done || 0} / {sprint.capacity_goal_sp || 0} SP
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        sprint.progress_percentage >= 80
                          ? 'bg-emerald-500'
                          : sprint.progress_percentage >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(sprint.progress_percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {sprint.days_remaining} day{sprint.days_remaining !== 1 ? 's' : ''} left
                    </span>
                    <span className="text-white font-medium">
                      {sprint.progress_percentage}%
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Timeline */}
      {timelineData.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={24} />
              Unified Timeline
            </h2>
            <span className="text-sm text-slate-400">
              {timelineData.filter(item => item.type === 'sprint').length} sprint(s) + {timelineData.filter(item => item.type === 'initiative').length} initiative(s)
            </span>
          </div>
          <div className="mt-4">
            <GanttChart data={timelineData} />
          </div>
        </div>
      )}

      {/* Quick Alerts */}
      {alerts.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertCircle className="text-amber-400" size={24} />
              Quick Alerts
            </h2>
          </div>

          <div className="space-y-4">
            {alerts.map((alert, index) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`border rounded-xl p-4 ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'high' 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{alert.message}</h3>
                      {alert.items && alert.items.length > 0 && (
                        <ul className="text-sm text-slate-300 space-y-1 mt-2">
                          {alert.items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-slate-500">•</span>
                              <span>
                                {item.sprint && `${item.sprint} (${item.squad})`}
                                {item.issue && `${item.issue}: ${item.summary?.substring(0, 50)}...`}
                                {item.daysRemaining !== undefined && `${item.daysRemaining} days`}
                                {item.progress !== undefined && `${item.progress}% progress`}
                              </span>
                            </li>
                          ))}
                          {alert.items.length > 3 && (
                            <li className="text-slate-400 text-xs">
                              +{alert.items.length - 3} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && (!kpis || (activeSprints.length === 0 && alerts.length === 0 && timelineData.length === 0)) && (
        <NoDataAvailable message="No data available for overall view" />
      )}
    </div>
  );
};

export default OverallView;
