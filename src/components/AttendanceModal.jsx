import React, { useState, useEffect } from "react";
import { useKelasFormat } from "../hooks/useKelasFormat";
import { useQueryClient } from "@tanstack/react-query";
import { logsService } from "../services";
import { useAppStore } from "../store/useAppStore";

const STATUS_OPTIONS = [
  {
    value: "hadir",
    label: "Hadir (Masuk)",
    color: "bg-emerald-100 text-emerald-900 border-emerald-400",
  },
  {
    value: "pjj",
    label: "PJJ (Jarak Jauh)",
    color: "bg-cyan-100 text-cyan-950 border-cyan-400",
  },
  {
    value: "terlambat",
    label: "Terlambat",
    color: "bg-amber-100 text-amber-900 border-amber-400",
  },
  {
    value: "izin",
    label: "Izin",
    color: "bg-purple-100 text-purple-900 border-purple-300",
  },
  {
    value: "sakit",
    label: "Sakit",
    color: "bg-blue-100 text-blue-900 border-blue-300",
  },
  {
    value: "alpha",
    label: "Alpha",
    color: "bg-red-100 text-red-900 border-red-300",
  },
  {
    value: "libur",
    label: "Libur",
    color: "bg-orange-100 text-orange-900 border-orange-300",
  },
];

export default function AttendanceModal({
  isOpen,
  onClose,
  student,
  date,
  lembaga,
  onStatusUpdate,
  onSuccessMessage,
}) {
  const [status, setStatus] = useState("hadir");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { formatKelas } = useKelasFormat();
  const userRole = useAppStore((state) => state.userRole);
  const isGuru = userRole === "guru";

  const filteredStatusOptions = isGuru
    ? STATUS_OPTIONS.filter((opt) => !["hadir", "terlambat"].includes(opt.value))
    : STATUS_OPTIONS;

  useEffect(() => {
    if (isOpen) {
      const existingNote = student?.notes || student?.initialNotes || "";
      const isExistingPjj =
        student?.initialStatus === "pjj" ||
        existingNote.toLowerCase().includes("jarak jauh") ||
        existingNote.toLowerCase().includes("pjj");

      let currentStatus = student?.initialStatus ||
        (isExistingPjj
          ? "pjj"
          : (student?.status && student.status !== "belum_absen"
            ? student.status
            : (isGuru ? "izin" : "hadir")));

      if (isGuru && ["hadir", "terlambat"].includes(currentStatus) && !isExistingPjj) {
        currentStatus = student?.initialStatus || "izin";
      }

      setStatus(currentStatus);
      setNotes(existingNote || (currentStatus === "pjj" ? "Pelajaran Jarak Jauh (PJJ)" : ""));
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, student?.status, student?.notes, student?.initialStatus, student?.initialNotes, isGuru]);

  if (!isOpen) return null;

  const isTeacher = student?.role === "teacher" || !!student?.teacher_id;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isGuru && ["hadir", "terlambat"].includes(status) && status !== "pjj") {
      alert("Role Guru hanya dapat menginput status selain Hadir fisik (Izin, Sakit, Alpha, atau PJJ). Status Hadir fisik wajib melalui scan QR.");
      return;
    }

    setIsSubmitting(true);

    const isPjj = status === "pjj";
    const submitStatus = isPjj ? "hadir" : status;
    const submitNotes = isPjj ? (notes.trim() || "Pelajaran Jarak Jauh (PJJ)") : notes;

    try {
      if (student?.attendance_id) {
        await logsService.updateStatus(student.attendance_id, {
          status: submitStatus,
          notes: submitNotes,
          role: isTeacher ? "teacher" : "student",
          ...(isPjj ? { check_in: null, check_out: null } : {}),
        });
      } else {
        // Create new manual attendance
        const payload = {
          status: submitStatus,
          notes: submitNotes,
          date,
          ...(isPjj ? { check_in: null, check_out: null } : {}),
        };
        if (isTeacher) {
          payload.teacher_id = student.teacher_id || student.id;
        } else {
          payload.student_id = student.student_id || student.id;
        }
        await logsService.createManual(payload);
      }

      queryClient.invalidateQueries({
        queryKey: ["attendance_students", date],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance_teachers", date],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance_absent_students", date],
      });
      queryClient.invalidateQueries({
        queryKey: ["students_master"],
      });
      queryClient.invalidateQueries({
        queryKey: ["teachers_master"],
      });

      if (onStatusUpdate) onStatusUpdate();
      import("../utils/scanAudio").then((m) => m.playLeaveSubmitted(status));
      onClose();
      
      if (onSuccessMessage) {
        onSuccessMessage("Status absensi berhasil diperbarui.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Gagal simpan absensi manual");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="bg-gray-50/50 border-b border-gray-200 px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm sm:text-base text-gray-900">
              Edit Status Presensi
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500">
              {student?.nama || student?.student?.nama || "Siswa"} -{" "}
              {student?.kelas || student?.student?.kelas ? `Kelas ${formatKelas(student.kelas || student.student.kelas)}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-2.5">
          {/* Student Info Compact */}
          {student && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-600 text-base">
                person
              </span>
              <p className="font-black text-xs text-gray-900 truncate">
                {student?.nama || student?.student?.nama || "Nama tidak tersedia"}
              </p>
            </div>
          )}

          {/* Status Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase text-gray-800 tracking-wider">
                Status Absensi
              </label>
              {isGuru && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                  Mode Guru: Non-Hadir
                </span>
              )}
            </div>

            {isGuru && (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-1.5">
                <span className="material-symbols-outlined text-amber-700 text-sm shrink-0 mt-0.5">info</span>
                <p className="text-[10px] text-amber-950 font-bold leading-tight">
                  Status Hadir fisik wajib scan QR. Guru dapat mencatat PJJ (Jarak Jauh), Izin, Sakit, atau Alpha.
                </p>
              </div>
            )}

            <div className={`grid ${filteredStatusOptions.length <= 3 ? "grid-cols-3" : "grid-cols-2"} gap-1.5`}>
              {filteredStatusOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`relative cursor-pointer border-2 rounded-xl px-2 py-2 flex items-center justify-center gap-1.5 transition-all ${
                    status === opt.value
                      ? `${opt.color} border-gray-900 shadow-neo`
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus === "pjj" && (!notes || !notes.trim())) {
                        setNotes("Pelajaran Jarak Jauh (PJJ)");
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-[11px] font-black">
                    {opt.label}
                  </span>
                  {status === opt.value && (
                    <span className="material-symbols-outlined text-xs">
                      check
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Quick Preset Buttons for Notes */}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mr-0.5">Preset:</span>
            <button
              type="button"
              onClick={() => {
                setStatus("pjj");
                setNotes("Pelajaran Jarak Jauh (PJJ)");
              }}
              className="px-2 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-950 font-black text-[10px] rounded-lg border border-cyan-400 cursor-pointer transition-all shadow-2xs"
            >
              💻 PJJ (Jarak Jauh)
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("sakit");
                setNotes("Sakit demam / istirahat di rumah");
              }}
              className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold text-[10px] rounded-lg border border-blue-300 cursor-pointer transition-all shadow-2xs"
            >
              🏥 Sakit
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("izin");
                setNotes("Izin keperluan keluarga");
              }}
              className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-[10px] rounded-lg border border-purple-300 cursor-pointer transition-all shadow-2xs"
            >
              📝 Keperluan Keluarga
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("izin");
                setNotes("Tugas dinas madrasah / dispensasi");
              }}
              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10px] rounded-lg border border-amber-300 cursor-pointer transition-all shadow-2xs"
            >
              🎖️ Tugas / Dispensasi
            </button>
          </div>

          {/* Notes Field */}
          {(["izin", "sakit", "alpha", "pjj"].includes(status) || notes.length > 0) && (
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-gray-800 tracking-wider">
                Keterangan / Alasan {status === "izin" || status === "pjj" ? "(Opsional)" : ""}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={250}
                rows={2}
                placeholder={status === "pjj" ? "Pelajaran Jarak Jauh (PJJ)..." : `Masukkan keterangan ${status}...`}
                className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 hover:border-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all resize-none"
              />
              <p className="text-[10px] text-gray-500 text-right">
                {notes.length}/250
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 font-bold border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:bg-lime-400 active:translate-y-0.5 transition-all text-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
