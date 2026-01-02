import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Q1_2026_TARGETS } from '../../config/kpiConfig';

/**
 * Gráfico de línea mostrando la evolución del Delivery Success Score
 * Muestra tendencia de las últimas 8 semanas con target de referencia
 */
const DeliveryScoreChart = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-slate-700/50 text-center">
        <p className="text-slate-400">No hay datos disponibles</p>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = trends.map((trend, index) => ({
    week: trend.week,
    deliveryScore: trend.deliveryScore,
    cycleTime: trend.cycleTime,
    deployFreq: trend.deployFreq,
    prSize: trend.prSize
  }));

  return (
    <div className="glass rounded-xl p-6 border border-slate-700/50">
      <div className="mb-4">
        <h4 className="text-lg font-bold text-white mb-1">Evolución del Delivery Success Score</h4>
        <p className="text-sm text-slate-400">Tendencia de las últimas 8 semanas</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="week" 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#94a3b8"
            domain={[0, 100]}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          
          {/* Línea de target */}
          <ReferenceLine 
            y={Q1_2026_TARGETS.DELIVERY_SUCCESS} 
            stroke="#10b981" 
            strokeDasharray="5 5"
            label={{ value: "Target Q1 2026", position: "right", fill: "#10b981", fontSize: 12 }}
          />
          
          {/* Línea principal: Delivery Success Score */}
          <Line
            type="monotone"
            dataKey="deliveryScore"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ fill: '#06b6d4', r: 5 }}
            activeDot={{ r: 7 }}
            name="Delivery Success Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DeliveryScoreChart;

