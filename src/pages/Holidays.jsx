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
import { SkeletonBox } from "../components/Skeleton";
import { useAttendanceSettings } from "../hooks/useAttendanceSettings";
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

const CustomMonthHeader = ({ label, date }) => {
  const isSunday = date.getDay() === 0;
  const isFriday = date.getDay() === 5;
  return (
    <div
      className={`py-1.5 text-center font-black text-xs sm:text-sm tracking-wider select-none ${
        isSunday
          ? "text-rose-600 bg-rose-50/70"
          : isFriday
          ? "text-emerald-700 bg-emerald-50/40"
          : "text-gray-900"
      }`}
    >
      {label}
    </div>
  );
};

const CustomDateHeader = ({ date, isOffRange }) => {
  const isSunday = date.getDay() === 0;
  const dayNumber = date.getDate();
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex items-center justify-between p-1">
      <span
        className={`inline-flex items-center justify-center font-black text-xs sm:text-sm select-none transition-all ${
          isToday
            ? "w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gray-900 text-white shadow-xs"
            : isSunday
            ? "text-rose-600"
            : isOffRange
            ? "text-gray-400 opacity-40 font-medium"
            : "text-gray-900"
        }`}
      >
        {dayNumber}
      </span>
      {isToday && (
        <span className="hidden sm:inline-block text-[9px] font-black uppercase px-1 py-0.2 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded">
          Hari Ini
        </span>
      )}
    </div>
  );
};

const CustomEvent = ({ event }) => {
  const isSunday = event.type === "sunday";
  const isNational = event.type === "national";

  if (isSunday) {
    return (
      <div
        className="flex items-center gap-1 w-full px-1 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold truncate select-none shadow-2xs"
        title="Libur Hari Minggu"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        <span className="hidden sm:inline truncate">Minggu</span>
        <span className="sm:hidden truncate">Mgg</span>
      </div>
    );
  }

  if (isNational) {
    return (
      <div
        className="flex items-center gap-1 w-full px-1 sm:px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-400 font-black text-[9px] sm:text-[11px] shadow-2xs truncate select-none"
        title={event.title}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  // Custom Madrasah Holiday
  const isAll = event.resource?.applies_to === "all";
  return (
    <div
      className={`flex items-center gap-1 w-full px-1 sm:px-1.5 py-0.5 rounded font-black text-[9px] sm:text-[11px] shadow-2xs truncate select-none cursor-pointer ${
        isAll
          ? "bg-primary-green text-gray-900 border border-emerald-600"
          : "bg-purple-100 text-purple-950 border border-purple-400"
      }`}
      title={`${event.title} (Klik untuk edit)`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0" />
      <span className="truncate">{event.title}</span>
    </div>
  );
};

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate("PREV");
  const goToNext = () => toolbar.onNavigate("NEXT");
  const goToCurrent = () => toolbar.onNavigate("TODAY");

  const formattedLabel = toolbar.label.charAt(0).toUpperCase() + toolbar.label.slice(1);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b-2 border-gray-900">
      {/* Month & Year Title + Mobile Navigation */}
      <div className="flex items-center justify-between sm:justify-start gap-2.5">
        <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight capitalize flex items-center gap-2">
          <span>{formattedLabel}</span>
        </h2>

        {/* Mobile Mini Quick Nav (<, Hari Ini, >) */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            onClick={goToBack}
            className="w-7 h-7 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-lg font-bold shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            title="Bulan Lalu"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button
            onClick={goToCurrent}
            className="px-2 h-7 bg-primary-green hover:bg-emerald-400 border-2 border-gray-900 rounded-lg font-black text-[11px] text-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            onClick={goToNext}
            className="w-7 h-7 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-lg font-bold shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            title="Bulan Depan"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Desktop Nav + View Switcher */}
      <div className="flex items-center gap-2 justify-between sm:justify-end">
        {/* Desktop Nav (<, Hari Ini, >) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={goToBack}
            className="p-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-bold shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <button
            onClick={goToCurrent}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-black text-xs sm:text-sm text-gray-900 shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-bold shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
            title="Bulan Berikutnya"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>

        {/* View Switcher Toggle (Bulan / Agenda) */}
        <div className="flex items-center bg-gray-100 p-0.5 border-2 border-gray-900 rounded-xl shadow-xs">
          <button
            type="button"
            onClick={() => toolbar.onView("month")}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              toolbar.view === "month"
                ? "bg-white text-gray-900 border border-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Bulan
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView("agenda")}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              toolbar.view === "agenda"
                ? "bg-white text-gray-900 border border-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Holidays() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [duration, setDuration] = useState("single");
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const { enableTeacherAttendance } = useAttendanceSettings();
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
    applies_to: enableTeacherAttendance ? "all" : "students",
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
        applies_to: enableTeacherAttendance ? "all" : "students",
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

  const monthSpecialHolidays = useMemo(() => {
    const m = currentDate.getMonth();
    const y = currentDate.getFullYear();
    return events
      .filter((e) => {
        if (e.type === "sunday") return false;
        const s = new Date(e.start);
        const end = new Date(e.end);
        return (
          (s.getFullYear() === y && s.getMonth() === m) ||
          (end.getFullYear() === y && end.getMonth() === m)
        );
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, currentDate]);

  const existingHolidaysOnSelectedDate = useMemo(() => {
    if (!formData.start_date || editingHoliday) return [];
    
    const selectedDate = new Date(`${formData.start_date}T00:00:00`);
    
    return events.filter(event => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0,0,0,0);
      const eventEnd = new Date(event.end);
      eventEnd.setHours(23,59,59,999);
      
      return selectedDate >= eventStart && selectedDate <= eventEnd;
    });
  }, [formData.start_date, events, editingHoliday]);

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
    <div className="w-full md:max-w-none max-w-6xl mx-auto space-y-4 animate-fade-in pb-12">
      {/* Header Compact */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-teal-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-2xl text-teal-900 font-bold">calendar_month</span>
          </div>
          <div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
              Kalender Libur Sekolah
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Jadwal hari libur nasional, akhir pekan & libur khusus • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 text-xs sm:text-sm flex-shrink-0 cursor-pointer w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-base font-bold">add</span>
            <span>Tambah Libur</span>
          </button>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3 sm:p-5 shadow-neo flex flex-col min-h-[480px] sm:min-h-[580px]">
        {isLoading ? (
          <div className="w-full h-full p-4 space-y-4">
            <div className="flex justify-between items-center">
              <SkeletonBox className="h-8 w-48 rounded-xl" />
              <div className="flex gap-2">
                <SkeletonBox className="h-8 w-16 rounded-xl" />
                <SkeletonBox className="h-8 w-16 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 h-5/6">
              {Array.from({ length: 35 }).map((_, i) => (
                <SkeletonBox key={i} className="h-full w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full h-full min-h-[460px]">
            <Calendar
              localizer={localizer}
              events={events}
              date={currentDate}
              onNavigate={(newDate) => setCurrentDate(newDate)}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent,
                month: {
                  header: CustomMonthHeader,
                  dateHeader: CustomDateHeader,
                },
              }}
              style={{ height: "100%", minHeight: "460px" }}
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
            />
          </div>
        )}
      </div>

      {/* Daftar Hari Libur Bulan Ini */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo space-y-3">
        <div className="flex items-center justify-between gap-2 border-b-2 border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-teal-700 font-bold">event_upcoming</span>
            <h3 className="font-black text-sm sm:text-base text-gray-900">
              Daftar Hari Libur • {format(currentDate, "MMMM yyyy", { locale: idLocale })}
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg border border-gray-300">
            {monthSpecialHolidays.length} Libur Terjadwal
          </span>
        </div>

        {monthSpecialHolidays.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs sm:text-sm font-medium">
            <span className="material-symbols-outlined text-3xl text-gray-300 block mb-1">celebration</span>
            Tidak ada hari libur nasional atau khusus di bulan ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {monthSpecialHolidays.map((ev) => {
              const isNat = ev.type === "national";
              const isCust = ev.type === "custom";
              const startDateStr = format(ev.start, "d MMMM yyyy", { locale: idLocale });
              const isSingleDay = format(ev.start, "yyyy-MM-dd") === format(ev.end, "yyyy-MM-dd");
              const dateDisplay = isSingleDay
                ? startDateStr
                : `${format(ev.start, "d MMM", { locale: idLocale })} - ${format(ev.end, "d MMM yyyy", { locale: idLocale })}`;

              return (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border-2 border-gray-900 shadow-xs flex items-start justify-between gap-2.5 transition-all ${
                    isNat ? "bg-amber-50/70" : "bg-emerald-50/70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          isNat
                            ? "bg-amber-100 border-amber-400 text-amber-900"
                            : "bg-emerald-100 border-emerald-400 text-emerald-950"
                        }`}
                      >
                        {isNat ? "Libur Nasional" : "Libur Madrasah"}
                      </span>
                      {ev.resource?.applies_to && ev.resource.applies_to !== "all" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300 capitalize">
                          {ev.resource.applies_to}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-xs sm:text-sm text-gray-900 truncate" title={ev.title}>
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-gray-600 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-gray-500">calendar_today</span>
                      <span>{dateDisplay}</span>
                    </p>
                    {ev.resource?.description && (
                      <p className="text-[10px] text-gray-500 font-medium italic mt-1 line-clamp-2">
                        {ev.resource.description}
                      </p>
                    )}
                  </div>

                  {isCust && (
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => openModal(ev.resource)}
                        className="w-7 h-7 bg-white hover:bg-amber-50 text-amber-800 border-2 border-gray-900 rounded-lg shadow-xs flex items-center justify-center cursor-pointer active:translate-y-0.5 transition-all"
                        title="Edit Libur"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="w-7 h-7 bg-white hover:bg-rose-50 text-rose-700 border-2 border-gray-900 rounded-lg shadow-xs flex items-center justify-center cursor-pointer active:translate-y-0.5 transition-all"
                        title="Hapus Libur"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingHoliday ? "Edit Kalender Libur" : "Tambah Kalender Libur"}
      >
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
          {existingHolidaysOnSelectedDate.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-2 animate-fade-in">
              <p className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wider">Sudah ada libur di tanggal ini:</p>
              <ul className="space-y-1.5">
                {existingHolidaysOnSelectedDate.map(event => (
                  <li key={event.id} className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-100/70 px-3 py-2 rounded-lg border border-amber-200 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">event_available</span>
                    <span className="flex-1">{event.title}</span>
                    <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded-md">
                      {event.type === 'national' ? 'Nasional' : event.type === 'sunday' ? 'Minggu' : 'Custom'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">Nama Libur</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 sm:py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
              placeholder="Contoh: Libur Idul Fitri"
            />
          </div>
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">Durasi Libur</label>
            <div className="flex bg-gray-100 p-1 rounded-xl border-2 border-gray-200">
              <button
                type="button"
                onClick={() => setDuration("single")}
                className={`flex-1 py-1.5 sm:py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  duration === "single" ? "bg-white text-primary-green border-2 border-primary-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Satu Hari
              </button>
              <button
                type="button"
                onClick={() => setDuration("multiple")}
                className={`flex-1 py-1.5 sm:py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                  duration === "multiple" ? "bg-white text-primary-green border-2 border-primary-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Beberapa Hari
              </button>
            </div>
          </div>

          <div className={`grid gap-3 sm:gap-4 ${duration === "multiple" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">
                {duration === "multiple" ? "Tanggal Mulai" : "Tanggal"}
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 sm:py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
              />
            </div>
            {duration === "multiple" && (
              <div>
                <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  min={formData.start_date}
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 sm:py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">Berlaku Untuk</label>
            <select
              value={formData.applies_to}
              onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
              disabled={!enableTeacherAttendance}
              className="w-full px-3 py-2 sm:py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm md:text-base focus:border-primary-green focus:bg-white focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {enableTeacherAttendance ? (
                <>
                  <option value="all">Semua (Siswa & Guru)</option>
                  <option value="students">Siswa Saja</option>
                  <option value="teachers">Guru Saja</option>
                </>
              ) : (
                <option value="students">Siswa Saja</option>
              )}
            </select>
            {!enableTeacherAttendance && (
              <p className="text-[11px] text-gray-500 mt-1 font-medium">
                Modul presensi guru nonaktif — libur otomatis hanya berlaku untuk siswa.
              </p>
            )}
          </div>
          <div>
            <label className="block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1">Keterangan (Opsional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 sm:py-2.5 min-h-[40px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 resize-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all cursor-pointer text-xs sm:text-sm"
            >
              Batal
            </button>
            {editingHoliday && (
              <button
                type="button"
                onClick={() => handleDelete(editingHoliday.id)}
                className="flex-1 py-2 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all cursor-pointer text-xs sm:text-sm"
              >
                Hapus
              </button>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 py-2 sm:py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black rounded-xl border-2 border-gray-900 shadow-neo active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
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
