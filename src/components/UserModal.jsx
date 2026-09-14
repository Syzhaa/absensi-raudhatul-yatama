import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

const UserModal = ({ isOpen, onClose, user, onSubmit, isSubmitting }) => {
  const currentUserLembaga = useAppStore((state) => state.userLembaga);
  const currentUserRole = useAppStore((state) => state.userRole);

  const isSuperAdmin = currentUserRole === "super_admin" || currentUserLembaga === "yayasan";

  // Role hierarchy for Attendance System:
  // Super admin -> Admin MA, Admin MTs, Admin Akademik, Guru
  // Admin MA -> Admin MA, Admin Akademik, Guru (locked to MA)
  // Admin MTs -> Admin MTs, Admin Akademik, Guru (locked to MTs)
  // Admin Akademik -> Guru
  const availableRoles = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { value: "admin_ma", label: "Admin MA", defaultLembaga: "ma" },
        { value: "admin_mts", label: "Admin MTs", defaultLembaga: "mts" },
        { value: "admin_akademik", label: "Admin Akademik", defaultLembaga: "ma" },
        { value: "guru", label: "Guru" },
      ];
    }
    if (currentUserRole === "admin_ma" || currentUserLembaga === "ma") {
      return [
        { value: "admin_ma", label: "Admin MA" },
        { value: "admin_akademik", label: "Admin Akademik" },
        { value: "guru", label: "Guru" },
      ];
    }
    if (currentUserRole === "admin_mts" || currentUserLembaga === "mts") {
      return [
        { value: "admin_mts", label: "Admin MTs" },
        { value: "admin_akademik", label: "Admin Akademik" },
        { value: "guru", label: "Guru" },
      ];
    }
    if (currentUserRole === "admin_akademik") {
      return [
        { value: "guru", label: "Guru" },
      ];
    }
    return [
      { value: "guru", label: "Guru" },
    ];
  }, [isSuperAdmin, currentUserRole, currentUserLembaga]);

  const defaultLembaga = isSuperAdmin ? "ma" : (currentUserLembaga || "ma");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "guru",
    lembaga: defaultLembaga,
    kelas: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role || "guru",
        lembaga: user.lembaga || defaultLembaga,
        kelas: user.kelas || "",
      });
    } else {
      const initialRole = availableRoles[0]?.value || "guru";
      setFormData({
        name: "",
        email: "",
        password: "",
        role: initialRole,
        lembaga: defaultLembaga,
        kelas: "",
      });
    }
  }, [user, defaultLembaga, availableRoles, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole) => {
    const matched = availableRoles.find((r) => r.value === newRole);
    let updatedLembaga = formData.lembaga;
    if (isSuperAdmin && matched?.defaultLembaga) {
      updatedLembaga = matched.defaultLembaga;
    }
    setFormData({
      ...formData,
      role: newRole,
      lembaga: updatedLembaga,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      lembaga: isSuperAdmin ? formData.lembaga : defaultLembaga,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden animate-slide-up">
        <div className="bg-gray-50 border-b-3 border-gray-900 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-gray-900">
              {user?.id ? "Edit Pengguna Absen" : "Tambah Pengguna Absen"}
            </h2>
            <p className="text-[11px] font-bold text-gray-500">
              Khusus akun sistem absensi Raudhatul Yatama
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {/* Nama */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Ahmad Zaki"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:outline-none transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Email Pengguna *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="nama@raudhatulyatama.sch.id"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-medium text-xs sm:text-sm text-gray-900 focus:outline-none transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Password {user?.id ? "(Kosongkan jika tidak diubah)" : "*"}
            </label>
            <input
              type="password"
              required={!user?.id}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={user?.id ? "••••••••" : "Minimal 8 karakter"}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-medium text-xs sm:text-sm text-gray-900 focus:outline-none transition-all"
            />
          </div>

          {/* Role Picker (Hierarchy based) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Role Pengguna Absen *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-black text-xs sm:text-sm text-gray-900 focus:outline-none cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              {isSuperAdmin
                ? "Super Admin dapat membuat akun dari level Admin ke bawah."
                : `Dibatasi sesuai hak akses Anda sebagai ${currentUserRole?.toUpperCase()}.`}
            </p>
          </div>

          {/* Lembaga Selector (Only Super Admin can change, others are locked) */}
          {isSuperAdmin ? (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
                Lembaga Sekolah *
              </label>
              <select
                value={formData.lembaga}
                onChange={(e) => setFormData({ ...formData, lembaga: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ma">Madrasah Aliyah (MA)</option>
                <option value="mts">Madrasah Tsanawiyah (MTs)</option>
                <option value="yayasan">Yayasan Raudhatul Yatama</option>
              </select>
            </div>
          ) : (
            <div className="p-2.5 bg-gray-100 border border-gray-300 rounded-xl flex items-center justify-between text-xs font-bold text-gray-700">
              <span>Lembaga Terdaftar:</span>
              <span className="font-black uppercase px-2 py-0.5 bg-white border border-gray-400 rounded-md">
                {defaultLembaga.toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 border-2 border-gray-300 rounded-xl font-black text-xs text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-green text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-base">save</span>
              )}
              <span>{user?.id ? "Simpan Perubahan" : "Buat User"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
