import React from 'react';

function SecurityScore({ score, totalRequests }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-soc-success';
    if (score >= 50) return 'text-soc-warning';
    return 'text-soc-danger';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Safe';
    if (score >= 50) return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Security Health Score</h2>
        <div className="flex items-center space-x-2">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      
      <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-soc-success' : score >= 50 ? 'bg-soc-warning' : 'bg-soc-danger'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-soc-darker rounded-lg p-3">
          <p className="text-gray-400 mb-1">Total Requests</p>
          <p className="text-xl font-bold text-white">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-soc-darker rounded-lg p-3">
          <p className="text-gray-400 mb-1">Attack Attempts</p>
          <p className="text-xl font-bold text-soc-danger">{(totalRequests * (100 - score) / 100).toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}

export default SecurityScore;
