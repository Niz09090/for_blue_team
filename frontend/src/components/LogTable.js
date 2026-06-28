import React, { useState, useMemo } from 'react';

function LogTable({ logs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.payload && log.payload.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterType === 'all' || log.attack_type === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, filterType]);

  const attackTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.attack_type));
    return Array.from(types);
  }, [logs]);

  const getAttackTypeColor = (type) => {
    switch(type) {
      case 'SQL Injection': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'XSS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Path Traversal': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Command Injection': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'LFI/RFI': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'SSRF': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'CVE Exploit': return 'bg-red-700/20 text-red-500 border-red-700/30';
      case 'Scanner Traffic': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'Brute Force': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-white">Flagged Log Entries</h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search IP, path, or payload..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-soc-darker border border-gray-700 rounded-lg focus:outline-none focus:border-soc-accent text-white text-sm"
          />
          
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-soc-darker border border-gray-700 rounded-lg focus:outline-none focus:border-soc-accent text-white text-sm"
          >
            <option value="all">All Attack Types</option>
            {attackTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Timestamp</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">IP Address</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Attack Type</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Path</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Payload</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-soc-darker/50">
                  <td className="py-3 px-4 text-gray-300 font-mono text-xs">{log.timestamp}</td>
                  <td className="py-3 px-4 text-white font-mono">{log.ip}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAttackTypeColor(log.attack_type)}`}>
                      {log.attack_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-mono text-xs max-w-xs truncate">{log.path}</td>
                  <td className="py-3 px-4 text-soc-danger font-mono text-xs max-w-xs truncate">
                    {log.payload || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{log.status || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  {logs.length === 0 ? 'No flagged logs found' : 'No logs match your search criteria'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredLogs.length} of {logs.length} flagged entries
      </div>
    </div>
  );
}

export default LogTable;
