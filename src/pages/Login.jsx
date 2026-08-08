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
          <div className="w-32 h-32 mb-4 p-2 bg-surface border-outline rounded-full shadow-neo-sm overflow-hidden flex items-center justify-center border-2">
            <img 
              alt="MA Raudhatul Yatama Logo" 
              className="w-full h-full object-contain" 
              src="/logo.jpg"
            />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface text-center uppercase">
            Absensi Digital
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 font-bold tracking-wider">
            RAUDHATUL YATAMA
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border-outline p-8 rounded-xl relative z-10 border-2 shadow-neo-sm">
          {error && (
            <div className="mb-6 p-4 bg-error-container border-2 border-error text-error rounded-lg">
              <p className="font-body-md text-body-md">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block font-label-lg text-label-lg text-on-surface" htmlFor="email">
                EMAIL
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface">
                  person
                </span>
                <input
                  className="w-full bg-surface border-3 border-outline pl-12 pr-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-input-placeholder focus:outline-none focus:ring-0 focus:border-outline focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow"
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
              <label className="block font-label-lg text-label-lg text-on-surface" htmlFor="password">
                PASSWORD
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface">
                  lock
                </span>
                <input
                  className="w-full bg-surface border-3 border-outline pl-12 pr-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-input-placeholder focus:outline-none focus:ring-0 focus:border-outline focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow"
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
                  className="h-6 w-6 border-3 border-outline text-neo-orange focus:ring-0 rounded-none bg-surface cursor-pointer checked:bg-neo-orange"
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label className="ml-3 block font-body-md text-body-md text-on-surface cursor-pointer" htmlFor="remember-me">
                  Ingat Saya
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="w-full bg-neo-orange text-on-primary font-headline-md text-headline-md py-4 border-outline rounded-lg shadow-neo-sm neo-btn transition-all duration-100 flex justify-center items-center gap-2 mt-4 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? 'MEMPROSES...' : 'LOGIN'}
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
