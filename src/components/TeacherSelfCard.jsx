import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useNoticeStore } from "../store/useNoticeStore";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function TeacherSelfCard() {
  const queryClient = useQueryClient();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState("izin");
  const [leaveNote, setLeaveNote] = useState("");

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    staleTime: 60 * 1000,
  });

  const user = userData?.data;
  const teacher = user?.teacher;
  const isGuru = user?.role === "guru";

  const submitLeaveMutation = useMutation({
    mutationFn: async ({ status, note }) => {
      if (!teacher?.id) throw new Error("Data guru tidak ditemukan");
      const res = await api.post(`/attendance/teachers/${teacher.id}/attendance-status`, {
        status,
        note,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      return res.data;
    },
    onSuccess: (data) => {
      import("../utils/scanAudio").then((m) => m.playLeaveSubmitted(leaveStatus));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["guru-roster"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_teachers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      useNoticeStore.getState().showSuccess(data.message || "Pengajuan kehadiran mandiri berhasil dicatat.");
      setShowLeaveModal(false);
      setLeaveNote("");
    },
    onError: (error) => {
      useNoticeStore.getState().showError(
        error.response?.data?.message || "Gagal mencatat izin/sakit mandiri."
      );
    },
  });

  if (!isGuru || !teacher) return null;

  const todayAttendance = teacher.attendance_today;
  const status = todayAttendance?.status;
  const checkIn = todayAttendance?.check_in;
  const checkOut = todayAttendance?.check_out;
  const note = todayAttendance?.notes || todayAttendance?.note;

  // Logika status presensi
  const hasCheckIn = !!checkIn;
  const hasCheckOut = !!checkOut;
  const hasScanned = hasCheckIn || status === "hadir" || status === "terlambat";
  const hasLeave = status === "izin" || status === "sakit";
  const isCompleted = hasCheckIn && hasCheckOut;

  // Tombol izin/sakit HANYA tampil jika guru belum scan masuk dan belum izin/sakit
  const canRequestLeave = !hasScanned && !hasLeave;

  return (
    <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo p-3.5 sm:p-4 mb-3 space-y-3 animate-fade-in">
      {/* Header Guru: Avatar + Identitas Ringkas */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-emerald-100 border-2 border-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            {teacher.foto ? (
              <img
                src={teacher.foto.startsWith("http") ? teacher.foto : `https://api.raudhatulyatama.sch.id${teacher.foto}`}
                alt={teacher.nama}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-gray-900">
                badge
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-md">
                GURU • {teacher.lembaga?.toUpperCase() || "MA"}
              </span>
              <span className="text-[11px] text-gray-500 font-bold">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-gray-900 truncate leading-snug mt-0.5">
              {teacher.nama}
            </h2>

            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium truncate">
              {teacher.nip ? (
                <span className="font-mono font-bold text-gray-700">NPK: {teacher.nip}</span>
              ) : null}
              {teacher.mata_pelajaran && (
                <span className="text-gray-500 truncate">• {teacher.mata_pelajaran}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Baris Status Presensi Hari Ini */}
      <div className="p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-600">Status Presensi:</span>
          {hasScanned ? (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${
                status === "terlambat"
                  ? "bg-amber-100 text-amber-950 border-amber-400"
                  : "bg-emerald-100 text-emerald-950 border-emerald-400"
              }`}
            >
              <span className="material-symbols-outlined text-xs">
                {status === "terlambat" ? "schedule" : "check_circle"}
              </span>
              <span>{status === "terlambat" ? "Terlambat" : "Hadir"}</span>
            </span>
          ) : hasLeave ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 text-purple-950 border border-purple-400 rounded-lg font-black text-[11px] capitalize">
              <span className="material-symbols-outlined text-xs">
                {status === "sakit" ? "emergency" : "info"}
              </span>
              <span>{status} {note ? `(${note})` : ""}</span>
            </span>
          ) : status === "alpha" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-950 border border-red-400 rounded-lg font-black text-[11px]">
              <span className="material-symbols-outlined text-xs">cancel</span>
              <span>Alpha</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-200 text-gray-800 rounded-lg font-black text-[11px]">
              <span className="material-symbols-outlined text-xs">pending</span>
              <span>Belum Presensi</span>
            </span>
          )}
        </div>

        {/* Info Jam Masuk & Pulang */}
        {hasScanned && (
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Masuk: {checkIn ? checkIn.slice(0, 5) : "-"}
            </span>
            <span className={`px-2 py-0.5 rounded border ${
              hasCheckOut 
                ? "text-purple-800 bg-purple-50 border-purple-200" 
                : "text-gray-500 bg-gray-100 border-gray-200"
            }`}>
              Pulang: {hasCheckOut ? checkOut.slice(0, 5) : "Belum"}
            </span>
          </div>
        )}
      </div>

      {/* Baris Tombol Aksi Mandiri Guru */}
      <div className="pt-1">
        {/* SKENARIO 1: Belum scan sama sekali -> Tampil Scan Masuk & Izin/Sakit */}
        {canRequestLeave && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/scan"
              className="py-2.5 px-3 bg-primary-green hover:bg-emerald-400 text-gray-900 border-2 border-gray-900 rounded-xl shadow-neo text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all"
              title="Scan QR presensi masuk sekolah"
            >
              <span className="material-symbols-outlined text-base">qr_code_scanner</span>
              <span>Scan QR Masuk</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="py-2.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-gray-900 rounded-xl shadow-neo text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Ajukan izin atau sakit mandiri jika berhalangan hadir"
            >
              <span className="material-symbols-outlined text-base">edit_calendar</span>
              <span>Izin / Sakit Sendiri</span>
            </button>
          </div>
        )}

        {/* SKENARIO 2: Sudah scan masuk tapi belum scan pulang -> Izin/sakit HILANG, tampil tombol Scan Pulang */}
        {hasScanned && !hasCheckOut && (
          <div>
            <Link
              to="/scan"
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-gray-900 border-2 border-gray-900 rounded-xl shadow-neo text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
              title="Scan QR Code presensi pulang"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Scan QR Pulang Sekolah</span>
            </Link>
          </div>
        )}

        {/* SKENARIO 3: Sudah scan masuk DAN sudah scan pulang -> Presensi Lengkap */}
        {isCompleted && (
          <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-950 border-2 border-emerald-600 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-base text-emerald-700">task_alt</span>
            <span>Presensi Hari Ini Lengkap (Masuk & Pulang Tercatat)</span>
          </div>
        )}

        {/* SKENARIO 4: Guru sudah mengajukan izin / sakit mandiri */}
        {hasLeave && (
          <div className="w-full py-2 px-3 bg-purple-50 text-purple-950 border-2 border-purple-500 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-base text-purple-700">info</span>
            <span>Pengajuan {status.toUpperCase()} Mandiri Telah Dicatat</span>
          </div>
        )}
      </div>

      {/* Modal Izin / Sakit Mandiri */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-5 sm:p-6 max-w-sm w-full animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-black text-sm sm:text-base text-gray-900">
                Pengajuan Izin / Sakit Mandiri
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLeaveMutation.mutate({
                  status: leaveStatus,
                  note: leaveNote,
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                  Nama Guru
                </label>
                <input
                  type="text"
                  readOnly
                  value={teacher.nama}
                  className="w-full px-3 py-2 bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                  Pilih Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`cursor-pointer border-2 rounded-xl p-2.5 flex items-center justify-center gap-1.5 font-black text-xs transition-all ${
                      leaveStatus === "izin"
                        ? "bg-purple-100 border-gray-900 text-purple-950 shadow-neo"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveStatus"
                      value="izin"
                      checked={leaveStatus === "izin"}
                      onChange={(e) => setLeaveStatus(e.target.value)}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-base text-purple-700">info</span>
                    <span>IZIN</span>
                  </label>

                  <label
                    className={`cursor-pointer border-2 rounded-xl p-2.5 flex items-center justify-center gap-1.5 font-black text-xs transition-all ${
                      leaveStatus === "sakit"
                        ? "bg-blue-100 border-gray-900 text-blue-950 shadow-neo"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveStatus"
                      value="sakit"
                      checked={leaveStatus === "sakit"}
                      onChange={(e) => setLeaveStatus(e.target.value)}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-base text-blue-700">emergency</span>
                    <span>SAKIT</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-700 mb-1">
                  Keterangan / Alasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Misal: Keperluan dinas / kesehatan..."
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-medium focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs border-2 border-gray-900 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="flex-1 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-xl shadow-neo transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">
                    {submitLeaveMutation.isPending ? "sync" : "send"}
                  </span>
                  <span>{submitLeaveMutation.isPending ? "Menyimpan..." : "Kirim Pengajuan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
