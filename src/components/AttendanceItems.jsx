import { memo } from "react";

export const AttendanceItem = memo(function AttendanceItem({ item, onEdit }) {
  const isStudent = item.role === "student";
  const person = isStudent ? item.student : item.teacher;
  const subtitle = isStudent
    ? `Kelas ${person?.kelas || "-"} (${item.lembaga?.toUpperCase() || "MA"})`
    : `${person?.nip ? "NIP: " + person.nip : "Guru"} (${item.lembaga?.toUpperCase() || "MA"})`;

  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo transition-all space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base md:text-lg text-gray-900 truncate leading-snug">
              {person?.nama || "Tanpa Nama"}
            </h3>
            <span
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${"${"}
              isStudent ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-purple-100 text-purple-800 border-purple-300'
            ${"}"}`}
            >
              {isStudent ? "Siswa" : "Guru"}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-black rounded-md border-2 border-gray-900 flex-shrink-0 ${"${"}
            item.status === 'hadir' 
              ? 'bg-primary-green text-gray-900' 
              : item.status === 'terlambat'
              ? 'bg-amber-300 text-gray-900'
              : item.status === 'izin'
              ? 'bg-purple-200 text-purple-900'
              : item.status === 'sakit'
              ? 'bg-blue-200 text-blue-900'
              : item.status === 'alpha'
              ? 'bg-red-200 text-red-900'
              : 'bg-gray-200 text-gray-900'
          ${"}"}`}
          >
            {item.status?.toUpperCase() || "HADIR"}
          </span>

          {/* Edit button for manual statuses */}
          {isStudent &&
            ["izin", "sakit", "alpha", "libur"].includes(item.status) &&
            onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-gray-700">
                  edit
                </span>
              </button>
            )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
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
          <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium">
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
          <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium">
            Belum Pulang
          </span>
        )}
      </div>
    </div>
  );
});

export const AbsentStudentItem = memo(function AbsentStudentItem({
  student,
  onAddManual,
}) {
  return (
    <div className="bg-amber-50/30 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-amber-50 transition-colors">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-gray-900 truncate">
          {student.nama}
        </h4>
        <p className="text-xs text-gray-500">
          Kelas {student.kelas} • NIS: {student.nis || "-"}
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

