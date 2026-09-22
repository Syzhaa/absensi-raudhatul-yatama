import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import TeacherSelfCard from "../components/TeacherSelfCard";
import { getAutoHoliday } from "../utils/holidays";
import { format, subDays, addDays } from "date-fns";
import { useAttendanceSSE } from "../hooks/useAttendanceSSE";

import { AttendanceItem } from "../components/AttendanceItems";
import { CardSkeleton } from "../components/Skeleton";

export default function GuruAttendance() {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const queryClient = useQueryClient();

  const handlePrevDay = () => {
    try {
      const [y, m, d] = (date || today).split("-").map(Number);
      const curr = new Date(y, m - 1, d);
      setDate(format(subDays(curr, 1), "yyyy-MM-dd"));
    } catch {
      setDate(today);
    }
  };

  const handleNextDay = () => {
    try {
      const [y, m, d] = (date || today).split("-").map(Number);
      const curr = new Date(y, m - 1, d);
      setDate(format(addDays(curr, 1), "yyyy-MM-dd"));
    } catch {
      setDate(today);
    }
  };

  // Aktifkan SSE untuk realtime update roster
  useAttendanceSSE(date, queryClient);

  const { data, isLoading } = useQuery({
    queryKey: ["guru-roster", date, effectiveLembaga, selectedKelas],
    queryFn: async () => (await api.get("/attendance/logs/roster", {
      params: { date, lembaga: effectiveLembaga, ...(selectedKelas ? { kelas: selectedKelas } : {}) },
    })).data,
    enabled: !isLembagaLoading,
  });

  const { data: holidaysData } = useQuery({
    queryKey: ["holidays", effectiveLembaga],
    queryFn: async () => {
      try {
        const res = await api.get("/attendance/holidays", { params: { lembaga: effectiveLembaga } });
        return res.data?.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !isLembagaLoading,
  });

  const activeHoliday = useMemo(() => {
    const list = Array.isArray(holidaysData) ? holidaysData : [];
    const apiHoliday = list.find((h) => {
      const hStart = (h.start_date || "").substring(0, 10);
      const hEnd = (h.end_date || "").substring(0, 10);
      return date >= hStart && date <= hEnd;
    });
    if (apiHoliday) return apiHoliday;
    return getAutoHoliday(date);
  }, [holidaysData, date]);

  const students = useMemo(() => {
    const rows = data?.data?.data || [];
    return rows.filter((row) => row.nama.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  return (
    <div className="w-full md:max-w-none max-w-4xl mx-auto space-y-4">
      {/* Presensi Mandiri Dewan Guru */}
      <TeacherSelfCard />

      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-3 md:p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-black">Daftar Hadir Siswa</h1>
          <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">{effectiveLembaga} • {selectedKelas ? `Kelas ${selectedKelas}` : "Semua Kelas"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 border-2 border-gray-900 rounded-xl">
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-300 hover:bg-gray-200 text-gray-800 transition-all cursor-pointer shadow-2xs"
              title="Hari Sebelumnya"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setDate(today)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                date === today
                  ? "bg-primary-green text-gray-900 border border-gray-900 shadow-2xs"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setDate(yesterday)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                date === yesterday
                  ? "bg-primary-green text-gray-900 border border-gray-900 shadow-2xs"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-300 hover:bg-gray-200 text-gray-800 transition-all cursor-pointer shadow-2xs"
              title="Hari Berikutnya"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <input aria-label="Pilih tanggal absensi" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-1.5 md:py-2 border-2 border-gray-900 rounded-xl font-bold text-sm bg-gray-50 focus:bg-white cursor-pointer" />
        </div>
      </div>
      
      {activeHoliday && (
        <div className="bg-emerald-400 border-2 md:border-3 border-gray-900 rounded-xl p-3 md:p-4 shadow-sm md:shadow-neo flex items-center gap-3 text-gray-900 animate-slide-up">
          <div className="w-10 h-10 md:w-11 md:h-11 bg-white border-2 border-gray-900 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-xl md:text-2xl text-emerald-700">celebration</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-block px-1.5 py-0.5 bg-gray-900 text-emerald-300 text-[9px] md:text-[10px] font-black rounded uppercase tracking-wider mb-0.5">Hari Libur</div>
            <h3 className="text-xs md:text-sm font-black text-gray-900 truncate">{activeHoliday.name}</h3>
            <p className="text-[10px] md:text-xs font-bold text-gray-800 opacity-90 truncate">{activeHoliday.description || "Presensi ditiadakan."}</p>
          </div>
        </div>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-gray-900 rounded-xl text-sm" />
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          students.map((student) => {
            const isLibur = activeHoliday && (student.status === "belum_absen" || student.status === "alpha" || !student.status);
            const status = isLibur ? "libur" : (student.status || "belum_absen");

            const item = {
              id: `student-${student.student_id}`,
              student_id: student.student_id,
              role: "student",
              student: student,
              lembaga: effectiveLembaga,
              status: status,
              check_in: student.check_in,
              check_out: student.check_out,
              notes: student.notes || (isLibur ? `Libur: ${activeHoliday.name}` : null),
              nisn: student.nisn || student.nis,
              kelas: student.kelas,
              nama: student.nama,
            };

            return (
              <AttendanceItem
                key={item.id}
                item={item}
                onEdit={(customItem) => setSelected(customItem ? { ...student, ...customItem } : student)}
              />
            );
          })
        )}
      </div>
      <AttendanceModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        student={selected}
        date={date}
        lembaga={effectiveLembaga}
        onStatusUpdate={() => queryClient.invalidateQueries({ queryKey: ["guru-roster"] })}
      />
    </div>
  );
}
