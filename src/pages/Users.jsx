import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import UserModal from "../components/UserModal";
import PromoteModal from "../components/PromoteModal";
import ConfirmModal from "../components/ConfirmModal";

export default function Users() {
  const [showModal, setShowModal] = useState(false);
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
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", userLembaga],
    queryFn: async () => {
      const res = await api.get("/admin/users", {
        params: { per_page: 100, lembaga: userLembaga },
      });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setShowModal(false);
      setEditUser(null);
      showAlert("Berhasil", "User berhasil dibuat");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal membuat user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setShowModal(false);
      setEditUser(null);
      showAlert("Berhasil", "User berhasil diupdate");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      showAlert("Berhasil", "User berhasil dihapus");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal menghapus user"),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ student_ids, new_kelas }) =>
      api.post("/admin/students/promote", { student_ids, new_kelas }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
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
      if (userLembaga && user.lembaga !== userLembaga) return false;
      return true;
    });
  }, [users, roleFilter, searchQuery, userLembaga]);

  const canEdit = (user) => {
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
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border-3 border-gray-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-neo">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
            Manajemen User
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            {filteredUsers.length} user
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditUser(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah User
          </button>
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="px-4 py-2 bg-amber-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-lg">
                trending_up
              </span>
              Naik Kelas
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Cari nama user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm text-gray-800 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-800 focus:border-primary-green focus:bg-white focus:outline-none cursor-pointer transition-all"
        >
          <option value="all">Semua Role</option>
          <option value="admin_ma">Admin MA</option>
          <option value="admin_mts">Admin MTS</option>
          <option value="guru">Guru</option>
          <option value="siswa">Siswa</option>
        </select>
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-40">
        {isLoading ? (
          <div className="col-span-full bg-white border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Memuat data users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-gray-200 rounded-2xl p-8 text-center shadow-sm flex flex-col items-center justify-center">
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
          filteredUsers.map((user) => {
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
                {/* Checkbox for bulk selection */}
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

                {/* Role Badge */}
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

                {/* Details */}
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
                        Kelas: {user.kelas}
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

                {/* Actions */}
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
                    <div className="flex-1 text-xs text-gray-500 text-center py-1.5 border border-gray-200 rounded-lg bg-gray-50">
                      {userLembaga
                        ? `Hanya bisa edit user ${userLembaga.toUpperCase()}`
                        : "Read Only"}
                    </div>
                  )}
                </div>
              </div>
            );
          })
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
    </div>
  );
}
