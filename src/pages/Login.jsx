import { useState } from 'react';
import { authService } from '../services';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      localStorage.setItem('auth_token', response.data.token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card text-center mb-8">
          <div className="w-20 h-20 bg-neo-green border-3 border-black mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold">RA</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Absensi Digital</h1>
          <p className="text-gray-600">Raudhatul Yatama</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Login</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-3 border-red-500 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
