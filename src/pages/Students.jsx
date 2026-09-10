import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import StudentForm from "../components/StudentForm";
import StudentCard from "../components/StudentCard";
import StudentCardPrint from "../components/StudentCardPrint";
import PromoteClassModal from "../components/PromoteClassModal";
import ExcelImportModal from "../components/ExcelImportModal";
import Modal from "../components/Modal";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";
export default function Students() {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [selectedCardStudents, setSelectedCardStudents] = useState([]);
  const [targetKelas, setTargetKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    enabled: !isLembagaLoading,
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
    enabled: !isLembagaLoading,
  });

  const createMutation = useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      resetForm();
      setSuccessModal({ isOpen: true, message: "Siswa berhasil ditambahkan" });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.message || "Unknown error";
      const errors = error.response?.data?.errors;
      alert(`Gagal menambah siswa: ${msg}\n${errors ? JSON.stringify(errors, null, 2) : ""}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      resetForm();
      setSuccessModal({ isOpen: true, message: "Siswa berhasil diupdate" });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.message || "Unknown error";
      const errors = error.response?.data?.errors;
      alert(`Gagal update siswa: ${msg}\n${errors ? JSON.stringify(errors, null, 2) : ""}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      setSuccessModal({ isOpen: true, message: "Siswa berhasil dihapus" });
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
      setSuccessModal({
        isOpen: true,
        message: data.message || `Berhasil menaikkan ${data.data.count} siswa ke kelas ${data.data.target_kelas}`,
      });
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

  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (photoFile) => {
    setIsUploading(true);
    try {
      let formattedLembaga = formData.lembaga;
      if (formData.lembaga) {
        const lower = formData.lembaga.toLowerCase();
        if (lower === "ma") formattedLembaga = "MA";
        else if (lower === "mts") formattedLembaga = "MTs";
      }

      const payload = {
        ...formData,
        lembaga: formattedLembaga,
      };

      if (editingStudent) {
        // Update siswa
        await updateMutation.mutateAsync({ id: editingStudent.id, data: payload });
        
        // Upload foto jika ada
        if (photoFile) {
          try {
            console.log('Uploading photo for student:', editingStudent.id);
            const uploadResult = await studentService.uploadPhoto(editingStudent.id, photoFile);
            console.log('Photo uploaded:', uploadResult);
            queryClient.invalidateQueries(["students"]);
            setSuccessModal({ isOpen: true, message: "Siswa dan foto berhasil diupdate" });
          } catch (error) {
            console.error('Photo upload failed:', error);
            setSuccessModal({ isOpen: true, message: "Siswa berhasil diupdate, tapi foto gagal diupload: " + (error.response?.data?.message || error.message) });
          }
        }
      } else {
        // Create siswa dulu
        const newStudent = await createMutation.mutateAsync(payload);
        
        // Upload foto jika ada
        if (photoFile && newStudent?.data?.id) {
          try {
            console.log('Uploading photo for new student:', newStudent.data.id);
            const uploadResult = await studentService.uploadPhoto(newStudent.data.id, photoFile);
            console.log('Photo uploaded:', uploadResult);
            queryClient.invalidateQueries(["students"]);
            setSuccessModal({ isOpen: true, message: "Siswa dan foto berhasil ditambahkan" });
          } catch (error) {
            console.error('Photo upload failed:', error);
            setSuccessModal({ isOpen: true, message: "Siswa berhasil ditambahkan, tapi foto gagal diupload: " + (error.response?.data?.message || error.message) });
          }
        }
      }
    } finally {
      setIsUploading(false);
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

  const allStudents = data?.data || [];

  // Restore print modal state from sessionStorage on reload/refresh
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("yatama_print_students");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCardStudents(parsed);
          setShowCardModal(true);
        }
      }
    } catch (e) {}
  }, []);

  // Update cached student details when fresh API data arrives
  useEffect(() => {
    if (showCardModal && selectedCardStudents.length > 0 && allStudents.length > 0) {
      const currentIds = selectedCardStudents.map((s) => s.id);
      const updated = allStudents.filter((s) => currentIds.includes(s.id));
      if (updated.length > 0) {
        setSelectedCardStudents(updated);
        try {
          sessionStorage.setItem("yatama_print_students", JSON.stringify(updated));
        } catch (e) {}
      }
    }
  }, [allStudents]);

  const openCardModal = (studentsList) => {
    if (!studentsList || studentsList.length === 0) return;
    setSelectedCardStudents(studentsList);
    setShowCardModal(true);
    try {
      sessionStorage.setItem("yatama_print_students", JSON.stringify(studentsList));
    } catch (e) {}
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setSelectedCardStudents([]);
    try {
      sessionStorage.removeItem("yatama_print_students");
    } catch (e) {}
    if (selectedCardStudents.length > 1) {
      setSelectedStudents([]);
    }
  };

  const handleBatchPrintQR = () => {
    if (selectedStudents.length === 0) {
      alert("Pilih siswa terlebih dahulu");
      return;
    }
    const selectedData = students.filter((s) =>
      selectedStudents.includes(s.id),
    );
    openCardModal(selectedData);
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

  const students = allStudents.filter((s) =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.nisn && s.nisn.includes(searchQuery))
  );
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = students.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Action Bar Header */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl text-blue-900 font-bold">school</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Data Siswa
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Total {students.length} Siswa terdaftar • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
          </div>

          {selectedStudents.length > 0 && (
            <>
              <button
                onClick={handleBatchPrintQR}
                className="py-2 px-3 bg-white text-gray-900 font-bold border-2 border-gray-900 rounded-xl hover:bg-gray-100 flex items-center gap-1.5 shadow-sm text-xs"
                title="Cetak Kartu Massal"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Cetak ({selectedStudents.length})</span>
              </button>
              <button
                onClick={handlePromoteClass}
                className="py-2 px-3 bg-amber-100 text-amber-900 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:bg-amber-200 flex items-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-base">school</span>
                <span>Naik ({selectedStudents.length})</span>
              </button>
            </>
          )}

          {/* Import Excel Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0 cursor-pointer"
            title="Import Banyak Siswa dari Excel/CSV"
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

      <StudentForm
        isOpen={showForm}
        onClose={resetForm}
        editingStudent={editingStudent}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending || isUploading}
        kelasData={kelasData}
      />

      {/* Select All & Total */}
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
        
        <div className="text-[10px] sm:text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 border-2 border-gray-900 rounded-full shadow-sm">
          Total: {students.length} Siswa
        </div>
      </div>

      {/* Students Records: Responsive View (Card in Mobile, Table in Desktop) */}
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
                    <th className="p-3.5">Nama & NISN</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">L/P</th>
                    <th className="p-3.5">No. HP Ortu</th>
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
        ) : students.length === 0 ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Belum ada data siswa
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
              {paginatedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  isSelected={selectedStudents.includes(student.id)}
                  onSelect={handleSelectStudent}
                  onDownloadQR={handleDownloadSingleQR}
                  onShowCard={(s) => openCardModal([s])}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
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
                          checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-3 text-center">L/P</th>
                      <th className="py-3 px-4">No. HP Ortu</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200 font-medium">
                    {paginatedStudents.map((student) => {
                      const isSelected = selectedStudents.includes(student.id);
                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-gray-50/80 transition-colors ${isSelected ? "bg-emerald-50/50" : ""}`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-black text-gray-900">
                            {student.nama}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-600 font-bold">
                            {student.nisn || "-"}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-800">
                            Kelas {student.kelas || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded border ${student.jenis_kelamin === "L" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-pink-50 text-pink-800 border-pink-200"}`}>
                              {student.jenis_kelamin || "-"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                            {student.nomor_hp_orangtua || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${student.status === "aktif" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                              {student.status || "Aktif"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openCardModal([student])}
                                className="p-1 hover:bg-blue-50 text-blue-700 rounded border border-gray-300 transition-colors"
                                title="Cetak Kartu"
                              >
                                <span className="material-symbols-outlined text-sm">badge</span>
                              </button>
                              <button
                                onClick={() => handleDownloadSingleQR(student)}
                                className="p-1 hover:bg-emerald-50 text-emerald-700 rounded border border-gray-300 transition-colors"
                                title="Unduh QR"
                              >
                                <span className="material-symbols-outlined text-sm">qr_code</span>
                              </button>
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-1 hover:bg-amber-50 text-amber-700 rounded border border-gray-300 transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(student)}
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
              className="bg-white border-2 border-gray-900 rounded-lg px-2 py-1 text-xs md:text-sm font-bold shadow-sm focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              data
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border-2 border-gray-900 rounded-lg text-xs md:text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Sebelumnya
            </button>
            <span className="text-xs md:text-sm font-bold text-gray-700 px-2">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-white border-2 border-gray-900 rounded-lg text-xs md:text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Selanjutnya
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border-3 border-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-neo text-center space-y-4">
            <div className="w-16 h-16 bg-primary-green/20 border-2 border-gray-900 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-primary-green text-3xl">
                folder_zip
              </span>
            </div>
            <h3 className="text-lg font-black text-gray-900">
              Download ZIP Selesai!
            </h3>
            <p className="text-sm font-bold text-gray-600">
              Berhasil mendownload {downloadSuccessModal.count} file QR Siswa
              dalam format ZIP.
            </p>
            <button
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

      {/* Excel Import Modal */}
      {showImportModal && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type="students"
          apiEndpoint="/attendance/students/bulk-import"
          onSuccess={() => {
            queryClient.invalidateQueries(["students"]);
          }}
        />
      )}

      {/* QR/Card Modal */}
      {showCardModal && selectedCardStudents?.length > 0 && (
        <StudentCardPrint
          students={selectedCardStudents}
          onClose={closeCardModal}
          type="student"
        />
      )}

      <Modal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        title="Berhasil"
        size="sm"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setSuccessModal({ isOpen: false, message: "" })}
              className="px-6 py-2 bg-primary-green text-white font-bold rounded-xl shadow-neo hover:translate-y-0.5 transition-all"
            >
              Tutup
            </button>
          </div>
        }
      >
        <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-emerald-500">
            <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{successModal.message}</p>
        </div>
      </Modal>
    </div>
  );
}
