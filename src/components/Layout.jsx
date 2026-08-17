import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useAppStore } from '../store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useEffectiveLembaga } from '../hooks/useEffectiveLembaga';
import { menuForRole } from '../auth/accessPolicy';
import ConfirmModal from './ConfirmModal';

function HeaderSelectors() {
  const superAdminLembaga = useAppStore((state) => state.superAdminLembaga);
  const setSuperAdminLembaga = useAppStore((state) => state.setSuperAdminLembaga);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const setSelectedKelas = useAppStore((state) => state.setSelectedKelas);
  const { effectiveLembaga } = useEffectiveLembaga();
  const userRole = useAppStore((state) => state.userRole);

  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    staleTime: 10 * 60 * 1000,
  });

  const { data: studentData } = useQuery({
    queryKey: ['students_for_kelas', effectiveLembaga, userRole],
    queryFn: async () => {
      const res = userRole === 'guru'
        ? await api.get('/attendance/logs/roster', { params: { lembaga: effectiveLembaga } })
        : await api.get('/attendance/students', { params: { per_page: 100, lembaga: effectiveLembaga } });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const kelasList = [...new Set(
    (userRole === 'guru' ? studentData?.data?.data || [] : studentData?.data || [])
      .map(s => s.kelas)
      .filter(Boolean)
  )].sort();

  const isSuperAdmin = userData?.data?.role === 'super_admin';
  const role = userData?.data?.role;
  const showClassFilter = ['super_admin', 'admin', 'admin_ma', 'admin_mts', 'guru'].includes(role);

  if (!showClassFilter) {
    return (
      <div key="role-label" className="flex flex-col">
        <span className="font-black text-sm md:text-base text-gray-900 leading-tight capitalize">
          {userData?.data?.role_label || 'User'}
        </span>
      </div>
    );
  }

  return (
    <div key="selectors" className="flex flex-col sm:flex-row gap-1 sm:gap-2">
      {isSuperAdmin && (
        <select
          value={superAdminLembaga || ''}
          onChange={(e) => {
            setSuperAdminLembaga(e.target.value);
            setSelectedKelas(null);
          }}
          className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-1 border-2 border-gray-900 rounded-lg bg-primary-green focus:outline-none cursor-pointer shadow-sm w-fit"
        >
          <option value="">Semua Lembaga</option>
          <option value="MA">MA</option>
          <option value="MTs">MTs</option>
        </select>
      )}
      
      <select
        value={selectedKelas || ''}
        onChange={(e) => setSelectedKelas(e.target.value || null)}
        className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-1 border-2 border-gray-200 rounded-lg bg-gray-50 focus:border-primary-green focus:outline-none cursor-pointer shadow-sm w-fit"
      >
        <option value="">Semua Kelas</option>
        {kelasList.map((kls) => (
          <option key={kls} value={kls}>Kelas {kls}</option>
        ))}
      </select>
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isTestMode = useAppStore((state) => state.isTestMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userRole = useAppStore((state) => state.userRole);
  const superAdminLembaga = useAppStore((state) => state.superAdminLembaga);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserLembaga = useAppStore((state) => state.setUserLembaga);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const allMenuItems = menuForRole(userRole);
  const menuItems = allMenuItems.filter(item => !['/settings', '/profile'].includes(item.path));

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("auth_token");
      setUserRole(null);
      setUserLembaga(null);
      navigate("/login");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen">
      {isTestMode && (
        <div className="bg-amber-400 text-amber-950 border-b-2 border-gray-900 px-4 py-2 landscape:py-0.5 text-xs md:text-sm landscape:text-[10px] font-black flex items-center justify-center gap-2 shadow-sm text-center sticky top-0 z-50 animate-pulse">
          <span className="material-symbols-outlined text-base md:text-lg landscape:text-xs text-amber-950 flex-shrink-0">warning</span>
          <span className="landscape:hidden">⚠️ MODE TESTING AKTIF — Data Simulasi</span>
          <span className="hidden landscape:inline">⚠️ MODE TESTING AKTIF</span>
        </div>
      )}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Mobile Off-canvas Sidebar */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside className="relative w-64 h-full bg-white border-l-3 border-gray-900 shadow-neo-xl flex flex-col animate-[slideInRight_0.3s_ease-out]">
              <div className="p-4 border-b-3 border-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="font-black text-sm text-gray-900 leading-tight">Menu Utama</h1>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div className="pt-2"></div>
              <nav className="p-4 space-y-3 overflow-y-auto flex-1 bg-gray-50/50">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 border-2 border-gray-900 rounded-xl transition-all ${
                        isActive ? 'bg-primary-green text-gray-900 font-black shadow-neo' : 'bg-white text-gray-700 font-bold hover:bg-gray-100'
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

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white border-r-3 border-gray-900 flex-shrink-0 z-40 overflow-y-auto">
          <div className="p-5 border-b-3 border-gray-900 flex items-center gap-3 sticky top-0 z-10">
            <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-base text-gray-900 leading-tight">Absensi Digital</h1>
              <p className="font-bold text-xs text-gray-500">Raudhatul Yatama</p>
            </div>
          </div>
          <div className="pt-2"></div>
          <nav className="p-4 space-y-2 flex-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 font-bold border-3 border-gray-900 rounded-xl transition-all ${
                    isActive ? 'bg-primary-green text-gray-900 shadow-neo' : 'bg-white text-gray-800 hover:bg-gray-50 shadow-neo'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 portrait:pb-24 landscape:pb-6 md:pb-6 min-w-0 bg-gray-50/30">
          <header className="flex bg-white border-2 md:border-3 border-gray-900 px-4 py-3 items-center justify-between mb-4 md:mb-6 shadow-neo rounded-2xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="portrait:hidden landscape:flex md:hidden p-1.5 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 items-center justify-center"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <HeaderSelectors />
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-lg md:text-xl">person</span>
              </Link>
              <Link to="/settings" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-lg md:text-xl">settings</span>
              </Link>
              <button 
                onClick={() => setIsLogoutModalOpen(true)} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg md:text-xl">logout</span>
              </button>
            </div>
          </header>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="hidden md:!hidden fixed bottom-4 left-4 right-4 z-40 portrait:block landscape:hidden">
        <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
          <div className="flex justify-center w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex-none min-w-[64px] flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${
                    isActive ? 'bg-primary-green text-gray-900 font-bold' : 'bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari aplikasi?"
        type="danger"
        confirmText="Ya, Keluar"
      />
    </div>
  );
}
