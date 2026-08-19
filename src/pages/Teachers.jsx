import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import TeacherForm from "../components/TeacherForm";
import TeacherCard from "../components/TeacherCard";
import CredentialsModal from "../components/CredentialsModal";
import ConfirmModal from "../components/ConfirmModal";
import StudentCardPrint from "../components/StudentCardPrint";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
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
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-6 landscape:space-y-3">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Cari nama atau NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border-2 md:border-3 border-gray-900 rounded-xl text-xs md:text-sm font-bold shadow-neo focus:ring-0 focus:outline-none"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
            search
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedTeachers.length > 0 && (
            <button
                onClick={handleBatchPrintQR}
                className="py-1 px-3 sm:px-4 bg-white text-gray-900 font-bold border-2 border-gray-900 rounded-lg hover:bg-gray-100 flex items-center justify-center shadow-sm"
                title="Cetak Kartu Massal"
              >
                <span className="material-symbols-outlined text-lg sm:text-base mr-0 sm:mr-2">
                  print
                </span>
                <span className="hidden sm:inline">
                  Cetak ({selectedTeachers.length})
                </span>
                <span className="sm:hidden">({selectedTeachers.length})</span>
            </button>
          )}

          {/* Desktop Add Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 md:border-3 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Data
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

      {/* Cards List Container */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Loading data guru...
          </div>
        ) : teachers.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data guru
          </div>
        ) : (
          paginatedTeachers.map((teacher) => (
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
          ))
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
