import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";

const ROLES = [
  { value: "admin_ma", label: "Admin MA" },
  { value: "admin_mts", label: "Admin MTS" },
  { value: "guru", label: "Guru" },
  { value: "siswa", label: "Siswa" },
];

const UserModal = ({ isOpen, onClose, user, onSubmit, isSubmitting }) => {
  const currentUserLembaga = useAppStore((state) => state.userLembaga);
  const currentUserRole = useAppStore((state) => state.userRole);

  const [formData, setFormData] = useState(() => {
    if (user) return user;
    
    // Default form data based on current user's lembaga
    return {
      name: "",
      email: "",
      password: "",
      role: "guru",
      lembaga: (currentUserLembaga && currentUserLembaga !== "yayasan") ? currentUserLembaga : "ma",
      kelas: "",
    };
  });

  React.useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "guru",
        lembaga: (currentUserLembaga && currentUserLembaga !== "yayasan") ? currentUserLembaga : "ma",
        kelas: "",
      });
    }
  }, [user, currentUserLembaga]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden">
        <div className="bg-gray-50 border-b-3 border-gray-900 p-4 flex items-center justify-between">
          <h2 className="font-black text-lg text-gray-900">
            {user?.id ? "Edit User" : "Tambah User"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Nama
            </label>
            <input
              type="text"
              required
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-sm focus:border-primary-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-sm focus:border-primary-green focus:outline-none"
            />
          </div>
          {!user?.id && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Password
              </label>
              <input
                type="password"
                required={!user?.id}
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-sm focus:border-primary-green focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Role
            </label>
            <select
              required
              value={formData.role || "guru"}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-primary-green focus:outline-none"
            >
              {ROLES.filter((r) => {
                if (currentUserLembaga === "yayasan") return true;
                if (currentUserLembaga === "ma") return r.value !== "admin_mts";
                if (currentUserLembaga === "mts") return r.value !== "admin_ma";
                return true;
              }).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Lembaga
            </label>
            <select
              required
              disabled={currentUserLembaga !== "yayasan"}
              value={formData.lembaga || "ma"}
              onChange={(e) =>
                setFormData({ ...formData, lembaga: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-primary-green focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="ma">MA</option>
              <option value="mts">MTS</option>
            </select>
          </div>
          {formData.role === "guru" && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Kelas (opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 10, 11, 12"
                value={formData.kelas || ""}
                onChange={(e) =>
                  setFormData({ ...formData, kelas: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-sm focus:border-primary-green focus:outline-none"
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
