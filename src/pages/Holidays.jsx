import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  id: idLocale,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate("PREV");
  const goToNext = () => toolbar.onNavigate("NEXT");
  const goToCurrent = () => toolbar.onNavigate("TODAY");

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goToCurrent}
          className="px-4 py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-sm shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all"
        >
          Hari Ini
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={goToBack}
            className="p-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-sm shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-sm shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
      <h2 className="text-xl font-black text-gray-900 capitalize">
        {toolbar.label}
      </h2>
      <div className="flex items-center gap-2">
        <select
          value={toolbar.view}
          onChange={(e) => toolbar.onView(e.target.value)}
          className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-sm shadow-[2px_2px_0px_#111827] focus:outline-none cursor-pointer"
        >
          <option value="month">Bulan</option>
          <option value="week">Minggu</option>
          <option value="day">Hari</option>
          <option value="agenda">Agenda</option>
        </select>
      </div>
    </div>
  );
};

export default function Holidays() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [duration, setDuration] = useState("single");
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
    queryClient.invalidateQueries({ queryKey: ["holidays"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["attendance_students"] });
    queryClient.invalidateQueries({ queryKey: ["attendance_teachers"] });
    queryClient.invalidateQueries({ queryKey: ["students_master"] });
    queryClient.invalidateQueries({ queryKey: ["teachers_master"] });
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
    mutationFn: (deleteId) => holidayService.delete(deleteId),
    onSuccess: () => {
      invalidateAllRelatedQueries();
      closeModal();
      showAlert("Berhasil", "Kalender libur berhasil dihapus");
    },
    onError: (err) => showAlert("Error", err.response?.data?.message || "Gagal hapus libur"),
  });

  const openModal = (holiday = null, startDate = null) => {
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
      let initDate = "";
      if (startDate) {
        initDate = format(startDate, "yyyy-MM-dd");
      }
      setDuration("single");
      setFormData({
        name: "",
        start_date: initDate,
        end_date: initDate,
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
      lembaga: effectiveLembaga?.toLowerCase() 
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

  const handleDelete = (deleteId) => {
    showConfirm(
      "Hapus Kalender Libur",
      "Yakin ingin menghapus kalender libur ini?",
      () => deleteMutation.mutate(deleteId),
      true
    );
  };

  // Convert API holidays to react-big-calendar events
  const events = useMemo(() => {
    if (!holidays) return [];
    return holidays.map((holiday) => {
      return {
        id: holiday.id,
        title: holiday.name,
        start: new Date(holiday.start_date + "T00:00:00"),
        end: new Date(holiday.end_date + "T23:59:59"),
        resource: holiday,
      };
    });
  }, [holidays]);

  const handleSelectSlot = (slotInfo) => {
    openModal(null, slotInfo.start);
  };

  const handleSelectEvent = (event) => {
    openModal(event.resource);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border-3 border-gray-900 rounded-2xl p-4 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight uppercase">
            Kalender Libur {effectiveLembaga && `- ${effectiveLembaga}`}
          </h1>
        </div>
        <button
          onClick={() => openModal()}
          className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 md:border-3 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Tambah Libur
        </button>
      </div>

      {/* Calendar Area */}
      <div className="bg-white border-3 border-gray-900 rounded-2xl p-4 shadow-neo flex-1" style={{ height: "75vh" }}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold animate-pulse">
            Memuat Kalender...
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            components={{
              toolbar: CustomToolbar
            }}
            startAccessor="start"
            endAccessor="end"
            culture="id"
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            messages={{
              next: "Maju",
              previous: "Mundur",
              today: "Hari Ini",
              month: "Bulan",
              week: "Minggu",
              day: "Hari",
              agenda: "Agenda",
              noEventsInRange: "Tidak ada libur di rentang waktu ini.",
            }}
            eventPropGetter={(event) => {
              let bg = "bg-primary-green";
              let text = "text-gray-900";
              let border = "border-gray-900";
              
              if (event.resource.applies_to === "students") {
                bg = "bg-emerald-300";
              } else if (event.resource.applies_to === "teachers") {
                bg = "bg-blue-300";
              }

              return {
                className: `${bg} ${text} border-2 ${border} font-bold rounded-lg px-2 shadow-sm`,
                style: {
                  borderRadius: "8px",
                  color: "#111827",
                  border: "2px solid #111827"
                }
              };
            }}
          />
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => openModal()}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary-green text-gray-900 rounded-full border-3 border-gray-900 shadow-neo-xl flex items-center justify-center z-40 active:translate-y-1 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
      </button>

      {/* Modal Tambah/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingHoliday ? "Edit Kalender Libur" : "Tambah Kalender Libur"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Nama Libur</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
              placeholder="Contoh: Libur Idul Fitri"
            />
          </div>
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Durasi Libur</label>
            <div className="flex bg-gray-100 p-1 rounded-xl border-2 border-gray-200">
              <button
                type="button"
                onClick={() => setDuration("single")}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  duration === "single" ? "bg-white text-primary-green border-2 border-primary-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Satu Hari
              </button>
              <button
                type="button"
                onClick={() => setDuration("multiple")}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  duration === "multiple" ? "bg-white text-primary-green border-2 border-primary-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Beberapa Hari
              </button>
            </div>
          </div>

          <div className={`grid gap-4 ${duration === "multiple" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">
                {duration === "multiple" ? "Tanggal Mulai" : "Tanggal"}
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
              />
            </div>
            {duration === "multiple" && (
              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  min={formData.start_date}
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5">Berlaku Untuk</label>
            <select
              value={formData.applies_to}
              onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
              className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
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

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:bg-gray-200"
            >
              Batal
            </button>
            {editingHoliday && (
              <button
                type="button"
                onClick={() => handleDelete(editingHoliday.id)}
                className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-xl border-2 border-red-200 hover:bg-red-200"
              >
                Hapus
              </button>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-[2] py-3 bg-primary-green text-gray-900 font-black rounded-xl border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-1 transition-all disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

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
