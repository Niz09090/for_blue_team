import React, { useState } from 'react';
import axios from 'axios';
import SecurityScore from './SecurityScore';
import AttackCharts from './AttackCharts';
import LogTable from './LogTable';
import UploadZone from './UploadZone';
import AuthModal from './AuthModal';
import History from './History';
import RecentAttacksSidebar from './RecentAttacksSidebar';
import TopAttackerIPs from './TopAttackerIPs';

function Dashboard({ user, onLogin, onLogout, data, setData }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'history'
  const [showSidebar, setShowSidebar] = useState(false);

  const getToken = () => localStorage.getItem('loghunter_token');

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'Content-Type': 'multipart/form-data',
    };
    
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await axios.post('/api/parse-logs', formData, { headers });
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

    const headers = {
      'Content-Type': 'application/json',
    };
    
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await axios.post('/api/parse-logs', { raw_text: text }, { headers });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse logs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectHistory = (historyItem) => {
    setData(historyItem);
    setActiveTab('upload');
  };

  return (
    <div className="min-h-screen bg-soc-darker">
      {/* Recent Attacks Sidebar */}
      <RecentAttacksSidebar 
        isOpen={showSidebar} 
        onToggle={() => setShowSidebar(!showSidebar)} 
      />

      {/* Header */}
      <header className={`bg-soc-dark border-b border-gray-800 transition-all ${showSidebar ? 'ml-80' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h1 className="text-xl font-bold text-white">LogHunter</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`px-3 py-1 rounded transition-colors ${
                  showSidebar 
                    ? 'bg-soc-accent text-soc-darker' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cyber Threat News
              </button>
              {user ? (
                <>
                  <span className="text-gray-300">{user.username}</span>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTab === 'history' 
                        ? 'bg-soc-accent text-soc-darker' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    My History
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-soc-accent hover:bg-soc-accent/80 text-soc-darker font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={onLogin}
        />
      )}

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all ${showSidebar ? 'ml-80' : ''}`}>
        {activeTab === 'history' && user ? (
          <History
            onSelect={handleSelectHistory}
            onBack={() => setActiveTab('upload')}
          />
        ) : !data ? (
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
              flaggedLogs={data.flagged_logs}
            />

            {/* Top Attacker IPs */}
            <TopAttackerIPs flaggedLogs={data.flagged_logs} />

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
