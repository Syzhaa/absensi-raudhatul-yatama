import { useState, useMemo, useEffect } from "react";

export default function RecentScanLogs({ recentLogs }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const logs = recentLogs?.data || [];
  const totalItems = logs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 if current page is out of bounds after updates
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return logs.slice(startIndex, startIndex + itemsPerPage);
  }, [logs, currentPage]);

  const startIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers for pagination controls
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="w-full bg-white border-2 md:border-3 border-gray-900 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-neo flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#9bd47a] border-2 border-gray-900 flex items-center justify-center shadow-neo-sm">
            <span className="material-symbols-outlined text-lg text-gray-900 font-bold">
              history
            </span>
          </div>
          <div>
            <h2 className="font-black text-base md:text-lg text-gray-900 leading-tight">
              Riwayat Scan Hari Ini
            </h2>
            <p className="text-[11px] text-gray-500 font-semibold">
              Aktivitas presensi langsung realtime
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-gray-100 border-2 border-gray-900 rounded-full font-black text-xs text-gray-900 shadow-neo-sm">
          {totalItems} Scan
        </span>
      </div>

      {/* List Content */}
      <div className="flex-1 flex flex-col justify-between">
        {logs.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50/60 rounded-2xl border-2 border-dashed border-gray-300 my-auto">
            <span className="material-symbols-outlined text-5xl mb-2 text-gray-300">
              qr_code_scanner
            </span>
            <p className="font-bold text-sm text-gray-700">
              Belum ada riwayat scan hari ini
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Arahkan kartu QR siswa atau guru ke kamera untuk melakukan presensi.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paginatedLogs.map((log, index) => {
              const isCheckIn = !log.check_out;
              const name = log.student?.nama || log.teacher?.nama || "Unknown";
              const time = isCheckIn ? log.check_in : log.check_out;
              const isLate = log.status === "terlambat";
              const badgeColor = isCheckIn
                ? isLate
                  ? "bg-amber-300 text-amber-950"
                  : "bg-[#9bd47a] text-gray-900"
                : "bg-[#a78bfa] text-gray-900";
              const badgeText = isCheckIn
                ? isLate
                  ? "Masuk (Telat)"
                  : "Masuk"
                : "Pulang";
              const initials = (name || "")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={log.id || index}
                  className="bg-white hover:bg-gray-50/90 border-2 border-gray-900 rounded-2xl px-3.5 py-2.5 flex items-center gap-3 shadow-neo-sm transition-all hover:translate-x-0.5"
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-black text-xs border-2 border-gray-900 flex-shrink-0 shadow-sm ${
                      isCheckIn ? "bg-lime-100 text-lime-950" : "bg-purple-100 text-purple-950"
                    }`}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">
                      {name}
                    </p>
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 truncate">
                      <span>{log.student ? "Siswa" : "Guru"}</span>
                      <span>•</span>
                      <span className="text-gray-700 font-bold">
                        {log.student?.kelas ? `Kelas ${log.student.kelas}` : log.teacher?.mata_pelajaran || log.teacher?.mapel || "-"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2.5 text-right flex-shrink-0">
                    <span className="font-mono font-black text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-300">
                      {time ? time.slice(0, 5) : "-"}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border-2 border-gray-900 shadow-sm ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="mt-5 pt-3.5 border-t-2 border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs font-bold text-gray-500 order-2 sm:order-1">
              Menampilkan <span className="text-gray-900">{startIndex}</span>-
              <span className="text-gray-900">{endIndex}</span> dari{" "}
              <span className="text-gray-900">{totalItems}</span> data
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center justify-center font-black text-sm shadow-neo-sm active:translate-y-0.5 transition-all"
                  title="Halaman Sebelumnya"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>

                {/* Page Number Buttons */}
                {getPageNumbers().map((pageNum, i) =>
                  pageNum === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-gray-400 font-bold text-xs">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg border-2 border-gray-900 font-black text-xs transition-all ${
                        currentPage === pageNum
                          ? "bg-[#9bd47a] text-gray-900 shadow-neo-sm scale-105"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center justify-center font-black text-sm shadow-neo-sm active:translate-y-0.5 transition-all"
                  title="Halaman Berikutnya"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
