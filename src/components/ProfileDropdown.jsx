import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const setSuperAdminLembaga = useAppStore((state) => state.setSuperAdminLembaga);
  const setSelectedKelas = useAppStore((state) => state.setSelectedKelas);
  const setIsTestMode = useAppStore((state) => state.setIsTestMode);

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const user = userData?.data;
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  // Click outside to close
  if (typeof window !== "undefined") {
    window.addEventListener("click", (e) => {
      const dropdown = document.getElementById("profile-dropdown");
      if (dropdown && !dropdown.contains(e.target) && isOpen) {
        setIsOpen(false);
      }
    });
  }

  const handleLogout = () => {
    api.post("/auth/logout").finally(() => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("testMode");
      setIsTestMode(false);
      setSuperAdminLembaga(null);
      setSelectedKelas(null);
      navigate("/login");
    });
  };

  return (
    <div className="relative" id="profile-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-white border-2 border-gray-900 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-primary-green to-emerald-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-inner">
          {initials || "AD"}
        </div>
        <div className="hidden md:block text-left">
          <p className="font-black text-sm text-gray-900 leading-tight">
            {user?.name || "Admin"}
          </p>
          <p className="text-xs text-gray-500 font-medium">
            {user?.role === "super_admin" ? "Yayasan" : user?.role?.replace("_", " ")}
          </p>
        </div>
        <span className="material-symbols-outlined text-gray-500 text-xl">
          keyboard_arrow_down
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border-3 border-gray-900 rounded-xl shadow-xl z-50 overflow-hidden animate-[slideDown_0.2s_ease-out]">
          {/* Profile Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary-green to-emerald-600">
            <p className="text-white font-bold text-sm">{user?.name}</p>
            <p className="text-emerald-50 text-xs font-medium">{user?.email}</p>
          </div>

          {/* Settings Link */}
          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500 text-lg">
              settings
            </span>
            <span className="font-bold text-gray-700">Pengaturan Lanjutan</span>
          </Link>

          {/* User Info Modal Trigger (New Feature) */}
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 transition-colors p-0"
            >
              <span className="material-symbols-outlined text-gray-500 text-lg">
                info
              </span>
              <span className="font-bold text-gray-700">Informasi Akun</span>
            </button>
          </div>

          {/* Test Mode Toggle (Super Admin Only) */}
          {user?.role === "super_admin" && (
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={useAppStore.getState().isTestMode}
                    onChange={(e) => useAppStore.getState().setIsTestMode(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${useAppStore.getState().isTestMode ? "bg-amber-400" : "bg-gray-300"}`}></div>
                  <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useAppStore.getState().isTestMode ? "translate-x-5" : ""}`}></div>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block text-sm">Mode Testing</span>
                  <span className="text-xs text-gray-500">
                    {useAppStore.getState().isTestMode ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-red-600 text-lg">
              logout
            </span>
            <span className="font-bold">Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
}
