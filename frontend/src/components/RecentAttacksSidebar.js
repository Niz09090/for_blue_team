import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RecentAttacksSidebar({ isOpen, onToggle }) {
  const [attacks, setAttacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAttackTypeColor = (type) => {
    switch(type) {
      case 'SQL Injection': return 'border-l-purple-500 bg-purple-500/10';
      case 'XSS': return 'border-l-blue-500 bg-blue-500/10';
      case 'Path Traversal': return 'border-l-orange-500 bg-orange-500/10';
      case 'Command Injection': return 'border-l-red-500 bg-red-500/10';
      case 'LFI/RFI': return 'border-l-yellow-500 bg-yellow-500/10';
      case 'SSRF': return 'border-l-pink-500 bg-pink-500/10';
      case 'CVE Exploit': return 'border-l-red-600 bg-red-600/10';
      case 'Scanner Traffic': return 'border-l-gray-500 bg-gray-500/10';
      case 'Brute Force': return 'border-l-red-400 bg-red-400/10';
      default: return 'border-l-gray-500 bg-gray-500/10';
    }
  };

  const getAttackTypeIcon = (type) => {
    switch(type) {
      case 'SQL Injection': return '💉';
      case 'XSS': return '🎭';
      case 'Path Traversal': return '📁';
      case 'Command Injection': return '⚡';
      case 'LFI/RFI': return '🔗';
      case 'SSRF': return '🌐';
      case 'CVE Exploit': return '🚨';
      case 'Scanner Traffic': return '🔍';
      case 'Brute Force': return '🔓';
      default: return '⚠️';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const fetchRecentAttacks = async () => {
      try {
        const response = await axios.get('/api/recent-attacks');
        setAttacks(response.data);
      } catch (err) {
        console.error('Failed to fetch recent attacks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentAttacks();
    
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchRecentAttacks, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-soc-dark border border-gray-700 border-r-0 rounded-r-lg px-2 py-4 hover:bg-soc-accent/20 transition-colors z-40"
        title="Show Recent Attacks"
      >
        <svg className="w-5 h-5 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-soc-dark border-r border-gray-800 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Recent Attacks</h2>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin w-8 h-8 border-2 border-soc-accent border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading attacks...</p>
          </div>
        ) : attacks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No recent attacks</p>
          </div>
        ) : (
          attacks.map((attack, index) => (
            <div
              key={index}
              className={`border-l-4 p-3 rounded-r ${getAttackTypeColor(attack.attack_type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getAttackTypeIcon(attack.attack_type)}</span>
                  <span className="text-sm font-medium text-white">{attack.attack_type}</span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(attack.created_at)}</span>
              </div>
              
              {attack.ip && (
                <div className="text-xs text-gray-400 mb-1">
                  <span className="text-gray-500">IP:</span> {attack.ip}
                </div>
              )}
              
              {attack.payload && (
                <div className="text-xs text-soc-danger font-mono truncate bg-black/20 p-1 rounded">
                  {attack.payload}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Live feed • Updates every 30s
        </div>
      </div>
    </div>
  );
}

export default RecentAttacksSidebar;
