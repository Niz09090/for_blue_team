import React, { useState, useEffect } from 'react';
import axios from 'axios';

function History({ onSelect, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('loghunter_token');

  useEffect(() => {
    const fetchHistory = async () => {
      const token = getToken();
      if (!token) {
        setError('Please login to view your history');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setHistory(response.data);
      } catch (err) {
        console.error('History fetch error:', err);
        console.error('Error response:', err.response);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        setError(err.response?.data?.detail || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-soc-success';
    if (score >= 50) return 'text-soc-warning';
    return 'text-soc-danger';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Submission History</h2>
        <button
          onClick={onBack}
          className="bg-soc-dark hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg border border-gray-700 transition-colors"
        >
          Back to Upload
        </button>
      </div>

      {loading ? (
        <div className="bg-soc-dark rounded-lg p-12 border border-gray-800 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-soc-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading history...</p>
        </div>
      ) : error ? (
        <div className="bg-soc-dark rounded-lg p-12 border border-gray-800 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-soc-dark rounded-lg p-12 border border-gray-800 text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-lg">No submission history yet</p>
          <p className="text-gray-500 text-sm mt-2">Upload logs to build your history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="bg-soc-dark rounded-lg p-6 border border-gray-800 hover:border-soc-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`text-3xl font-bold ${getScoreColor(item.security_score)}`}>
                    {item.security_score}%
                  </div>
                  <div>
                    <p className="text-white font-medium">Security Score</p>
                    <p className="text-gray-500 text-sm">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{item.total_requests.toLocaleString()} requests</p>
                  <p className="text-gray-500 text-sm">
                    {Object.values(item.attack_counts).reduce((a, b) => a + b, 0)} attacks detected
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(item.attack_counts).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-soc-darker rounded text-xs text-gray-300 border border-gray-700"
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
