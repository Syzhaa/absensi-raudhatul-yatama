import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import TeacherForm from "../components/TeacherForm";
import TeacherCard from "../components/TeacherCard";
import CredentialsModal from "../components/CredentialsModal";
import ConfirmModal from "../components/ConfirmModal";
import ExcelImportModal from "../components/ExcelImportModal";
import StudentCardPrint from "../components/StudentCardPrint";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";
export default function Teachers() {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
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

  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [selectedCardTeachers, setSelectedCardTeachers] = useState([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [downloadSuccessModal, setDownloadSuccessModal] = useState({
    isOpen: false,
    count: 0,
  });
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [credentialsTeacher, setCredentialsTeacher] = useState(null);
  const [formData, setFormData] = useState({
    lembaga: "MA",
    nama: "",
    nip: "",
    mata_pelajaran: "",
    nomor_hp: "",
    status: "aktif",
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["teachers", effectiveLembaga],
    queryFn: () => teacherService.getAll({ lembaga: effectiveLembaga }),
    enabled: !isLembagaLoading,
  });

  const { data: kelasData } = useQuery({
    queryKey: ["kelas", effectiveLembaga],
    queryFn: async () => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.get("/admin/kelas", {
        params: { lembaga: effectiveLembaga },
      });
      return response.data;
    },
    enabled: !isLembagaLoading,
  });

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      resetForm();
      showAlert("Berhasil", "Guru berhasil ditambahkan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      resetForm();
      showAlert("Berhasil", "Guru berhasil diupdate");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      showAlert("Berhasil", "Guru berhasil dihapus");
    },
    onError: (error) => {
      showAlert(
        "Error",
        "Gagal menghapus guru: " + (error.message || "Unknown error"),
      );
    },
  });

  const activateAccessMutation = useMutation({
    mutationFn: async (teacherId) => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.post(
        `/attendance/teachers/${teacherId}/activate-access`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["teachers"]);
      setGeneratedCredentials(data.data.credentials);
      setCredentialsTeacher(data.data.teacher);
      setShowCredentialsModal(true);
    },
    onError: (error) => {
      showAlert(
        "Error",
        error.response?.data?.message || "Gagal mengaktifkan akses guru",
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (teacherId) => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.post(
        `/attendance/teachers/${teacherId}/reset-password`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["teachers"]);
      setGeneratedCredentials(data.data.credentials);
      setCredentialsTeacher(data.data.teacher);
      setShowCredentialsModal(true);
    },
    onError: (error) => {
      showAlert(
        "Error",
        error.response?.data?.message || "Gagal mereset password guru",
      );
    },
  });

  const deactivateAccessMutation = useMutation({
    mutationFn: async (teacherId) => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.delete(
        `/attendance/teachers/${teacherId}/deactivate-access`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["teachers"]);
      setShowCredentialsModal(false);
      setGeneratedCredentials(null);
      setCredentialsTeacher(null);
      showAlert("Berhasil", "Akses login guru berhasil dinonaktifkan");
    },
    onError: (error) => {
      showAlert(
        "Error",
        error.response?.data?.message || "Gagal menonaktifkan akses guru",
      );
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTeacher(null);
    setFormData({
      lembaga: effectiveLembaga || "MA",
      nama: "",
      nip: "",
      mata_pelajaran: "",
      nomor_hp: "",
      status: "aktif",
    });
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      lembaga: teacher.lembaga,
      nama: teacher.nama,
      nip: teacher.nip || "",
      mata_pelajaran: teacher.mata_pelajaran || "",
      nomor_hp: teacher.nomor_hp || "",
      status: teacher.status,
    });
    setShowForm(true);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (photoFile) => {
    setIsUploading(true);
    try {
      let formattedLembaga = formData.lembaga;
      if (formData.lembaga) {
        const lower = formData.lembaga.toLowerCase();
        if (lower === "ma") formattedLembaga = "MA";
        else if (lower === "mts") formattedLembaga = "MTs";
        else if (lower === "yayasan") formattedLembaga = "Yayasan";
      }

      const payload = {
        ...formData,
        lembaga: formattedLembaga,
      };

      if (editingTeacher) {
        await updateMutation.mutateAsync({ id: editingTeacher.id, data: payload });
        
        if (photoFile) {
          try {
            await teacherService.uploadPhoto(editingTeacher.id, photoFile);
            queryClient.invalidateQueries(["teachers"]);
          } catch (error) {
            showAlert("Error", "Gagal upload foto: " + (error.message || "Unknown error"));
          }
        }
      } else {
        const newTeacher = await createMutation.mutateAsync(payload);
        
        if (photoFile && newTeacher?.data?.id) {
          try {
            await teacherService.uploadPhoto(newTeacher.data.id, photoFile);
            queryClient.invalidateQueries(["teachers"]);
          } catch (error) {
            showAlert("Warning", "Guru berhasil ditambahkan, tapi foto gagal diupload");
          }
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Hapus Guru",
      "Yakin ingin menghapus guru ini?",
      () => deleteMutation.mutate(id),
      true,
    );
  };

  const handleActivateAccess = (teacher) => {
    if (teacher.user_id) {
      showAlert("Peringatan", "Guru ini sudah memiliki akun aktif");
      return;
    }

    showConfirm(
      "Aktifkan Akses",
      `Aktifkan akses login untuk ${teacher.nama}?\n\nSistem akan membuat akun otomatis dengan kredensial default.`,
      () => activateAccessMutation.mutate(teacher.id),
    );
  };

  const handleResetPassword = (teacher) => {
    if (!teacher.user_id) {
      showAlert(
        "Peringatan",
        "Guru ini belum memiliki akun. Gunakan fitur Aktifkan Akses terlebih dahulu.",
      );
      return;
    }

    showConfirm(
      "Reset Password",
      `Reset password untuk ${teacher.nama}?\n\nPassword akan direset ke default dan semua sesi login aktif akan diakhiri.`,
      () => resetPasswordMutation.mutate(teacher.id),
      true,
    );
  };

  const handleViewAccess = async (teacher) => {
    try {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.get(
        `/attendance/teachers/${teacher.id}/account-info`,
      );
      setGeneratedCredentials(response.data.data.credentials);
      setCredentialsTeacher(teacher);
      setShowCredentialsModal(true);
    } catch (error) {
      showAlert(
        "Error",
        error.response?.data?.message || "Gagal membuka informasi akun guru",
      );
    }
  };

  const handleCopyCredentials = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showAlert("Berhasil", "Kredensial berhasil disalin!");
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTeachers(teachers.map((t) => t.id));
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleSelectTeacher = (id) => {
    if (selectedTeachers.includes(id)) {
      setSelectedTeachers(selectedTeachers.filter((tid) => tid !== id));
    } else {
      setSelectedTeachers([...selectedTeachers, id]);
    }
  };

  const allTeachers = data?.data || [];

  // Restore print modal state from sessionStorage on reload/refresh
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("yatama_print_teachers");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCardTeachers(parsed);
          setShowCardModal(true);
        }
      }
    } catch (e) {}
  }, []);

  // Update cached teacher details when fresh API data arrives
  useEffect(() => {
    if (showCardModal && selectedCardTeachers.length > 0 && allTeachers.length > 0) {
      const currentIds = selectedCardTeachers.map((t) => t.id);
      const updated = allTeachers.filter((t) => currentIds.includes(t.id));
      if (updated.length > 0) {
        setSelectedCardTeachers(updated);
        try {
          sessionStorage.setItem("yatama_print_teachers", JSON.stringify(updated));
        } catch (e) {}
      }
    }
  }, [allTeachers]);

  const openCardModal = (teachersList) => {
    if (!teachersList || teachersList.length === 0) return;
    setSelectedCardTeachers(teachersList);
    setShowCardModal(true);
    try {
      sessionStorage.setItem("yatama_print_teachers", JSON.stringify(teachersList));
    } catch (e) {}
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setSelectedCardTeachers([]);
    try {
      sessionStorage.removeItem("yatama_print_teachers");
    } catch (e) {}
    if (selectedCardTeachers.length > 1) {
      setSelectedTeachers([]);
    }
  };

  const handleBatchPrintQR = () => {
    if (selectedTeachers.length === 0) {
      alert("Pilih guru terlebih dahulu");
      return;
    }
    const selectedData = teachers.filter((t) =>
      selectedTeachers.includes(t.id),
    );
    openCardModal(selectedData);
  };

  const handleDownloadSingleQR = async (teacher) => {
    try {
      const qrData = teacher.uuid;
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });

      const link = document.createElement("a");
      link.download = `guru-${teacher.nama.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      showAlert("Error", "Gagal download QR: " + error.message);
    }
  };

  const teachers = allTeachers.filter((t) =>
    t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.nip && t.nip.includes(searchQuery))
  );
  const totalPages = Math.ceil(teachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeachers = teachers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Action Bar Header */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-purple-900 font-bold">badge</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Data Guru & Staf
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Total {teachers.length} Guru terdaftar • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
          </div>

          {selectedTeachers.length > 0 && (
            <button
              onClick={handleBatchPrintQR}
              className="py-2 px-3 bg-white text-gray-900 font-bold border-2 border-gray-900 rounded-xl hover:bg-gray-100 flex items-center gap-1.5 shadow-sm text-xs"
              title="Cetak Kartu Massal"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Cetak ({selectedTeachers.length})</span>
            </button>
          )}

          {/* Import Excel Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0 cursor-pointer"
            title="Import Banyak Guru dari Excel/CSV"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">upload_file</span>
            <span>Import Excel</span>
          </button>

          {/* Desktop Add Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      <TeacherForm
        isOpen={showForm}
        onClose={resetForm}
        editingTeacher={editingTeacher}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending || isUploading}
        kelasData={kelasData}
        allTeachers={teachers}
      />

      {/* Select All & Total */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={
              selectedTeachers.length === teachers.length &&
              teachers.length > 0
            }
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer"
          />
          <span>Pilih Semua Guru</span>
        </label>
        
        <div className="text-[10px] sm:text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 border-2 border-gray-900 rounded-full shadow-sm">
          Total: {teachers.length} Guru
        </div>
      </div>

      {/* Teachers Records: Responsive View (Card in Mobile, Table in Desktop) */}
      <div className="pb-4">
        {isLoading ? (
          <div>
            <div className="md:hidden space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="hidden md:block bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-900 text-white text-xs uppercase tracking-wider font-black">
                  <tr>
                    <th className="p-3.5">Nama Guru</th>
                    <th className="p-3.5">NIP</th>
                    <th className="p-3.5">Mata Pelajaran / Jabatan</th>
                    <th className="p-3.5">No. WhatsApp</th>
                    <th className="p-3.5 text-center">Status</th>
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
        ) : teachers.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data guru
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
              {paginatedTeachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  isSelected={selectedTeachers.includes(teacher.id)}
                  onSelect={handleSelectTeacher}
                  onActivateAccess={handleActivateAccess}
                  onViewAccess={handleViewAccess}
                  onDownloadQR={handleDownloadSingleQR}
                  onShowCard={(t) => openCardModal([t])}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isActivatePending={activateAccessMutation.isPending}
                  isDeletePending={deleteMutation.isPending}
                  activeDropdown={activeDropdown}
                  setActiveDropdown={setActiveDropdown}
                />
              ))}
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
                          checked={selectedTeachers.length === paginatedTeachers.length && paginatedTeachers.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">No. HP</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200 font-medium">
                    {paginatedTeachers.map((teacher) => {
                      const isSelected = selectedTeachers.includes(teacher.id);
                      return (
                        <tr
                          key={teacher.id}
                          className={`hover:bg-gray-50/80 transition-colors ${isSelected ? "bg-emerald-50/50" : ""}`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectTeacher(teacher.id)}
                              className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-black text-gray-900">
                            {teacher.nama}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-600 font-bold">
                            {teacher.nip || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-gray-800">
                            {teacher.mata_pelajaran || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-gray-700">
                            {teacher.jabatan || "-"}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                            {teacher.nomor_hp || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${teacher.status === "aktif" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                              {teacher.status || "Aktif"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openCardModal([teacher])}
                                className="p-1 hover:bg-blue-50 text-blue-700 rounded border border-gray-300 transition-colors"
                                title="Cetak Kartu"
                              >
                                <span className="material-symbols-outlined text-sm">badge</span>
                              </button>
                              <button
                                onClick={() => handleDownloadSingleQR(teacher)}
                                className="p-1 hover:bg-emerald-50 text-emerald-700 rounded border border-gray-300 transition-colors"
                                title="Unduh QR"
                              >
                                <span className="material-symbols-outlined text-sm">qr_code</span>
                              </button>
                              <button
                                onClick={() => handleEdit(teacher)}
                                className="p-1 hover:bg-amber-50 text-amber-700 rounded border border-gray-300 transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(teacher)}
                                className="p-1 hover:bg-red-50 text-red-700 rounded border border-gray-300 transition-colors"
                                title="Hapus"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
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

      {/* Pagination Controls */}
      {teachers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Tampilkan:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border-2 border-gray-400 rounded-lg px-2 py-1 font-bold text-xs md:text-sm text-gray-900 bg-transparent focus:outline-none focus:border-primary-green cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              data
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">
                chevron_left
              </span>
            </button>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="md:hidden fixed right-5 z-40 w-14 h-14 bg-primary-green text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center group portrait:bottom-24 landscape:bottom-6"
        title="Tambah Guru"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* QR/Card Modal */}
      {showCardModal && selectedCardTeachers?.length > 0 && (
        <StudentCardPrint
          students={selectedCardTeachers}
          type="teacher"
          onClose={closeCardModal}
        />
      )}

      {/* Download ZIP Success Modal */}
      {downloadSuccessModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 animate-fade-in"
            onClick={() => setDownloadSuccessModal({ isOpen: false, count: 0 })}
          />
          <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10 animate-slide-up text-center">
            <div className="w-14 h-14 bg-emerald-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <span className="material-symbols-outlined text-3xl font-black">
                folder_zip
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900">
              Download Berhasil!
            </h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Berhasil mengunduh{" "}
              <span className="font-bold text-gray-900">
                {downloadSuccessModal.count} QR Code
              </span>{" "}
              guru ke dalam berkas ZIP.
            </p>
            <button
              type="button"
              onClick={() =>
                setDownloadSuccessModal({ isOpen: false, count: 0 })
              }
              className="w-full py-3 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Credentials Modal - Show generated login credentials */}
      {showCredentialsModal && (
        <CredentialsModal
          credentials={generatedCredentials}
          onClose={() => {
            setShowCredentialsModal(false);
            setGeneratedCredentials(null);
            setCredentialsTeacher(null);
          }}
          onCopy={handleCopyCredentials}
          onResetPassword={() => handleResetPassword(credentialsTeacher)}
          onDeactivateAccess={() =>
            showConfirm(
              "Nonaktifkan Akses",
              `Nonaktifkan akses login untuk ${credentialsTeacher?.nama}? Akun login dan seluruh sesinya akan dihapus.`,
              () => deactivateAccessMutation.mutate(credentialsTeacher.id),
              true,
            )
          }
          isResetPending={resetPasswordMutation.isPending}
          isDeactivatePending={deactivateAccessMutation.isPending}
        />
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type="teachers"
          apiEndpoint="/attendance/teachers/bulk-import"
          onSuccess={() => {
            queryClient.invalidateQueries(["teachers"]);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
