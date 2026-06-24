import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#00d4ff', '#ff4757', '#ffa502', '#2ed573', '#a55eea'];

function AttackCharts({ attackCounts, attacksByTime }) {
  const pieData = Object.entries(attackCounts).map(([name, value]) => ({
    name,
    value
  }));

  const barData = Object.entries(attacksByTime)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      attacks: count
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Attack Types Pie Chart */}
      <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Attack Types Distribution</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
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

      {/* Attack Frequency Bar Chart */}
      <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Attack Frequency Over Time</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="hour" 
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid #333' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="attacks" fill="#00d4ff" name="Attacks" />
            </BarChart>
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
