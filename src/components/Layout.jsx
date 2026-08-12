import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import ProfileDropdown from "./ProfileDropdown";

function LembagaSelector() {
  const superAdminLembaga = useAppStore((state) => state.superAdminLembaga);
  const setSuperAdminLembaga = useAppStore(
    (state) => state.setSuperAdminLembaga,
  );
  const setSelectedKelas = useAppStore((state) => state.setSelectedKelas);

  // Check if user is Super Admin
  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isSuperAdmin = userData?.data?.role === "super_admin";

  if (!isSuperAdmin) return null;

  const handleLembagaChange = (e) => {
    setSuperAdminLembaga(e.target.value);
    setSelectedKelas(null);
  };

  return (
    <div className="px-4 pb-3 border-b-2 border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        Lembaga (Super Admin)
      </p>
      <select
        value={superAdminLembaga}
        onChange={handleLembagaChange}
        className="w-full px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-gray-900 rounded-xl font-black text-sm text-gray-900 focus:border-purple-500 focus:outline-none cursor-pointer transition-all shadow-sm"
      >
        <option value="MA">🎓 MA (Madrasah Aliyah)</option>
        <option value="MTs">📚 MTs (Madrasah Tsanawiyah)</option>
      </select>
    </div>
  );
}

function KelasSelector() {
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const setSelectedKelas = useAppStore((state) => state.setSelectedKelas);
  const { effectiveLembaga } = useEffectiveLembaga();

  // Get kelas from students list (already auth-protected)
  const { data: studentData } = useQuery({
    queryKey: ["students_for_kelas", effectiveLembaga],
    queryFn: async () => {
      const res = await api.get("/attendance/students", {
        params: { per_page: 100, lembaga: effectiveLembaga },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Extract unique kelas from students
  const kelasList = [
    ...new Set((studentData?.data || []).map((s) => s.kelas).filter(Boolean)),
  ].sort();

  return (
    <div className="px-4 pb-3 border-b-2 border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        Filter Kelas
      </p>
      <select
        value={selectedKelas || ""}
        onChange={(e) => setSelectedKelas(e.target.value || null)}
        className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-800 focus:border-primary-green focus:outline-none cursor-pointer transition-all"
      >
        <option value="">Semua Kelas</option>
        {kelasList.map((kls) => (
          <option key={kls} value={kls}>
            Kelas {kls}
          </option>
        ))}
      </select>

    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const isTestMode = useAppStore((state) => state.isTestMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const baseMenuItems = [
    { path: "/", label: "Dashboard", icon: "home" },
    { path: "/scan", label: "Scan QR", icon: "qr_code_scanner" },
    { path: "/students", label: "Siswa", icon: "group" },
    { path: "/teachers", label: "Guru", icon: "badge" },
    { path: "/attendance", label: "Absensi", icon: "calendar_month" },
  ];

  // Check if user is Super Admin for menu access
  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const isSuperAdmin = userData?.data?.role === "super_admin";
  const isGuru = userData?.data?.role === "guru";

  let menuItems = baseMenuItems;
  if (isSuperAdmin) {
    menuItems = [
      ...baseMenuItems,
      { path: "/users", label: "Users", icon: "manage_accounts" },
    ];
  } else if (isGuru) {
    menuItems = baseMenuItems.filter((item) =>
      ["/", "/attendance"].includes(item.path),
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-amber-400 text-amber-950 border-b-2 border-gray-900 px-4 py-2 text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-sm text-center sticky top-0 z-50">
          <span className="material-symbols-outlined text-base md:text-lg text-amber-950">
            warning
          </span>
          <span>⚠️ MODE TESTING AKTIF — Data Simulasi</span>
        </div>
      )}

      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-white border-b-3 border-gray-900 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Left: Hamburger (Mobile/Tablet) + Logo (Tablet Center) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-2xl text-gray-900">
                menu
              </span>
            </button>
            
            {/* Logo - Hidden on desktop (shown in sidebar), centered on tablet */}
            <div className="md:hidden flex items-center gap-3">
              <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-black text-sm text-gray-900 leading-tight">
                  Raudhatul Yatama
                </h1>
              </div>
            </div>
          </div>

          {/* Right: Profile Dropdown */}
          <ProfileDropdown />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Mobile/Tablet Off-canvas Sidebar */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside className="relative w-64 h-full bg-white border-r-3 border-gray-900 shadow-xl flex flex-col animate-[slideInLeft_0.3s_ease-out]">
              <div className="p-4 border-b-3 border-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                      src="/logo.jpg"
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h1 className="font-black text-sm text-gray-900 leading-tight">
                    Menu Utama
                  </h1>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>
              <div className="pt-3">
                <LembagaSelector />
                <KelasSelector />
              </div>
              <nav className="p-4 space-y-2 overflow-y-auto flex-1 bg-gray-50/50">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 border-2 border-gray-900 rounded-xl transition-all ${
                        isActive
                          ? "bg-primary-green text-gray-900 font-black shadow-neo"
                          : "bg-white text-gray-700 font-bold hover:bg-gray-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-64px)] sticky top-[64px] bg-white border-r-3 border-gray-900 flex-shrink-0 overflow-y-auto">
          <div className="p-5 border-b-3 border-gray-900 flex items-center gap-3 sticky top-0 bg-white z-10">
            <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-base text-gray-900 leading-tight">
                Absensi Digital
              </h1>
              <p className="font-bold text-xs text-gray-500">
                Raudhatul Yatama
              </p>
            </div>
          </div>
          <div className="pt-3">
            <LembagaSelector />
            <KelasSelector />
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
                      ? "bg-primary-green text-gray-900 shadow-neo"
                      : "bg-white text-gray-800 hover:bg-gray-50 shadow-neo"
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 min-w-0 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
