import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import UserModal from "../components/UserModal";
import PromoteModal from "../components/PromoteModal";
import ConfirmModal from "../components/ConfirmModal";
import { useKelasFormat } from "../hooks/useKelasFormat";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const { formatKelas } = useKelasFormat();
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm",
    onConfirm: null,
  });

  const showAlert = (title, message) =>
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type: "alert",
      onConfirm: null,
    });

  const showConfirm = (title, message, onConfirm, isDanger = false) =>
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type: isDanger ? "danger" : "confirm",
      onConfirm,
    });

  const userLembaga = useAppStore((state) => state.userLembaga);
  const userRole = useAppStore((state) => state.userRole);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", userLembaga, userRole],
    queryFn: async () => {
      // Super admin dengan lembaga yayasan jangan kirim parameter lembaga
      const params = { per_page: 100 };
      if (userLembaga && userLembaga !== 'yayasan') {
        params.lembaga = userLembaga;
      }
      const res = await api.get("/admin/users", { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setEditUser(null);
      showAlert("Berhasil", "User berhasil dibuat");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal membuat user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setEditUser(null);
      showAlert("Berhasil", "User berhasil diupdate");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showAlert("Berhasil", "User berhasil dihapus");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal menghapus user"),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ student_ids, new_kelas }) =>
      api.post("/admin/students/promote", { student_ids, new_kelas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowPromoteModal(false);
      setSelectedUsers([]);
      showAlert("Berhasil", "Siswa berhasil dipromosikan");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal promosi kelas"),
  });

  const users = usersData?.data || [];
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (
        searchQuery &&
        !user.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      // Super admin yayasan lihat semua lembaga, jangan filter
      if (userLembaga && userLembaga !== 'yayasan' && user.lembaga !== userLembaga) return false;
      return true;
    });
  }, [users, roleFilter, searchQuery, userLembaga]);

  const canEdit = (user) => {
    // Super admin yayasan bisa edit semua user
    if (userLembaga === 'yayasan') return true;
    // Admin MA hanya bisa edit MA
    if (userLembaga === "ma" && user.lembaga !== "ma") return false;
    // Admin MTS hanya bisa edit MTS
    if (userLembaga === "mts" && user.lembaga !== "mts") return false;
    return true;
  };

  const handleSubmitUser = (formData) => {
    const data = { ...formData };
    if (!data.kelas) delete data.kelas;
    if (data.role !== "guru") delete data.kelas;

    if (editUser?.id) {
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Hapus User",
      "Yakin ingin menghapus user ini?",
      () => deleteMutation.mutate(id),
      true
    );
  };

  const handlePromoteSubmit = (newKelas) => {
    const studentIds = selectedUsers.map((u) => u.id);
    promoteMutation.mutate({ student_ids: studentIds, new_kelas: newKelas });
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    promoteMutation.isPending;

  return (
    <div className="w-full md:max-w-none max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* Header Action Card */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-emerald-900 font-bold">manage_accounts</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Manajemen Pengguna
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Total {filteredUsers.length} akun terdaftar • Kelola akun admin, guru, & siswa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="py-2 px-3 bg-amber-400 hover:bg-amber-500 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <span className="material-symbols-outlined text-base">trending_up</span>
              <span>Naik Kelas ({selectedUsers.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditUser(null);
              setShowModal(true);
            }}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tambah User</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3 sm:p-3.5 shadow-neo flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Cari nama atau email user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl py-1.5 px-3 font-bold text-xs text-gray-800 focus:outline-none cursor-pointer"
        >
          <option value="all">Semua Role</option>
          <option value="admin_ma">Admin MA</option>
          <option value="admin_mts">Admin MTS</option>
          <option value="guru">Guru</option>
          <option value="siswa">Siswa</option>
        </select>
      </div>

      {/* User Records: Responsive View (Card in Mobile, Table in Desktop) */}
      <div className="pb-40">
        {isLoading ? (
          <div>
            <div className="md:hidden space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="hidden md:block bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 text-xs uppercase tracking-wider font-black">
                  <tr>
                    <th className="p-3.5">Nama & Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Lembaga</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">Dibuat</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-gray-400">
                person_off
              </span>
            </div>
            <h3 className="font-bold text-base text-gray-800 mb-1">
              Tidak Ada User
            </h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Tidak ditemukan user dengan filter ini.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filteredUsers.map((user) => {
                const editable = canEdit(user);
                const isSelected = selectedUsers.some((su) => su.id === user.id);
                const roleColor =
                  user.role === "admin_ma"
                    ? "bg-red-100 text-red-900 border-red-300"
                    : user.role === "admin_mts"
                      ? "bg-blue-100 text-blue-900 border-blue-300"
                      : user.role === "guru"
                        ? "bg-purple-100 text-purple-900 border-purple-300"
                        : "bg-green-100 text-green-900 border-green-300";

                return (
                  <div
                    key={user.id}
                    className={`bg-white border-3 border-gray-900 rounded-2xl p-4 shadow-neo hover:clean-shadow-md transition-all relative ${
                      isSelected ? "ring-2 ring-amber-400" : ""
                    }`}
                  >
                    {user.role === "siswa" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedUsers((prev) =>
                              prev.filter((su) => su.id !== user.id),
                            );
                          } else {
                            setSelectedUsers((prev) => [...prev, user]);
                          }
                        }}
                        className="absolute top-3 right-3 w-4 h-4 cursor-pointer"
                      />
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-gray-100 border-2 border-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-xl text-gray-900">
                          person
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base text-gray-900 truncate leading-snug">
                          {user.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded-md border ${roleColor}`}
                      >
                        {user.role === "admin_ma"
                          ? "Admin MA"
                          : user.role === "admin_mts"
                            ? "Admin MTS"
                            : user.role === "guru"
                              ? "Guru"
                              : "Siswa"}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-600 text-sm">
                          school
                        </span>
                        <span className="text-xs font-bold text-gray-700">
                          Lembaga: {user.lembaga?.toUpperCase() || "MA"}
                        </span>
                      </div>
                      {user.kelas && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-600 text-sm">
                            class
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            Kelas: {formatKelas(user.kelas)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-600 text-sm">
                          calendar_month
                        </span>
                        <span className="text-xs text-gray-500">
                          Dibuat:{" "}
                          {new Date(user.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      {editable ? (
                        <>
                          <button
                            onClick={() => {
                              setEditUser(user);
                              setShowModal(true);
                            }}
                            className="flex-1 py-1.5 bg-gray-100 border border-gray-300 rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">
                              edit
                            </span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deleteMutation.isPending}
                            className="flex-1 py-1.5 bg-red-50 border border-red-300 rounded-lg font-bold text-xs text-red-800 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">
                              delete
                            </span>
                            Hapus
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Tidak dapat diedit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Modern Compact Table */}
            <div className="hidden md:block bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 uppercase text-[11px] font-black tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.length > 0 &&
                            selectedUsers.length === filteredUsers.filter((u) => u.role === "siswa").length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(filteredUsers.filter((u) => u.role === "siswa"));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Nama User</th>
                      <th className="py-3 px-4">Email / Akun</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-3 text-center">Lembaga</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Dibuat</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200 font-medium">
                    {filteredUsers.map((user) => {
                      const editable = canEdit(user);
                      const isSelected = selectedUsers.some((su) => su.id === user.id);
                      const roleColor =
                        user.role === "admin_ma"
                          ? "bg-red-100 text-red-900 border-red-300"
                          : user.role === "admin_mts"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : user.role === "guru"
                              ? "bg-purple-100 text-purple-900 border-purple-300"
                              : "bg-green-100 text-green-900 border-green-300";

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-gray-50/80 transition-colors ${isSelected ? "bg-emerald-50/50" : ""}`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            {user.role === "siswa" ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedUsers((prev) => prev.filter((su) => su.id !== user.id));
                                  } else {
                                    setSelectedUsers((prev) => [...prev, user]);
                                  }
                                }}
                                className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-black text-gray-900">
                            {user.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                            {user.email}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${roleColor}`}>
                              {user.role === "admin_ma"
                                ? "Admin MA"
                                : user.role === "admin_mts"
                                  ? "Admin MTS"
                                  : user.role === "guru"
                                    ? "Guru"
                                    : "Siswa"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-700">
                            {user.lembaga?.toUpperCase() || "MA"}
                          </td>
                          <td className="py-2.5 px-4 text-gray-800 font-bold">
                            {user.kelas ? formatKelas(user.kelas) : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-gray-500">
                            {new Date(user.created_at).toLocaleDateString("id-ID")}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {editable ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditUser(user);
                                      setShowModal(true);
                                    }}
                                    className="p-1 hover:bg-amber-50 text-amber-700 rounded border border-gray-300 transition-colors"
                                    title="Edit"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    disabled={deleteMutation.isPending}
                                    className="p-1 hover:bg-red-50 text-red-700 rounded border border-gray-300 transition-colors"
                                    title="Hapus"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">Terkunci</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Selected Info */}
      {selectedUsers.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 bg-amber-100 border-3 border-gray-900 rounded-2xl p-3 shadow-neo z-40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">
                groups
              </span>
              <span className="font-bold text-sm text-amber-900">
                {selectedUsers.length} siswa terpilih untuk naik kelas
              </span>
            </div>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1 bg-amber-200 text-amber-900 font-bold text-xs border-2 border-amber-900 rounded-lg shadow-sm hover:bg-amber-300"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setEditUser(null);
          setShowModal(true);
        }}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary-green text-gray-900 rounded-full border-3 border-gray-900 shadow-neo flex items-center justify-center z-40 active:translate-y-1 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
      </button>

      {/* Modals */}
      <UserModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditUser(null);
        }}
        user={editUser}
        onSubmit={handleSubmitUser}
        isSubmitting={isSubmitting}
      />
      <PromoteModal
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        selectedUsers={selectedUsers}
        onSubmit={handlePromoteSubmit}
        isSubmitting={isSubmitting}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
