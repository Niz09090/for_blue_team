import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    const auth = sessionStorage.getItem('loghunter_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('loghunter_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('loghunter_auth');
    setAnalysisData(null);
  };

  return (
    <div className="min-h-screen bg-soc-darker">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard 
          data={analysisData} 
          setData={setAnalysisData}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
