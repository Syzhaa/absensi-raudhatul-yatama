import { Link, useLocation } from 'react-router-dom';
import { Home, QrCode, Users, UserCog, LogOut } from 'lucide-react';
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
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/scan', label: 'Scan QR', icon: QrCode },
    { path: '/students', label: 'Siswa', icon: Users },
    { path: '/teachers', label: 'Guru', icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-neo-bg">
      {/* Header */}
      <header className="bg-white border-b-3 border-black shadow-neo sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neo-green border-3 border-black flex items-center justify-center font-bold">
              RA
            </div>
            <div>
              <h1 className="text-xl font-bold">Absensi Digital</h1>
              <p className="text-sm text-gray-600">Raudhatul Yatama</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-bold border-3 border-black shadow-neo hover:shadow-neo-lg transition-all"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b-3 border-black sticky top-[73px] z-40">
        <div className="flex">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center gap-1 py-3 border-r-3 border-black last:border-r-0 ${
                  isActive ? 'bg-neo-yellow' : 'hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-73px)] bg-white border-r-3 border-black">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 font-bold border-3 border-black ${
                    isActive
                      ? 'bg-neo-yellow shadow-neo'
                      : 'bg-white hover:bg-gray-50 shadow-neo hover:shadow-neo-lg'
                  } transition-all`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
