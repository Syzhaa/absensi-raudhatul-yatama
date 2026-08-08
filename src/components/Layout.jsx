import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services';

export default function Layout({ children, onLogout }) {
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
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
      {/* Header */}
      <header className="bg-surface border-b-3 border-outline shadow-neo sticky top-0 z-50">
        <div className="px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container border-3 border-outline flex items-center justify-center font-headline-md text-headline-md text-on-primary-container">
              RA
            </div>
            <div>
              <h1 className="font-headline-md text-xl text-on-surface">Absensi Digital</h1>
              <p className="font-body-md text-sm text-on-surface-variant">Raudhatul Yatama</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-error text-on-error font-label-lg border-3 border-outline shadow-neo hover:shadow-neo-lg transition-all active:shadow-none"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-73px)] bg-surface border-r-3 border-outline">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 font-label-lg border-3 border-outline transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-neo'
                      : 'bg-surface text-on-surface hover:bg-surface-container shadow-neo hover:shadow-neo-lg'
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
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t-3 border-outline z-50">
        <div className="flex">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center gap-1 py-3 border-r-3 border-outline last:border-r-0 transition-colors ${
                  isActive ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                <span className="text-xs font-bold text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
