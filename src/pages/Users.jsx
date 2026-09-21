import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import UserModal from "../components/UserModal";
import ConfirmModal from "../components/ConfirmModal";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

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
      const params = { per_page: 150, module: "attendance" };
      if (userLembaga && userLembaga !== "yayasan") {
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
    onError: (err) =>
      showAlert("Error", err.response?.data?.message || "Gagal membuat user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setEditUser(null);
      showAlert("Berhasil", "User berhasil diupdate");
    },
    onError: (err) =>
      showAlert("Error", err.response?.data?.message || "Gagal update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUsers((prev) => prev.filter((u) => u.id !== confirmModal.targetId));
      showAlert("Berhasil", "User berhasil dihapus");
    },
    onError: (err) =>
      showAlert("Error", err.response?.data?.message || "Gagal menghapus user"),
  });

  const users = usersData?.data || [];

  const canEdit = (targetUser) => {
    if (userRole === "super_admin") return true;
    if (targetUser.role === "super_admin" || targetUser.role === "admin_yayasan")
      return false;
    const myLembaga = (userLembaga || "").toLowerCase();
    const targetLembaga = (targetUser.lembaga || "").toLowerCase();
    if (myLembaga && myLembaga !== "yayasan" && targetLembaga !== myLembaga)
      return false;
    if ((userRole === "admin_akademik" || userRole === "petugas_absen") && targetUser.role !== "guru") return false;
    return true;
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (
        searchQuery &&
        !user.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      const isSuper =
        userRole === "super_admin" ||
        (userLembaga || "").toLowerCase() === "yayasan";
      if (!isSuper && userLembaga) {
        if ((user.lembaga || "").toLowerCase() !== (userLembaga || "").toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, searchQuery, userLembaga, userRole]);

  const editableUsers = useMemo(() => {
    return filteredUsers.filter((u) => canEdit(u));
  }, [filteredUsers]);

  const handleSubmitUser = (formData) => {
    const data = { ...formData };
    if (editUser?.id) {
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal((prev) => ({ ...prev, targetId: id }));
    showConfirm(
      "Hapus Pengguna",
      `Yakin ingin menghapus akun '${name}'? Tindakan ini permanen.`,
      () => deleteMutation.mutate(id),
      true
    );
  };

  const handleBatchDelete = () => {
    if (selectedUsers.length === 0) return;
    const count = selectedUsers.length;
    showConfirm(
      "Hapus Banyak Pengguna",
      `Yakin ingin menghapus ${count} akun pengguna yang dipilih? Tindakan ini permanen dan tidak dapat dibatalkan.`,
      async () => {
        setIsDeletingBatch(true);
        try {
          await Promise.all(selectedUsers.map((u) => api.delete(`/admin/users/${u.id}`)));
          queryClient.invalidateQueries({ queryKey: ["users"] });
          setSelectedUsers([]);
          showAlert("Berhasil", `${count} akun berhasil dihapus.`);
        } catch (err) {
          showAlert(
            "Perhatian",
            err.response?.data?.message || "Sebagian akun mungkin tidak dapat dihapus karena hak akses."
          );
          queryClient.invalidateQueries({ queryKey: ["users"] });
        } finally {
          setIsDeletingBatch(false);
        }
      },
      true
    );
  };

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || isDeletingBatch;

  const getRoleBadge = (role) => {
    switch (role) {
      case "super_admin":
        return { label: "Super Admin", color: "bg-red-100 text-red-900 border-red-300" };
      case "admin_yayasan":
        return { label: "Admin Yayasan", color: "bg-amber-100 text-amber-900 border-amber-300" };
      case "admin_ma":
        return { label: "Admin MA", color: "bg-emerald-100 text-emerald-900 border-emerald-300" };
      case "admin_mts":
        return { label: "Admin MTs", color: "bg-blue-100 text-blue-900 border-blue-300" };
      case "petugas_absen":
        return { label: "Petugas Absen", color: "bg-cyan-100 text-cyan-900 border-cyan-300" };
      case "admin_akademik":
        return { label: "Petugas Absen", color: "bg-cyan-100 text-cyan-900 border-cyan-300" };
      case "guru":
        return { label: "Guru", color: "bg-purple-100 text-purple-900 border-purple-300" };
      default:
        return { label: role, color: "bg-gray-100 text-gray-800 border-gray-300" };
    }
  };

  return (
    <div className="w-full md:max-w-none max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* Header Action Card */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-emerald-900 font-bold">
              manage_accounts
            </span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Manajemen Pengguna Absen
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Total {filteredUsers.length} akun terdaftar • Khusus pengguna aplikasi absensi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedUsers.length > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={isDeletingBatch}
              className="py-2 px-3.5 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span>Hapus ({selectedUsers.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditUser(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0 cursor-pointer"
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
            placeholder="Cari nama atau email akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-900 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all shadow-xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-gray-50 border-2 border-gray-900 focus:border-gray-900 rounded-xl py-2 px-3 font-bold text-xs sm:text-sm text-gray-800 focus:outline-none cursor-pointer shadow-xs"
        >
          <option value="all">Semua Role</option>
          {(userRole === "super_admin" || userLembaga === "ma") && (
            <option value="admin_ma">Admin MA</option>
          )}
          {(userRole === "super_admin" || userLembaga === "mts") && (
            <option value="admin_mts">Admin MTs</option>
          )}
          <option value="petugas_absen">Petugas Absen</option>
          <option value="guru">Guru</option>
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
                    <th className="p-3.5 w-10 text-center">#</th>
                    <th className="p-3.5">Nama & Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Lembaga</th>
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
            <h3 className="font-bold text-base text-gray-800 mb-1">Tidak Ada User</h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Tidak ditemukan pengguna absensi dengan filter ini.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filteredUsers.map((user) => {
                const editable = canEdit(user);
                const isSelected = selectedUsers.some((su) => su.id === user.id);
                const badge = getRoleBadge(user.role);

                return (
                  <div
                    key={user.id}
                    className={`bg-white border-3 border-gray-900 rounded-2xl p-4 shadow-neo hover:clean-shadow-md transition-all relative ${
                      isSelected ? "ring-2 ring-emerald-500 bg-emerald-50/30" : ""
                    }`}
                  >
                    {editable && (
                      <div className="absolute top-4 right-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedUsers((prev) =>
                                prev.filter((su) => su.id !== user.id)
                              );
                            } else {
                              setSelectedUsers((prev) => [...prev, user]);
                            }
                          }}
                          className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 pr-6">
                      <div className="font-black text-base text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-xs font-mono text-gray-600">
                        {user.email}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 text-gray-800 border border-gray-300">
                          {user.lembaga?.toUpperCase() || "MA"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
                      {editable ? (
                        <>
                          <button
                            onClick={() => {
                              setEditUser(user);
                              setShowModal(true);
                            }}
                            className="flex-1 py-1.5 bg-gray-100 border border-gray-300 rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={deleteMutation.isPending}
                            className="flex-1 py-1.5 bg-red-50 border border-red-300 rounded-lg font-bold text-xs text-red-800 hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            <span>Hapus</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Terkunci (Hak Akses Terbatas)
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
                            selectedUsers.length === editableUsers.length &&
                            editableUsers.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(editableUsers);
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
                      <th className="py-3 px-4">Dibuat</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200 font-medium">
                    {filteredUsers.map((user) => {
                      const editable = canEdit(user);
                      const isSelected = selectedUsers.some((su) => su.id === user.id);
                      const badge = getRoleBadge(user.role);

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            isSelected ? "bg-emerald-50/50" : ""
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            {editable ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedUsers((prev) =>
                                      prev.filter((su) => su.id !== user.id)
                                    );
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
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-700">
                            {user.lembaga?.toUpperCase() || "MA"}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 text-xs">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString("id-ID")
                              : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {editable ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditUser(user);
                                      setShowModal(true);
                                    }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-gray-900 rounded-lg flex items-center justify-center shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
                                    title="Edit User"
                                  >
                                    <span className="material-symbols-outlined text-sm sm:text-base">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(user.id, user.name)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-gray-900 rounded-lg flex items-center justify-center shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
                                    title="Hapus User"
                                  >
                                    <span className="material-symbols-outlined text-sm sm:text-base">
                                      delete
                                    </span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold italic">
                                  Terkunci
                                </span>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
