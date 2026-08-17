import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import { getAutoHoliday } from "../utils/holidays";

function StudentRow({ student, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusColor = student.status === "belum_absen"
    ? "bg-gray-100 text-gray-600"
    : student.status === "hadir"
      ? "bg-emerald-100 text-emerald-800"
      : student.status === "terlambat"
        ? "bg-amber-200 text-amber-900"
        : "bg-blue-100 text-blue-800";

  return (
    <div className="bg-white border-2 border-gray-900 rounded-xl p-2.5 md:p-3 shadow-sm md:shadow-neo flex items-center gap-2 md:gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-black text-sm md:text-base text-gray-900 truncate">{student.nama}</h3>
        <p className="text-[10px] md:text-xs text-gray-500 font-bold">Kelas {student.kelas} • NIS {student.nis || "-"}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[11px] font-black ${statusColor}`}>
            {student.status === "belum_absen" ? "BELUM ABSEN" : student.status.toUpperCase()}
          </span>
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] md:text-[11px] font-bold">
            Masuk: {student.check_in || "—"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded text-[9px] md:text-[11px] font-bold">
            Pulang: {student.check_out || "—"}
          </span>
        </div>
      </div>
      <button onClick={() => onEdit(student)} className="hidden md:block p-2 border-2 border-gray-900 rounded-lg bg-amber-100" title="Edit Absensi">
        <span className="material-symbols-outlined">edit</span>
      </button>
      <div className="relative md:hidden">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 border-2 border-gray-900 rounded-lg bg-gray-100">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        {menuOpen && (
          <button onClick={() => { setMenuOpen(false); onEdit(student); }} className="absolute right-0 top-full mt-1 w-40 p-3 bg-white border-2 border-gray-900 rounded-xl shadow-neo font-bold text-sm z-20">
            Edit Absensi
          </button>
        )}
      </div>
    </div>
  );
}

export default function GuruAttendance() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const queryClient = useQueryClient();

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
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-3 md:p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-black">Daftar Hadir Siswa</h1>
          <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">{effectiveLembaga} • {selectedKelas ? `Kelas ${selectedKelas}` : "Semua Kelas"}</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-1.5 md:py-2 border-2 border-gray-900 rounded-xl font-bold text-sm" />
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
        {isLoading ? <p className="font-bold">Memuat daftar hadir...</p> : students.map((student) => (
          <StudentRow key={student.student_id} student={student} onEdit={setSelected} />
        ))}
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
