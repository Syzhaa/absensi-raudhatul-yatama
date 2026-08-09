import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { authService } from '../services';

export default function Layout({ children, onLogout }) {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setShowLogoutModal(false);
      onLogout();
    }
  };

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
      {/* Header - Minimalist Mobile, Full Desktop */}
      <header className="bg-white border-b-3 border-gray-900 shadow-neo sticky top-0 z-50">
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          {/* Mobile: Simple Title */}
          <div className="md:hidden">
            <h1 className="font-black text-xl text-gray-800 uppercase tracking-tight">Dashboard</h1>
          </div>
          
          {/* Desktop: Logo + Full Title */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-12 h-12 bg-white border-3 border-gray-900 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-800">Absensi Digital</h1>
              <p className="font-normal text-sm text-gray-600">Raudhatul Yatama</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-3 py-2 md:px-4 bg-red-500 text-white font-bold border-3 border-gray-900 rounded-lg shadow-neo hover:clean-shadow-md transition-all active:shadow-none"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-73px)] bg-white border-r-3 border-gray-900">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 font-semibold border-3 border-gray-900 transition-all ${
                    isActive
                      ? 'bg-primary-green text-gray-800 shadow-neo'
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
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
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
                      ? 'bg-primary-green text-gray-800' 
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
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowLogoutModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white border-3 border-gray-900 rounded-xl shadow-neo p-6 max-w-sm w-full animate-fade-in">
            <h2 className="text-xl font-black text-gray-800 mb-3">Konfirmasi Logout</h2>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin keluar dari aplikasi?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 bg-white text-gray-800 font-bold border-3 border-gray-900 rounded-lg shadow-neo hover:clean-shadow-md transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold border-3 border-gray-900 rounded-lg shadow-neo hover:clean-shadow-md transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
