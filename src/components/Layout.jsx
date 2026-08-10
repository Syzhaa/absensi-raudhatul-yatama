import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Layout({ children }) {
  const location = useLocation();
  const isTestMode = useAppStore((state) => state.isTestMode);
  const userLembaga = useAppStore((state) => state.userLembaga);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div className="bg-amber-400 text-amber-950 border-b-2 border-gray-900 px-4 py-2 landscape:py-0.5 text-xs md:text-sm landscape:text-[10px] font-black flex items-center justify-center gap-2 shadow-sm text-center sticky top-0 z-50 animate-pulse">
          <span className="material-symbols-outlined text-base md:text-lg landscape:text-xs text-amber-950 flex-shrink-0">warning</span>
          <span className="landscape:hidden">⚠️ MODE TESTING AKTIF — Data Simulasi (Data Riil Disembunyikan)</span>
          <span className="hidden landscape:inline">⚠️ MODE TESTING AKTIF</span>
        </div>
      )}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Mobile Top Header (Only visible in Landscape on Mobile) */}
        <header className="hidden md:!hidden portrait:hidden landscape:flex sticky top-0 z-30 bg-white border-b-3 border-gray-900 px-4 py-3 landscape:py-1.5 items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 landscape:w-6 landscape:h-6 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-sm landscape:text-xs text-gray-900 leading-tight">Absensi Digital</h1>
              <p className="font-bold text-[10px] text-gray-500 landscape:hidden">
                {userLembaga ? `Panel Admin ${userLembaga.toUpperCase()}` : 'Raudhatul Yatama'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 landscape:p-1 bg-gray-100 border-2 border-gray-900 rounded-lg shadow-neo text-gray-900 active:translate-y-0.5 transition-transform"
          >
            <span className="material-symbols-outlined landscape:text-lg">menu</span>
          </button>
        </header>

        {/* Mobile Off-canvas Sidebar & Overlay */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Sidebar Drawer (Right-aligned) */}
            <aside className="relative w-64 md:w-72 h-full bg-white border-l-3 border-gray-900 shadow-neo-xl flex flex-col animate-[slideInRight_0.3s_ease-out]">
              {/* Header Sidebar */}
              <div className="p-4 border-b-3 border-gray-900 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="font-black text-sm text-gray-900 leading-tight">Menu Utama</h1>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-red-100 active:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <nav className="p-4 space-y-3 overflow-y-auto flex-1 bg-gray-50/50">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 border-2 border-gray-900 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary-green text-gray-900 font-black shadow-neo'
                          : 'bg-white text-gray-700 font-bold hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white border-r-3 border-gray-900 flex-shrink-0 z-40 overflow-y-auto">
          {/* Desktop Brand Header */}
          <div className="p-5 border-b-3 border-gray-900 flex items-center gap-3 bg-white sticky top-0 z-10">
            <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-base text-gray-900 leading-tight">Absensi Digital</h1>
              <p className="font-bold text-xs text-gray-500">Raudhatul Yatama</p>
            </div>
          </div>

          <nav className="p-4 space-y-2 flex-1">
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
        <main className="flex-1 p-4 md:p-6 portrait:pb-24 landscape:pb-6 md:pb-6 min-w-0 bg-gray-50/30">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Floating Telegram Style (Only visible in Portrait on Mobile) */}
      <nav className="hidden md:!hidden fixed bottom-4 left-4 right-4 z-40 portrait:block landscape:hidden">
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
