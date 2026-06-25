import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    // Check for JWT token on page load
    const token = localStorage.getItem('loghunter_token');
    const userData = localStorage.getItem('loghunter_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('loghunter_token', token);
    localStorage.setItem('loghunter_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('loghunter_token');
    localStorage.removeItem('loghunter_user');
    setUser(null);
    setAnalysisData(null);
  };

  return (
    <div className="min-h-screen bg-soc-darker">
      <Dashboard 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        data={analysisData} 
        setData={setAnalysisData}
      />
    </div>
  );
}

export default App;
