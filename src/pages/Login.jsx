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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <main className="w-full max-w-md md:max-w-4xl lg:max-w-5xl transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Branding Section (Centered on Mobile, Split Left Hero on Desktop) */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col items-center md:items-start text-center md:text-left mb-2 md:mb-0">
            <div className="w-28 h-28 md:w-36 md:h-36 mb-4 md:mb-6 p-2 bg-white clean-border rounded-full clean-shadow-sm overflow-hidden flex items-center justify-center">
              <img 
                alt="MA Raudhatul Yatama Logo" 
                className="w-full h-full object-contain" 
                src="/logo.jpg"
              />
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-gray-800 uppercase tracking-tight">
              Absensi Digital
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2 font-bold tracking-wider text-base md:text-xl lg:text-2xl">
              RAUDHATUL YATAMA
            </p>
            <p className="hidden md:block text-gray-600 mt-4 text-sm md:text-base leading-relaxed max-w-lg">
              Selamat Datang di Portal Presensi Digital. Silakan masuk dengan akun admin Anda untuk mengelola kehadiran siswa, guru, dan pemindaian QR Code.
            </p>

            {/* Desktop Feature Badges */}
            <div className="hidden md:flex flex-wrap gap-2.5 mt-6">
              <span className="px-3.5 py-1.5 bg-white clean-border text-xs font-bold text-gray-800 rounded-md clean-shadow-sm flex items-center gap-2">
                ⚡ Presensi Cepat
              </span>
              <span className="px-3.5 py-1.5 bg-white clean-border text-xs font-bold text-gray-800 rounded-md clean-shadow-sm flex items-center gap-2">
                📱 Scan QR Code
              </span>
              <span className="px-3.5 py-1.5 bg-white clean-border text-xs font-bold text-gray-800 rounded-md clean-shadow-sm flex items-center gap-2">
                📊 Real-Time Report
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="md:col-span-6 lg:col-span-5 bg-white clean-border p-6 md:p-8 rounded-xl relative z-10 clean-shadow-md">
            <div className="hidden md:block mb-6">
              <h2 className="text-xl font-bold text-gray-800">Login Admin</h2>
              <p className="text-xs text-gray-500 mt-1">Masukkan email dan kata sandi Anda</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-red-300 border-2 text-red-600 rounded-lg text-sm">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block font-bold text-gray-800 text-xs md:text-sm uppercase tracking-wider" htmlFor="email">
                  EMAIL
                </label>
                <div className="relative w-full">
                  <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                  <input
                    className="input w-full pl-10 pr-3 py-2.5 text-sm md:text-base"
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
                <label className="block font-bold text-gray-800 text-xs md:text-sm uppercase tracking-wider" htmlFor="password">
                  PASSWORD
                </label>
                <div className="relative w-full">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                  <input
                    className="input w-full pl-10 pr-3 py-2.5 text-sm md:text-base"
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
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    className="h-5 w-5 border-2 border-gray-900 text-primary-green focus:ring-0 rounded-none bg-white cursor-pointer checked:bg-primary-green"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="ml-2.5 block font-medium text-sm text-gray-800 cursor-pointer select-none" htmlFor="remember-me">
                    Ingat Saya
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                className="btn-primary w-full py-3.5 text-base md:text-lg font-bold tracking-wide mt-2"
                type="submit"
                disabled={loading}
              >
                {loading ? 'MEMPROSES...' : 'LOGIN'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
