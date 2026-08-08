import { useState, useEffect } from 'react';
import { authService } from '../services';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      localStorage.setItem('auth_token', response.data.token);
      
      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-32 h-32 mb-4 p-2 bg-white clean-border rounded-full clean-shadow-sm overflow-hidden flex items-center justify-center">
            <img 
              alt="MA Raudhatul Yatama Logo" 
              className="w-full h-full object-contain" 
              src="/logo.jpg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 text-center uppercase tracking-tight">
            Absensi Digital
          </h1>
          <p className="text-gray-600 mt-2 font-bold tracking-wider text-lg">
            RAUDHATUL YATAMA
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white clean-border p-8 rounded-xl relative z-10 clean-shadow-md">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-red-300 border-2 text-red-600 rounded-lg">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-800" htmlFor="email">
                EMAIL
              </label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"></i>
                <input
                  className="input pl-12"
                  id="email"
                  name="email"
                  placeholder="Masukkan Email Admin"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-800" htmlFor="password">
                PASSWORD
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"></i>
                <input
                  className="input pl-12"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  className="h-6 w-6 border-3 border-gray-900 text-orange-600 focus:ring-0 rounded-none bg-white cursor-pointer checked:bg-primary-green"
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label className="ml-3 block font-normal text-sm text-gray-800 cursor-pointer" htmlFor="remember-me">
                  Ingat Saya
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="btn-primary w-full py-4 text-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'MEMPROSES...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
