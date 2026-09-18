import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useNoticeStore } from "../store/useNoticeStore";
import { format } from "date-fns";

export default function TeacherSelfCard() {
  const queryClient = useQueryClient();
  const [showQRModal, setShowQRModal] = useState(false);
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
  const note = todayAttendance?.note;

  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl shadow-neo p-4 sm:p-5 mb-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Profil & Status Guru */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-green/20 border-2 border-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            {teacher.foto ? (
              <img
                src={teacher.foto.startsWith("http") ? teacher.foto : `https://api.raudhatulyatama.sch.id${teacher.foto}`}
                alt={teacher.nama}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl sm:text-3xl text-gray-900">
                badge
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-md">
                Akun Guru Aktif • {teacher.lembaga?.toUpperCase() || "MA"}
              </span>
              <span className="text-xs text-gray-500 font-bold">
                {format(new Date(), "EEEE, d MMMM yyyy")}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-gray-900 truncate mt-0.5">
              {teacher.nama}
            </h2>
            <p className="text-xs text-gray-600 font-mono font-bold">
              {teacher.nip ? `NIP/NPK: ${teacher.nip}` : "Guru Pengajar"}
            </p>

            {/* Badge Status Kehadiran Hari Ini */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-600">Presensi Saya:</span>
              {status === "hadir" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                  Hadir Masuk: {checkIn ? checkIn.slice(0, 5) : "Tepat Waktu"}
                  {checkOut && ` • Pulang: ${checkOut.slice(0, 5)}`}
                </span>
              ) : status === "terlambat" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-400 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-amber-700">schedule</span>
                  Terlambat: {checkIn ? checkIn.slice(0, 5) : "Hadir"}
                  {checkOut && ` • Pulang: ${checkOut.slice(0, 5)}`}
                </span>
              ) : status === "izin" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-950 border border-purple-400 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-purple-700">info</span>
                  Izin {note ? `(${note})` : ""}
                </span>
              ) : status === "sakit" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-950 border border-blue-400 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-blue-700">emergency</span>
                  Sakit {note ? `(${note})` : ""}
                </span>
              ) : status === "alpha" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-950 border border-red-400 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-red-700">cancel</span>
                  Alpha (Tidak Hadir)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-black">
                  <span className="material-symbols-outlined text-sm text-gray-500">pending</span>
                  Belum Melakukan Presensi Hari Ini
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Aksi Mandiri Guru */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Tombol Tampilkan QR Card */}
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-primary-green hover:bg-lime-400 text-gray-900 border-2 border-gray-900 rounded-xl shadow-neo text-xs font-black flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Tampilkan QR Code pribadi saya untuk discan di madrasah"
          >
            <span className="material-symbols-outlined text-base">qr_code</span>
            <span>QR Saya</span>
          </button>

          {/* Tombol Kamera Scan */}
          <Link
            to="/scan"
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 border-2 border-gray-900 rounded-xl shadow-neo text-xs font-black flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all"
            title="Buka kamera untuk memindai QR presensi"
          >
            <span className="material-symbols-outlined text-base">qr_code_scanner</span>
            <span>Buka Scanner</span>
          </Link>

          {/* Tombol Ajukan Izin / Sakit Sendiri */}
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-gray-900 rounded-xl shadow-neo text-xs font-black flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Ajukan izin atau sakit mandiri jika berhalangan hadir"
          >
            <span className="material-symbols-outlined text-base">edit_calendar</span>
            <span>Izin / Sakit Sendiri</span>
          </button>
        </div>
      </div>

      {/* Modal QR Code Guru Mandiri */}
      {showQRModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 max-w-xs sm:max-w-sm w-full text-center animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-black text-sm uppercase text-gray-900">
                Kartu QR Presensi Guru
              </h3>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 border-2 border-emerald-400 rounded-2xl flex flex-col items-center justify-center">
              <div className="bg-white p-3 border-2 border-gray-900 rounded-xl shadow-sm">
                <QRCodeSVG
                  value={teacher.uuid}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <h4 className="font-black text-base text-gray-900 mt-3 truncate max-w-full">
                {teacher.nama}
              </h4>
              <p className="text-xs text-gray-600 font-mono font-bold">
                {teacher.nip || `GURU ${teacher.lembaga?.toUpperCase() || "MA"}`}
              </p>
            </div>

            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              Tunjukkan QR Code ini ke kamera scanner sekolah untuk mencatat kehadiran <strong>Hadir Masuk</strong> atau <strong>Pulang</strong>.
            </p>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Izin / Sakit Mandiri */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 max-w-sm w-full animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-black text-base text-gray-900">
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
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5">
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
                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5">
                  Pilih Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`cursor-pointer border-2 rounded-xl p-3 flex items-center justify-center gap-2 font-black text-xs transition-all ${
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
                    className={`cursor-pointer border-2 rounded-xl p-3 flex items-center justify-center gap-2 font-black text-xs transition-all ${
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
                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5">
                  Keterangan / Alasan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Misal: Keperluan keluarga mendesak / Istirahat medis..."
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-medium focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs border-2 border-gray-900 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="flex-1 py-2.5 bg-primary-green hover:bg-lime-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-xl shadow-neo transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
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
