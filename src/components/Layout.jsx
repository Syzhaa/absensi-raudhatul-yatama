import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const location = useLocation();
  const [isTestMode, setIsTestMode] = useState(() => localStorage.getItem('is_test_mode') === 'true');

  useEffect(() => {
    const checkTestMode = () => {
      setIsTestMode(localStorage.getItem('is_test_mode') === 'true');
    };

    window.addEventListener('storage', checkTestMode);
    window.addEventListener('test_mode_change', checkTestMode);
    return () => {
      window.removeEventListener('storage', checkTestMode);
      window.removeEventListener('test_mode_change', checkTestMode);
    };
  }, []);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'home' },
    { path: '/scan', label: 'Scan QR', icon: 'qr_code_scanner' },
    { path: '/students', label: 'Siswa', icon: 'group' },
    { path: '/teachers', label: 'Guru', icon: 'badge' },
    { path: '/attendance', label: 'Absensi', icon: 'calendar_month' },
    { path: '/settings', label: 'Pengaturan', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen">
      {/* Global App-Wide Mode Testing Warning Banner */}
      {isTestMode && (
        <div className="bg-amber-400 text-amber-950 border-b-2 border-gray-900 px-4 py-2 text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-sm text-center sticky top-0 z-50 animate-pulse">
          <span className="material-symbols-outlined text-base md:text-lg text-amber-950 flex-shrink-0">warning</span>
          <span>⚠️ MODE TESTING AKTIF — Data Simulasi (Data Riil Disembunyikan)</span>
        </div>
      )}
      <div className="flex flex-col md:flex-row">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 min-h-screen bg-white border-r-3 border-gray-900 flex-shrink-0">
          {/* Desktop Brand Header */}
          <div className="p-5 border-b-3 border-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-base text-gray-900 leading-tight">Absensi Digital</h1>
              <p className="font-bold text-xs text-gray-500">Raudhatul Yatama</p>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 font-bold border-3 border-gray-900 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-green text-gray-900 shadow-neo'
                      : 'bg-white text-gray-800 hover:bg-gray-50 shadow-neo hover:clean-shadow-md'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Floating Telegram Style */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
          <div className="flex">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${
                    isActive 
                      ? 'bg-primary-green text-gray-900 font-bold' 
                      : 'bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
