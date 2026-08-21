import { memo } from "react";
import { useKelasFormat } from "../hooks/useKelasFormat";

export const AttendanceItem = memo(function AttendanceItem({ item, onEdit }) {
  const isStudent = item.role === "student";
  const { formatKelas } = useKelasFormat();
  const person = isStudent ? item.student || item : item.teacher || item;
  const isBelumAbsen = !item.status || item.status === "belum_absen";

  const subtitle = isStudent
    ? `Kelas ${formatKelas(person?.kelas) || "-"} • NISN: ${person?.nisn || "-"}`
    : `${person?.nip ? "NIP: " + person.nip : "Guru / Staf"}`;

  const lembagaName = (item.lembaga || person?.lembaga || "MA").toUpperCase();

  return (
    <div
      className="bg-white border-2 md:border-3 border-gray-900 hover:border-emerald-600 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo hover:shadow-neo-lg hover:-translate-y-0.5 transition-all duration-200 space-y-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base md:text-lg text-gray-900 truncate leading-snug group-hover:text-emerald-700 transition-colors">
              {person?.nama || "Tanpa Nama"}
            </h3>
            <span
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                isStudent
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : "bg-purple-100 text-purple-800 border-purple-300"
              }`}
            >
              {isStudent ? "Siswa" : "Guru"}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-300">
              {lembagaName}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-2.5 py-1 text-xs font-black rounded-lg border-2 border-gray-900 ${
              isBelumAbsen
                ? "bg-amber-200 text-amber-950 animate-pulse"
                : item.status === "hadir"
                ? "bg-primary-green text-gray-900"
                : item.status === "terlambat"
                ? "bg-amber-300 text-gray-900"
                : item.status === "izin"
                ? "bg-purple-200 text-purple-900"
                : item.status === "sakit"
                ? "bg-blue-200 text-blue-900"
                : item.status === "alpha"
                ? "bg-red-200 text-red-900"
                : item.status === "libur"
                ? "bg-teal-300 text-teal-950"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            {isBelumAbsen ? "BELUM ABSEN" : item.status?.toUpperCase()}
          </span>

          {/* Quick Manual Attendance Actions */}
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              title="Edit / Absen Manual"
              className="p-1.5 bg-gray-100 border-2 border-gray-900 rounded-lg hover:bg-emerald-100 hover:border-emerald-700 active:translate-y-0.5 transition-all shadow-neo"
            >
              <span className="material-symbols-outlined text-sm md:text-base text-gray-800">
                edit_note
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
        {item.status === "libur" ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-950 border border-teal-300 rounded-lg text-xs font-bold">
              <span className="material-symbols-outlined text-sm text-teal-700">
                event
              </span>
              {item.notes || "Hari Libur Terjadwal"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {item.check_in ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold">
                <span className="material-symbols-outlined text-sm text-emerald-700">
                  login
                </span>
                Masuk:{" "}
                <strong className="font-black text-gray-900">
                  {item.check_in}
                </strong>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium border border-gray-200">
                Belum Masuk
              </span>
            )}

            {item.check_out ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold">
                <span className="material-symbols-outlined text-sm text-purple-700">
                  logout
                </span>
                Pulang:{" "}
                <strong className="font-black text-gray-900">
                  {item.check_out}
                </strong>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium border border-gray-200">
                Belum Pulang
              </span>
            )}
          </div>
        )}

        {/* Manual Button for Belum Absen */}
        {isBelumAbsen && (
          <div className="flex items-center gap-1.5 ml-auto">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                title="Absen Manual"
                className="px-2.5 py-1 bg-primary-green text-gray-900 text-xs font-black rounded-lg border-2 border-gray-900 shadow-neo hover:bg-emerald-400 active:translate-y-0.5 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Hadir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export const AbsentStudentItem = memo(function AbsentStudentItem({
  student,
  onAddManual,
}) {
  const { formatKelas } = useKelasFormat();
  return (
    <div className="bg-amber-50/30 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-amber-100/60 transition-colors">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-gray-900 truncate">
          {student.nama}
        </h4>
        <p className="text-xs text-gray-500">
          Kelas {formatKelas(student.kelas) || "-"} • NISN: {student.nisn || "-"}
        </p>
      </div>
      <button
        onClick={() => onAddManual(student)}
        className="px-3 py-1.5 bg-primary-green text-gray-900 font-bold text-xs border-2 border-gray-900 rounded-lg shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        Input
      </button>
    </div>
  );
});
