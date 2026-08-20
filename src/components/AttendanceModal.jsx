import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logsService } from "../services";

const STATUS_OPTIONS = [
  {
    value: "hadir",
    label: "Hadir (Masuk)",
    color: "bg-emerald-100 text-emerald-900 border-emerald-400",
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

  useEffect(() => {
    if (isOpen) {
      const currentStatus = student?.status && student.status !== "belum_absen"
        ? student.status
        : "hadir";
      setStatus(currentStatus);
      setNotes(student?.notes || "");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, student?.status, student?.notes]);

  if (!isOpen) return null;

  const isTeacher = student?.role === "teacher" || !!student?.teacher_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (student?.attendance_id) {
        await logsService.updateStatus(student.attendance_id, {
          status,
          notes,
          role: isTeacher ? "teacher" : "student",
        });
      } else {
        // Create new manual attendance
        const payload = {
          status,
          notes,
          date,
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white border-2 md:border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="bg-gray-50/50 border-b-2 md:border-3 border-gray-900 p-4 md:p-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base md:text-lg text-gray-900">
              Edit Absensi
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              {student?.nama || student?.student?.nama || "Siswa"} -{" "}
              {student?.kelas || student?.student?.kelas ? `Kelas ${student.kelas || student.student.kelas}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4">
          {/* Student Info */}
          {student && (
            <div className="bg-gray-100/50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-600 text-lg">
                  person
                </span>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {student?.nama || student?.student?.nama || "Nama tidak tersedia"}
                  </p>
                  {false && (
                    <p className="text-xs text-gray-500">NISN: {student.nisn || student.student?.nisn}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              Status Absensi
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`relative cursor-pointer border-2 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 transition-all ${
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
                    onChange={(e) => setStatus(e.target.value)}
                    className="hidden"
                  />
                  <span className="text-[11px] md:text-xs font-black">
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

          {/* Notes Field - for izin/sakit/alpha */}
          {["izin", "sakit", "alpha"].includes(status) && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                Keterangan {status === "izin" ? "(Opsional)" : ""}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder={`Masukkan keterangan ${status}...`}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 hover:border-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all resize-none"
              />
              <p className="text-xs text-gray-500 text-right">
                {notes.length}/250 karakter
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold border-2 border-gray-200 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-primary-green text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
