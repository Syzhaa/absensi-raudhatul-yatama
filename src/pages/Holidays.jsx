import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";

export default function Holidays() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [duration, setDuration] = useState("single");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const queryClient = useQueryClient();

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

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    applies_to: "all",
    description: "",
  });

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["holidays", effectiveLembaga],
    queryFn: async () => {
      const res = await holidayService.getAll({ lembaga: effectiveLembaga });
      return res.data || [];
    },
    enabled: !isLembagaLoading,
  });

  const invalidateAllRelatedQueries = () => {
    queryClient.invalidateQueries(["holidays"]);
    queryClient.invalidateQueries(["dashboard"]);
    queryClient.invalidateQueries(["attendance_students"]);
    queryClient.invalidateQueries(["attendance_teachers"]);
    queryClient.invalidateQueries(["students_master"]);
    queryClient.invalidateQueries(["teachers_master"]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => holidayService.create(data),
    onSuccess: () => {
      invalidateAllRelatedQueries();
      closeModal();
      showAlert("Berhasil", "Kalender libur berhasil dibuat");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal membuat libur"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => holidayService.update(id, data),
    onSuccess: () => {
      invalidateAllRelatedQueries();
      closeModal();
      showAlert("Berhasil", "Kalender libur berhasil diupdate");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal update libur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => holidayService.delete(id),
    onSuccess: () => {
      invalidateAllRelatedQueries();
      showAlert("Berhasil", "Kalender libur berhasil dihapus");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal hapus libur"),
  });

  const openModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setDuration(holiday.start_date === holiday.end_date ? "single" : "multiple");
      setFormData({
        name: holiday.name,
        start_date: holiday.start_date,
        end_date: holiday.end_date,
        applies_to: holiday.applies_to,
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
      setDuration("single");
      setFormData({
        name: "",
        start_date: "",
        end_date: "",
        applies_to: "all",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHoliday(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      lembaga: effectiveLembaga?.toLowerCase() // Normalize to lowercase for backend validation
    };
    if (duration === "single") {
      payload.end_date = payload.start_date;
    }
    
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Hapus Kalender Libur",
      "Yakin ingin menghapus kalender libur ini?",
      () => deleteMutation.mutate(id),
      true
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const filteredHolidays = holidays?.filter(holiday => {
    const matchesSearch = holiday.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (holiday.description && holiday.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDate = !filterDate || (filterDate >= holiday.start_date && filterDate <= holiday.end_date);
    return matchesSearch && matchesDate;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-neo flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-black uppercase text-gray-900">
            Kalender Libur - {effectiveLembaga || "Semua"}
          </h1>
          <button
            onClick={() => openModal()}
            className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 md:border-3 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Libur
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              search
            </span>
            <input
              type="text"
              placeholder="Cari kalender libur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-2 border-gray-900 rounded-xl font-bold text-sm focus:bg-white focus:outline-none transition-colors"
            />
          </div>
          {/* Filter Date */}
          <div className="relative sm:w-48 shrink-0">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border-2 border-gray-900 rounded-xl font-bold text-sm focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-8 text-center animate-pulse">
          Memuat data...
        </div>
      ) : filteredHolidays && filteredHolidays.length > 0 ? (
        <div className="space-y-3">
          {filteredHolidays.map((holiday) => (
            <div
              key={holiday.id}
              className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-neo flex items-start justify-between"
            >
              <div className="flex-1">
                <h3 className="font-black text-gray-900">{holiday.name}</h3>
                <p className="text-sm font-bold text-gray-600 mt-1">
                  {formatDate(holiday.start_date)}
                  {holiday.start_date !== holiday.end_date && ` s/d ${formatDate(holiday.end_date)}`}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-300">
                    {holiday.applies_to === "all" ? "Semua" : holiday.applies_to === "students" ? "Siswa" : "Guru"}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md border border-blue-300 uppercase">
                    {holiday.lembaga}
                  </span>
                </div>
                {holiday.description && (
                  <p className="text-xs text-gray-500 mt-2">{holiday.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(holiday)}
                  className="p-2 bg-amber-100 border-2 border-gray-900 rounded-lg hover:bg-amber-200"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(holiday.id)}
                  className="p-2 bg-red-100 border-2 border-gray-900 rounded-lg hover:bg-red-200"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-400">calendar_month</span>
          <p className="text-gray-600 font-bold mt-2">Belum ada kalender libur</p>
        </div>
      )}

      <button
        onClick={() => openModal()}
        className="md:hidden fixed right-5 z-40 w-14 h-14 bg-primary-green text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center group portrait:bottom-24 landscape:bottom-6"
        title="Tambah Libur"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingHoliday ? "Edit Kalender Libur" : "Tambah Kalender Libur"}
        size="lg"
        footer={
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-3.5 px-6 bg-primary-green text-gray-900 font-bold text-base md:text-lg rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <span className="material-symbols-outlined text-xl">
                {editingHoliday ? "save" : "check"}
              </span>
              <span>
                {createMutation.isPending || updateMutation.isPending
                  ? "Menyimpan..."
                  : editingHoliday
                    ? "Update Libur"
                    : "Simpan Libur"}
              </span>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors text-center"
            >
              Batal
            </button>
          </div>
        }
      >
        <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4 pb-24 sm:pb-4">
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Nama Libur *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={100}
              placeholder="Lebaran, Natal, dll"
              className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Durasi Libur</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="single">1 Hari Saja</option>
              <option value="multiple">Lebih dari 1 Hari</option>
            </select>
          </div>
          
          {duration === "single" ? (
            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tanggal Libur *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                required
                className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tanggal Mulai *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tanggal Selesai *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Berlaku Untuk</label>
            <select
              value={formData.applies_to}
              onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
              className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">Semua (Siswa & Guru)</option>
              <option value="students">Siswa Saja</option>
              <option value="teachers">Guru Saja</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Keterangan (Opsional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              rows={2}
              className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Mobile FAB */}
      <button
        onClick={() => openModal()}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary-green text-gray-900 rounded-full border-3 border-gray-900 shadow-neo-xl flex items-center justify-center z-40 active:translate-y-1 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
      </button>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
