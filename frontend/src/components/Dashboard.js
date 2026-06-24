import React, { useState } from 'react';
import axios from 'axios';
import SecurityScore from './SecurityScore';
import AttackCharts from './AttackCharts';
import LogTable from './LogTable';
import UploadZone from './UploadZone';

function Dashboard({ data, setData, onLogout }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const credentials = sessionStorage.getItem('loghunter_credentials');
      const response = await axios.post('/api/parse-logs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Basic ${credentials}`
        }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse logs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRawTextUpload = async (text) => {
    setIsProcessing(true);
    setError('');

    try {
      const credentials = sessionStorage.getItem('loghunter_credentials');
      const response = await axios.post('/api/parse-logs', { raw_text: text }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        }
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse logs');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-soc-darker">
      {/* Header */}
      <header className="bg-soc-dark border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h1 className="text-xl font-bold text-white">LogHunter</h1>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data ? (
          <UploadZone
            onFileUpload={handleFileUpload}
            onRawTextUpload={handleRawTextUpload}
            isProcessing={isProcessing}
            error={error}
          />
        ) : (
          <div className="space-y-6">
            {/* Security Score */}
            <SecurityScore score={data.security_score} totalRequests={data.total_requests} />

            {/* Charts */}
            <AttackCharts
              attackCounts={data.attack_counts}
              attacksByTime={data.attacks_by_time}
            />

            {/* Log Table */}
            <LogTable logs={data.flagged_logs} />

            {/* Upload New */}
            <div className="text-center">
              <button
                onClick={() => setData(null)}
                className="bg-soc-dark hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg border border-gray-700 transition-colors"
              >
                Upload New Log File
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
