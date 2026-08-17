import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import HolidaysAPI from "date-holidays";
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
    <div className="flex flex-wrap items-center justify-between mb-3 gap-y-3 gap-x-2">
      <div className="flex items-center gap-1.5 order-1">
        <button
          onClick={goToCurrent}
          className="px-3 py-1.5 md:px-4 md:py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-xs md:text-sm shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all"
        >
          Hari Ini
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={goToBack}
            className="p-1 md:p-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-base md:text-lg">chevron_left</span>
          </button>
          <button
            onClick={goToNext}
            className="p-1 md:p-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold shadow-[2px_2px_0px_#111827] hover:bg-gray-50 active:translate-y-0.5 active:shadow-[0px_0px_0px_#111827] transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-base md:text-lg">chevron_right</span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center order-2 md:order-3">
        <select
          value={toolbar.view}
          onChange={(e) => toolbar.onView(e.target.value)}
          className="px-2 py-1.5 md:px-3 md:py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-xs md:text-sm shadow-[2px_2px_0px_#111827] focus:outline-none cursor-pointer"
        >
          <option value="month">Bulan</option>
          <option value="week">Minggu</option>
          <option value="day">Hari</option>
          <option value="agenda">Agenda</option>
        </select>
      </div>

      <h2 className="text-base md:text-xl font-black text-gray-900 capitalize w-full text-center order-3 md:order-2 md:w-auto md:text-left">
        {toolbar.label}
      </h2>
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
        start_date: holiday.start_date.split("T")[0],
        end_date: holiday.end_date.split("T")[0],
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
    let allEvents = [];

    if (holidays) {
      allEvents = holidays.map((holiday) => {
        const startStr = holiday.start_date.split("T")[0];
        const endStr = holiday.end_date.split("T")[0];
        return {
          id: holiday.id,
          title: holiday.name,
          start: new Date(`${startStr}T00:00:00`),
          end: new Date(`${endStr}T23:59:59`),
          resource: holiday,
          type: "custom"
        };
      });
    }

    // Auto generate Sundays and National Holidays
    const hd = new HolidaysAPI("ID");
    for (let year = 2024; year <= 2030; year++) {
      // 1. National Holidays
      const nationalHolidays = hd.getHolidays(year);
      nationalHolidays.forEach(nh => {
        const start = new Date(nh.start);
        const end = new Date(nh.end || nh.start); // fallback if end is missing
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        
        allEvents.push({
          id: `national-${nh.name}-${year}`,
          title: nh.name,
          start: start,
          end: end,
          resource: { applies_to: "all" },
          type: "national"
        });
      });

      // 2. Sundays
      let d = new Date(year, 0, 1);
      while (d.getDay() !== 0) {
        d.setDate(d.getDate() + 1);
      }
      while (d.getFullYear() === year) {
        const start = new Date(d);
        const end = new Date(d);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        allEvents.push({
          id: `sunday-${d.getTime()}`,
          title: "Libur Hari Minggu",
          start: start,
          end: end,
          resource: { applies_to: "all" },
          type: "sunday"
        });
        d.setDate(d.getDate() + 7);
      }
    }

    return allEvents;
  }, [holidays]);

  const handleSelectSlot = (slotInfo) => {
    openModal(null, slotInfo.start);
  };

  const handleSelectEvent = (event) => {
    if (event.type === "national" || event.type === "sunday") {
      showAlert("Info", `Ini adalah hari libur otomatis (${event.title}) dan tidak dapat diedit secara manual.`);
      return;
    }
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
              let bg = "bg-red-600";
              let text = "text-white";
              let border = "border-red-800";
              
              if (event.resource.applies_to === "students") {
                bg = "bg-rose-500";
              } else if (event.resource.applies_to === "teachers") {
                bg = "bg-red-500";
              }

              return {
                className: `${bg} ${text} border-2 ${border} font-bold rounded-lg px-2 shadow-sm`,
                style: {
                  borderRadius: "8px",
                  color: "#ffffff",
                  border: "2px solid #991b1b"
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
