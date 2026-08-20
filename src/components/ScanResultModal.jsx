import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";

export default function ScanResultModal({ result, scanType, handleCloseModal }) {
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
  const settingsData = queryClient.getQueryData(["settings", effectiveLembaga]) 
                    || queryClient.getQueryData(["global_settings", effectiveLembaga]);
  const timezoneSetting = settingsData?.data?.timezone || "Asia/Makassar";
  
  let tzLabel = "WITA";
  if (timezoneSetting === "Asia/Jakarta") tzLabel = "WIB";
  else if (timezoneSetting === "Asia/Jayapura") tzLabel = "WIT";

  return (
    <>
      {result?.success && (result.data || result.manual) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo-xl p-6 pt-9 max-w-xs sm:max-w-sm w-full animate-fade-in">
            {/* Header Icon Checkmark (Centang besar hijau menonjol ke luar) */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#4ade80] border-3 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-3xl text-white font-black">
                check
              </span>
            </div>

            {/* Judul */}
            <h2 className="font-black text-xl text-gray-900 text-center mb-5 tracking-tight uppercase">
              {result.manual
                ? "BERHASIL DISIMPAN"
                : `BERHASIL ABSEN ${isResultCheckIn ? "MASUK" : "PULANG"}`}
            </h2>

            {/* Detail Info - conditional for manual vs scan */}
            {result.manual ? (
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {result.message || "Status kehadiran guru berhasil disimpan"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-left mb-6 text-sm">
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">Name</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900 truncate">
                    {personName}
                  </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">
                    {result.data.type === "student" ? "NIS" : "NIP"}
                  </span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900">
                    {personNumber}
                  </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                  <span className="font-bold text-gray-600">Time</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900">
                    {displayTime} {tzLabel}
                  </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5">
                  <span className="font-bold text-gray-600">Date</span>
                  <span className="font-bold text-gray-600">:</span>
                  <span className="font-bold text-gray-900">{displayDate}</span>
                </div>
              </div>
            )}

            {/* Tombol Aksi Kapsul */}
            <button
              onClick={handleCloseModal}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-black py-2.5 border-3 border-gray-900 rounded-full shadow-neo transition-all active:translate-y-0.5"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo-xl p-6 pt-9 max-w-xs sm:max-w-sm w-full animate-fade-in text-center">
            {/* Header Icon Cross */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-red-500 border-3 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-3xl text-white font-black">
                close
              </span>
            </div>

            <h2 className="font-black text-xl text-gray-900 text-center mb-3 tracking-tight uppercase">
              ABSEN GAGAL
            </h2>

            <p className="text-sm font-semibold text-red-600 mb-6 bg-red-50 p-3 rounded-xl border border-red-200">
              {result.message}
            </p>

            <button
              onClick={handleCloseModal}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-black py-2.5 border-3 border-gray-900 rounded-full shadow-neo transition-all active:translate-y-0.5"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}
    </>
  );
}
