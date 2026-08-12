import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import StudentForm from "../components/StudentForm";
import StudentCard from "../components/StudentCard";
import PromoteClassModal from "../components/PromoteClassModal";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
export default function Students() {
  const { effectiveLembaga } = useEffectiveLembaga();
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [downloadSuccessModal, setDownloadSuccessModal] = useState({
    isOpen: false,
    count: 0,
  });
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [targetKelas, setTargetKelas] = useState("");
  const [formData, setFormData] = useState({
    lembaga: "MA",
    nama: "",
    nisn: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "L",
    alamat: "",
    kelas: "",
    nomor_hp_orangtua: "",
    status: "aktif",
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["students", effectiveLembaga, selectedKelas],
    queryFn: () => studentService.getAll({ 
      lembaga: effectiveLembaga,
      ...(selectedKelas && { kelas: selectedKelas })
    }),
    enabled: !!effectiveLembaga,
  });

  // Fetch kelas list for dropdown
  const { data: kelasData } = useQuery({
    queryKey: ["kelas", effectiveLembaga],
    queryFn: async () => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.get("/admin/kelas", {
        params: { lembaga: effectiveLembaga },
      });
      return response.data;
    },
    enabled: !!effectiveLembaga,
  });

  const createMutation = useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      resetForm();
      alert("Siswa berhasil ditambahkan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      resetForm();
      alert("Siswa berhasil diupdate");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      alert("Siswa berhasil dihapus");
    },
    onError: (error) => {
      alert("Gagal menghapus siswa: " + (error.message || "Unknown error"));
    },
  });

  const promoteClassMutation = useMutation({
    mutationFn: async (data) => {
      const api = await import("../services/api").then((m) => m.default);
      const response = await api.post(
        "/attendance/students/promote-class",
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["students"]);
      setSelectedStudents([]);
      setShowPromoteModal(false);
      setTargetKelas("");
      alert(
        data.message ||
          `Berhasil menaikkan ${data.data.count} siswa ke kelas ${data.data.target_kelas}`,
      );
    },
    onError: (error) => {
      alert(error.response?.data?.message || "Gagal menaikkan kelas siswa");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({
      lembaga: effectiveLembaga || "MA",
      nama: "",
      nisn: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      jenis_kelamin: "L",
      alamat: "",
      kelas: "",
      nomor_hp_orangtua: "",
      status: "aktif",
    });
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      lembaga: student.lembaga,
      nama: student.nama,
      nisn: student.nisn || "",
      tempat_lahir: student.tempat_lahir || "",
      tanggal_lahir: student.tanggal_lahir || "",
      jenis_kelamin: student.jenis_kelamin,
      alamat: student.alamat || "",
      kelas: student.kelas || "",
      nomor_hp_orangtua: student.nomor_hp_orangtua || "",
      status: student.status,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Yakin ingin menghapus siswa ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePromoteClass = () => {
    if (selectedStudents.length === 0) {
      alert("Pilih siswa terlebih dahulu");
      return;
    }
    setShowPromoteModal(true);
  };

  const handleSubmitPromote = () => {
    if (!targetKelas) {
      alert("Pilih kelas tujuan terlebih dahulu");
      return;
    }

    if (
      confirm(
        `Naikkan ${selectedStudents.length} siswa ke kelas ${targetKelas}?`,
      )
    ) {
      promoteClassMutation.mutate({
        student_ids: selectedStudents,
        target_kelas: targetKelas,
      });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter((sid) => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const handleGenerateQR = async () => {
    if (selectedStudents.length === 0) {
      alert("Pilih siswa terlebih dahulu");
      return;
    }

    try {
      const selectedData = students.filter((s) =>
        selectedStudents.includes(s.id),
      );
      const zip = new JSZip();

      for (const student of selectedData) {
        const qrData = student.uuid;
        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        zip.file(
          `siswa-${student.nama.replace(/\s+/g, "-")}-${student.nisn || student.id}.png`,
          blob,
        );
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, `QR-Siswa-${new Date().getTime()}.zip`);

      const count = selectedStudents.length;
      setSelectedStudents([]);
      setDownloadSuccessModal({ isOpen: true, count });
    } catch (error) {
      alert("Gagal generate QR: " + error.message);
    }
  };

  const handleDownloadSingleQR = async (student) => {
    try {
      const qrData = student.uuid;
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, qrData, { width: 300, margin: 2 });

      const link = document.createElement("a");
      link.download = `siswa-${student.nama.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      alert("Gagal download QR: " + error.message);
    }
  };

  const students = data?.data || [];
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = students.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 landscape:space-y-3">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 landscape:mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-800 tracking-tight">
            Data Siswa
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Total: {students.length}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedStudents.length > 0 && (
            <>
              <button
                onClick={handleGenerateQR}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm"
              >
                <span className="material-symbols-outlined text-lg">
                  download
                </span>
                <span className="hidden sm:inline">
                  QR ({selectedStudents.length})
                </span>
                <span className="sm:hidden">({selectedStudents.length})</span>
              </button>
              <button
                onClick={handlePromoteClass}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm"
              >
                <span className="material-symbols-outlined text-lg">
                  school
                </span>
                <span className="hidden sm:inline">
                  Naik Kelas ({selectedStudents.length})
                </span>
                <span className="sm:hidden">
                  Naik ({selectedStudents.length})
                </span>
              </button>
            </>
          )}

          {/* Desktop Add Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Data
          </button>
        </div>
      </div>

      <StudentForm
        isOpen={showForm}
        onClose={resetForm}
        editingStudent={editingStudent}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        kelasData={kelasData}
      />

      {/* Select All Action Bar */}
      {students.length > 0 && (
        <div className="flex items-center justify-between px-1 py-0.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                selectedStudents.length === students.length &&
                students.length > 0
              }
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer"
            />
            <span>Pilih Semua Siswa</span>
          </label>

          {selectedStudents.length > 0 && (
            <span className="text-xs font-bold text-gray-500">
              {selectedStudents.length} terpilih
            </span>
          )}
        </div>
      )}

      {/* Cards List Container */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Loading data siswa...
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data siswa
          </div>
        ) : (
          paginatedStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              isSelected={selectedStudents.includes(student.id)}
              onSelect={handleSelectStudent}
              onDownloadQR={handleDownloadSingleQR}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeletePending={deleteMutation.isPending}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {students.length > 0 && (
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
        title="Tambah Siswa"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

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
              siswa ke dalam berkas ZIP.
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

      {/* Promote Class Modal */}
      {showPromoteModal && (
        <PromoteClassModal
          selectedCount={selectedStudents.length}
          targetKelas={targetKelas}
          setTargetKelas={setTargetKelas}
          kelasData={kelasData}
          onClose={() => {
            setShowPromoteModal(false);
            setTargetKelas("");
          }}
          onSubmit={handleSubmitPromote}
          isPending={promoteClassMutation.isPending}
        />
      )}

    </div>
  );
}
