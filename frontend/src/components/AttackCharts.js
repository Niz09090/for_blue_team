import React from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#00d4ff', '#ff4757', '#ffa502', '#2ed573', '#a55eea',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#dfe6e9', '#6c5ce7', '#fd79a8', '#00b894', '#e17055',
  '#74b9ff', '#a29bfe', '#fab1a0', '#81ecec', '#55efc4'
];

function AttackCharts({ attackCounts, attacksByTime, flaggedLogs }) {
  const pieData = Object.entries(attackCounts || {}).map(([name, value]) => ({
    name,
    value
  }));

  // Process timeline data with 5-minute granularity
  const processTimelineData = (logs) => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return [];

    const timeBuckets = {};
    
    try {
      logs.forEach(log => {
        if (!log || !log.timestamp) return;
        
        // Fix Apache/Nginx timestamp format: "28/Jun/2026:10:05:12 +0000" -> "28/Jun/2026 10:05:12 +0000"
        let timestamp = log.timestamp;
        if (typeof timestamp === 'string' && timestamp.includes(':')) {
          // Replace the first colon (after the year) with a space
          const firstColonIndex = timestamp.indexOf(':');
          if (firstColonIndex > 0) {
            timestamp = timestamp.substring(0, firstColonIndex) + ' ' + timestamp.substring(firstColonIndex + 1);
          }
        }
        
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) return;
        
        const minutes = Math.floor(date.getMinutes() / 5) * 5;
        date.setMinutes(minutes, 0, 0);
        const timeKey = date.toISOString();
        
        if (!timeBuckets[timeKey]) {
          timeBuckets[timeKey] = {
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total: 0,
            attacks: {}
          };
        }
        
        timeBuckets[timeKey].total += 1;
        
        if (log.attack_type) {
          if (!timeBuckets[timeKey].attacks[log.attack_type]) {
            timeBuckets[timeKey].attacks[log.attack_type] = 0;
          }
          timeBuckets[timeKey].attacks[log.attack_type] += 1;
        }
      });
    } catch (error) {
      console.error('Error processing timeline data:', error);
      return [];
    }

    return Object.entries(timeBuckets)
      .map(([key, data]) => ({
        time: data.time,
        attacks: data.total,
        breakdown: data.attacks
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const timelineData = processTimelineData(flaggedLogs || []);

  // Custom tooltip for timeline chart
  const TimelineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const breakdownEntries = Object.entries(data.breakdown || {});
      
      return (
        <div className="bg-soc-dark border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          <p className="text-soc-accent text-sm mb-2">Total: {data.attacks}</p>
          {breakdownEntries.length > 0 && (
            <div className="text-xs text-gray-400 space-y-1">
              {breakdownEntries.map(([type, count]) => (
                <p key={type}>{type}: {count}</p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Attack Types Pie Chart */}
      <div className="bg-soc-dark rounded-lg p-8 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Attack Types Distribution</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ left: 80, right: 20, top: 20, bottom: 20 }}>
              <Pie
                data={pieData}
                cx="55%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={55}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid #333' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No attacks detected
          </div>
        )}
      </div>

      {/* Attack Timeline Area Chart */}
      <div className="bg-soc-dark rounded-lg p-6 border border-gray-800 lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-4">Attack Timeline (5-min intervals)</h3>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4757" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ff4757" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="time" 
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<TimelineTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="attacks" 
                stroke="#ff4757" 
                fillOpacity={1} 
                fill="url(#colorAttacks)"
                name="Attacks"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No time-based data available
          </div>
        )}
      </div>
    </div>
  );
}

export default AttackCharts;
