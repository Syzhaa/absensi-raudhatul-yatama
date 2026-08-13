import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";

export default function Holidays() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const { effectiveLembaga } = useEffectiveLembaga();
  const queryClient = useQueryClient();

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
    enabled: !!effectiveLembaga,
  });

  const createMutation = useMutation({
    mutationFn: (data) => holidayService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["holidays"]);
      closeModal();
      alert("Kalender libur berhasil dibuat");
    },
    onError: (err) => alert(err.response?.data?.message || "Gagal membuat libur"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => holidayService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["holidays"]);
      closeModal();
      alert("Kalender libur berhasil diupdate");
    },
    onError: (err) => alert(err.response?.data?.message || "Gagal update libur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["holidays"]);
      alert("Kalender libur berhasil dihapus");
    },
    onError: (err) => alert(err.response?.data?.message || "Gagal hapus libur"),
  });

  const openModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        start_date: holiday.start_date,
        end_date: holiday.end_date,
        applies_to: holiday.applies_to,
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
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
    const payload = { ...formData, lembaga: effectiveLembaga };
    
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Yakin hapus kalender libur ini?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-neo flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">Kalender Libur</h1>
          <p className="text-xs text-gray-500 uppercase font-bold">{effectiveLembaga}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:translate-y-[-2px] transition-transform"
        >
          + Tambah Libur
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-8 text-center animate-pulse">
          Memuat data...
        </div>
      ) : holidays && holidays.length > 0 ? (
        <div className="space-y-3">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-neo flex items-start justify-between"
            >
              <div className="flex-1">
                <h3 className="font-black text-gray-900">{holiday.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {holiday.start_date} s/d {holiday.end_date}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl max-w-md w-full">
            <div className="border-b-2 border-gray-900 p-4 flex items-center justify-between">
              <h2 className="font-black text-lg">{editingHoliday ? "Edit" : "Tambah"} Kalender Libur</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">Nama Libur</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="Lebaran, Natal, dll"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Berlaku Untuk</label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-none"
                >
                  <option value="all">Semua (Siswa & Guru)</option>
                  <option value="students">Siswa Saja</option>
                  <option value="teachers">Guru Saja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Keterangan (Opsional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-gray-100 font-bold border-2 border-gray-300 rounded-xl hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2 bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:translate-y-[-2px] transition-transform disabled:opacity-50"
                >
                  {editingHoliday ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
