import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";

function parseScanError(msg = "") {
  const m = String(msg).toLowerCase();

  // 1. Waktu Habis / Di Luar Jam Operasional
  if (
    m.includes("antara") ||
    m.includes("jam operasional") ||
    m.includes("hanya dapat dilakukan antara") ||
    m.includes("belum dibuka") ||
    m.includes("sudah ditutup") ||
    m.includes("waktu")
  ) {
    return {
      type: "time_limit",
      title: "Di Luar Jam Operasional",
      badge: "WAKTU PRESENSI TUTUP / BELUM BUKA",
      badgeColor: "bg-amber-100 text-amber-950 border-amber-400",
      icon: "schedule",
      iconBg: "bg-amber-500",
      reason: "Pemindaian dilakukan di luar rentang jam operasional sekolah yang ditentukan.",
      solution: "Silakan periksa jam masuk/pulang di menu Pengaturan atau hubungi admin madrasah.",
    };
  }

  // 2. 2x Scan / Sudah Presensi Masuk
  if (
    m.includes("sudah melakukan check-in") ||
    m.includes("sudah absen") ||
    m.includes("sudah masuk") ||
    m.includes("duplikat") ||
    m.includes("2x")
  ) {
    return {
      type: "already_in",
      title: "Sudah Check-In Masuk",
      badge: "DUPLIKAT / 2x SCAN MASUK",
      badgeColor: "bg-blue-100 text-blue-950 border-blue-400",
      icon: "history",
      iconBg: "bg-blue-600",
      reason: "Siswa atau Guru ini sudah tercatat HADIR MASUK untuk hari ini.",
      solution: "Jika santri/guru hendak pulang, silakan klik tombol 'PULANG' di bagian atas sebelum scan.",
      canSwitchToCheckout: true,
    };
  }

  // 3. Sudah Presensi Pulang
  if (
    m.includes("sudah melakukan check-out") ||
    m.includes("sudah pulang") ||
    m.includes("selesai")
  ) {
    return {
      type: "already_out",
      title: "Sudah Presensi Pulang",
      badge: "SESI PRESENSI SELESAI",
      badgeColor: "bg-purple-100 text-purple-950 border-purple-400",
      icon: "task_alt",
      iconBg: "bg-purple-600",
      reason: "Presensi masuk dan pulang santri / dewan guru ini telah lengkap dicatat untuk hari ini.",
      solution: "Tidak perlu melakukan pemindaian lagi untuk hari ini.",
    };
  }

  // 4. Radius Lokasi GPS di Luar Sekolah
  if (
    m.includes("lokasi") ||
    m.includes("radius") ||
    m.includes("jangkauan") ||
    m.includes("meter") ||
    m.includes("gps")
  ) {
    return {
      type: "location_out",
      title: "Di Luar Radius Sekolah",
      badge: "LOKASI GPS DI LUAR JANGKAUAN",
      badgeColor: "bg-rose-100 text-rose-950 border-rose-400",
      icon: "wrong_location",
      iconBg: "bg-rose-600",
      reason: msg || "Posisi GPS perangkat terdeteksi berada di luar area madrasah yang diizinkan.",
      solution: "Pastikan Anda berada di lingkungan madrasah, aktifkan GPS akurasi tinggi, atau hubungkan ke stasiun PC sekolah.",
    };
  }

  // 5. QR Code Tidak Valid / Tidak Terdaftar
  if (
    m.includes("tidak valid") ||
    m.includes("tidak ditemukan") ||
    m.includes("signature") ||
    m.includes("kadaluarsa") ||
    m.includes("bukan qr")
  ) {
    return {
      type: "invalid_qr",
      title: "QR Code Tidak Dikenali",
      badge: "QR CODE TIDAK TERDAFTAR",
      badgeColor: "bg-red-100 text-red-950 border-red-400",
      icon: "qr_code_2",
      iconBg: "bg-red-600",
      reason: "Kode QR yang dipindai tidak terdaftar pada database santri atau dewan guru aktif.",
      solution: "Pastikan menggunakan kartu pelajar atau kartu guru resmi madrasah yang dicetak dari sistem.",
    };
  }

  // 6. Hari Libur
  if (m.includes("libur") || m.includes("holiday")) {
    return {
      type: "holiday",
      title: "Hari Libur Madrasah",
      badge: "HARI LIBUR TERJADWAL",
      badgeColor: "bg-teal-100 text-teal-950 border-teal-400",
      icon: "celebration",
      iconBg: "bg-teal-600",
      reason: "Hari ini tercatat sebagai hari libur madrasah atau libur nasional.",
      solution: "Kegiatan presensi otomatis ditiadakan pada hari libur.",
    };
  }

  // 7. Role Guru Dilarang Input Hadir Manual
  if (
    m.includes("role guru") ||
    m.includes("selain hadir") ||
    m.includes("wajib melalui scan")
  ) {
    return {
      type: "guru_restriction",
      title: "Hak Akses Terbatas",
      badge: "STATUS HADIR WAJIB SCAN QR",
      badgeColor: "bg-amber-100 text-amber-950 border-amber-400",
      icon: "block",
      iconBg: "bg-amber-600",
      reason: "Akun Guru tidak diizinkan menandai status Hadir secara manual.",
      solution: "Status Hadir hanya sah melalui pemindaian QR Code fisik di sekolah. Guru dapat mencatat Izin, Sakit, atau Alpha.",
    };
  }

  // Fallback Umum
  return {
    type: "general",
    title: "Pemindaian Gagal",
    badge: "KENDALA SISTEM",
    badgeColor: "bg-red-100 text-red-950 border-red-400",
    icon: "error",
    iconBg: "bg-red-600",
    reason: msg || "Terjadi kesalahan saat memproses data presensi.",
    solution: "Silakan coba lakukan pemindaian ulang atau laporkan kendala ke administrator madrasah.",
  };
}

export default function ScanResultModal({
  result,
  scanType,
  handleCloseModal,
  onSwitchScanType,
}) {
  const resultScanType = result?.scanType || scanType;
  const isResultCheckIn = resultScanType === "check_in";
  const personName =
    result?.data?.type === "student"
      ? result?.data?.student?.nama
      : result?.data?.teacher?.nama;
  const personNumber =
    result?.data?.student?.nisn ||
    result?.data?.student?.nisnn ||
    result?.data?.teacher?.nip ||
    "-";
  const resultTime = isResultCheckIn
    ? result?.data?.attendance?.check_in
    : result?.data?.attendance?.check_out;
  const displayTime = resultTime
    ? resultTime.slice(0, 5)
    : new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
  const displayDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();
  const settingsData =
    queryClient.getQueryData(["settings", effectiveLembaga]) ||
    queryClient.getQueryData(["global_settings", effectiveLembaga]);
  const timezoneSetting = settingsData?.data?.timezone || "Asia/Makassar";

  let tzLabel = "WITA";
  if (timezoneSetting === "Asia/Jakarta") tzLabel = "WIB";
  else if (timezoneSetting === "Asia/Jayapura") tzLabel = "WIT";

  const errorDiag = result && !result.success ? parseScanError(result.message) : null;

  return (
    <>
      {/* 1. Modal Sukses */}
      {result?.success && (result.data || result.manual) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 pt-9 max-w-xs sm:max-w-sm w-full animate-fade-in">
            {/* Header Icon Checkmark */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#4ade80] border-2 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-3xl text-gray-900 font-black">
                check
              </span>
            </div>

            {/* Judul */}
            <h2 className="font-black text-xl text-gray-900 text-center mb-5 tracking-tight uppercase">
              {result.manual
                ? result.message?.includes("PC") || result.message?.includes("Lokasi")
                  ? "LOKASI TERSINKRON"
                  : "BERHASIL DISIMPAN"
                : `BERHASIL ABSEN ${isResultCheckIn ? "MASUK" : "PULANG"}`}
            </h2>

            {/* Detail Info */}
            {result.manual ? (
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {result.message || "Status kehadiran berhasil disimpan"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-left mb-6 text-sm">
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">Nama</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900 truncate">
                    {personName}
                  </span>
                </div>
                <div className="grid grid-cols-[65px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">
                    {result.data?.type === "student" ? "NISN" : "NIP/NPK"}
                  </span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {personNumber}
                  </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">Waktu</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {displayTime} {tzLabel}
                  </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5">
                  <span className="font-bold text-gray-600">Tanggal</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900">{displayDate}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="w-full bg-primary-green hover:bg-lime-400 text-gray-900 font-black py-2.5 border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 cursor-pointer text-xs uppercase tracking-wider"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal Gagal dengan Diagnostik Lengkap */}
      {result && !result.success && errorDiag && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 pt-9 max-w-sm sm:max-w-md w-full animate-slide-up text-center space-y-4">
            {/* Header Icon Circle */}
            <div
              className={`absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 ${errorDiag.iconBg} border-2 border-gray-900 rounded-full flex items-center justify-center shadow-neo`}
            >
              <span className="material-symbols-outlined text-3xl text-white font-black">
                {errorDiag.icon}
              </span>
            </div>

            {/* Kategori Badge */}
            <div className="pt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${errorDiag.badgeColor}`}
              >
                {errorDiag.badge}
              </span>
            </div>

            {/* Judul Masalah */}
            <h2 className="font-black text-lg sm:text-xl text-gray-900 uppercase tracking-tight">
              {errorDiag.title}
            </h2>

            {/* Kotak Diagnostik Detail */}
            <div className="space-y-2.5 text-left text-xs bg-gray-50 border-2 border-gray-200 rounded-2xl p-3.5">
              {/* Pesan Asli dari Server */}
              <div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Pesan Notifikasi:
                </span>
                <p className="font-bold text-red-700 bg-red-50/80 p-2 rounded-lg border border-red-200 break-words leading-relaxed">
                  {result.message}
                </p>
              </div>

              {/* Analisis Penyebab */}
              <div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Analisis Penyebab:
                </span>
                <p className="text-gray-700 font-medium leading-relaxed">
                  {errorDiag.reason}
                </p>
              </div>

              {/* Solusi yang Dianjurkan */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 font-semibold flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-emerald-700 shrink-0 mt-0.5">
                  tips_and_updates
                </span>
                <div className="leading-snug">
                  <strong className="block text-[10px] font-black uppercase text-emerald-800 mb-0.5">
                    Solusi:
                  </strong>
                  {errorDiag.solution}
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-1">
              {/* Pintasan Ganti ke Mode Pulang jika terdeteksi 2x scan masuk */}
              {errorDiag.canSwitchToCheckout && onSwitchScanType && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchScanType("check_out");
                    handleCloseModal();
                  }}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Ganti ke Mode 'PULANG' & Scan</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-black py-2.5 rounded-xl shadow-neo border-2 border-gray-900 transition-all active:translate-y-0.5 cursor-pointer text-xs uppercase tracking-wider"
              >
                TUTUP & COBA LAGI
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
