import React, { useState } from 'react';
import axios from 'axios';

function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post('/api/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
        
        // Get user info
        const token = response.data.access_token;
        const userResponse = await axios.get('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        onLogin(token, userResponse.data);
        onClose();
      } else {
        // Register
        const response = await axios.post('/api/auth/register', {
          username,
          password
        });
        
        // Auto-login after registration
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const loginResponse = await axios.post('/api/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
        
        onLogin(loginResponse.data.access_token, response.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-soc-dark p-8 rounded-lg shadow-2xl w-full max-w-md border border-soc-accent/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isLogin ? 'Login' : 'Register'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              minLength={6}
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
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-400">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-soc-accent hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-soc-accent hover:underline"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
