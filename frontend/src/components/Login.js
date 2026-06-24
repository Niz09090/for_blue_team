import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Test authentication by calling health endpoint with basic auth
      const credentials = btoa(`${username}:${password}`);
      await axios.get('/api/health', {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      // Store credentials for subsequent API calls
      sessionStorage.setItem('loghunter_credentials', credentials);
      onLogin();
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-soc-darker">
      <div className="bg-soc-dark p-8 rounded-lg shadow-2xl w-full max-w-md border border-soc-accent/20">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-16 h-16 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">LogHunter</h1>
          <p className="text-gray-400">SOC Dashboard Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-soc-darker border border-gray-700 rounded-lg focus:outline-none focus:border-soc-accent text-white placeholder-gray-500"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-soc-darker border border-gray-700 rounded-lg focus:outline-none focus:border-soc-accent text-white placeholder-gray-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-soc-danger/10 border border-soc-danger text-soc-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-soc-accent hover:bg-soc-accent/80 text-soc-darker font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure access required for log analysis</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
