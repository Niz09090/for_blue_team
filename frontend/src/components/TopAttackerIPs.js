import React from 'react';

function TopAttackerIPs({ flaggedLogs }) {
  // Calculate Top 5 attacker IPs
  const getTopAttackerIPs = (logs) => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return [];

    const ipStats = {};
    
    try {
      logs.forEach(log => {
        if (!log || !log.ip || !log.attack_type) return;
        
        if (!ipStats[log.ip]) {
          ipStats[log.ip] = {
            total: 0,
            attacks: {}
          };
        }
        
        ipStats[log.ip].total += 1;
        
        if (!ipStats[log.ip].attacks[log.attack_type]) {
          ipStats[log.ip].attacks[log.attack_type] = 0;
        }
        ipStats[log.ip].attacks[log.attack_type] += 1;
      });
    } catch (error) {
      console.error('Error processing attacker IPs:', error);
      return [];
    }

    return Object.entries(ipStats)
      .map(([ip, stats]) => ({
        ip,
        total: stats.total,
        attacks: stats.attacks
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const topIPs = getTopAttackerIPs(flaggedLogs || []);

  const getAttackSummary = (attacks) => {
    if (!attacks || typeof attacks !== 'object') return '';
    const entries = Object.entries(attacks).sort((a, b) => b[1] - a[1]);
    return entries.map(([type, count]) => `${type} (${count}x)`).join(', ');
  };

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Top 5 Attacker IPs</h3>
      
      {topIPs.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No attack data available
        </div>
      ) : (
        <div className="space-y-3">
          {topIPs.map((item, index) => (
            <div
              key={item.ip}
              className="flex items-center justify-between p-3 bg-soc-darker rounded-lg border border-gray-700 hover:border-soc-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`text-2xl font-bold ${getRankColor(index + 1)} w-8`}>
                  {getRankIcon(index + 1)}
                </div>
                <div>
                  <div className="text-white font-mono font-medium">
                    {item.ip}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getAttackSummary(item.attacks)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-soc-accent font-bold text-lg">
                  {item.total}
                </div>
                <div className="text-xs text-gray-500">
                  attacks
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopAttackerIPs;
