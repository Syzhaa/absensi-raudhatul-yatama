import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";

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
    <div className="bg-white border-2 border-gray-900 rounded-xl p-3 shadow-neo flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-black text-gray-900 truncate">{student.nama}</h3>
        <p className="text-xs text-gray-500">Kelas {student.kelas} • NIS {student.nis || "-"}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className={`px-2 py-1 rounded-md text-[11px] font-black ${statusColor}`}>
            {student.status === "belum_absen" ? "BELUM ABSEN" : student.status.toUpperCase()}
          </span>
          <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md text-[11px] font-bold">
            Masuk: {student.check_in || "—"}
          </span>
          <span className="px-2 py-1 bg-purple-50 text-purple-800 rounded-md text-[11px] font-bold">
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
  const { effectiveLembaga } = useEffectiveLembaga();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["guru-roster", date, effectiveLembaga, selectedKelas],
    queryFn: async () => (await api.get("/attendance/logs/roster", {
      params: { date, lembaga: effectiveLembaga, ...(selectedKelas ? { kelas: selectedKelas } : {}) },
    })).data,
    enabled: !!effectiveLembaga,
  });

  const students = useMemo(() => {
    const rows = data?.data?.data || [];
    return rows.filter((row) => row.nama.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-black">Daftar Hadir Siswa</h1>
          <p className="text-xs text-gray-500 uppercase font-bold">{effectiveLembaga} • {selectedKelas ? `Kelas ${selectedKelas}` : "Semua Kelas"}</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border-2 border-gray-900 rounded-xl font-bold" />
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl" />
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
