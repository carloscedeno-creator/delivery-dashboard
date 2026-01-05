import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Component to display "No data available" message
 */
const NoDataAvailable = ({ message = 'No data available', details = null }) => {
  return (
    <div className="glass rounded-2xl p-12 border border-slate-700/50 text-center">
      <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
      <h3 className="text-xl font-semibold text-white mb-2">{message}</h3>
      {details && (
        <p className="text-slate-400 text-sm mt-2">{details}</p>
      )}
      <p className="text-slate-500 text-xs mt-4">
        Ensure data is synced from Jira and required migrations are applied.
      </p>
    </div>
  );
};

export default NoDataAvailable;

