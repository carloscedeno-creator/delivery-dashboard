import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Gráfico de barras mostrando el breakdown de las métricas componentes
 * Muestra Cycle Time, Deploy Frequency y PR Size en un solo gráfico
 */
const ComponentBreakdownChart = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-slate-700/50 text-center">
        <p className="text-slate-400">No hay datos disponibles</p>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = trends.map((trend) => ({
    week: trend.week,
    'Cycle Time': trend.cycleTime,
    'Deploy Frequency': trend.deployFreq,
    'PR Size': trend.prSize
  }));

  return (
    <div className="glass rounded-xl p-6 border border-slate-700/50">
      <div className="mb-4">
        <h4 className="text-lg font-bold text-white mb-1">Breakdown de Métricas Componentes</h4>
        <p className="text-sm text-slate-400">Evolución de Cycle Time, Deploy Frequency y PR Size</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          />
          
          <Bar dataKey="Cycle Time" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Deploy Frequency" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="PR Size" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComponentBreakdownChart;

