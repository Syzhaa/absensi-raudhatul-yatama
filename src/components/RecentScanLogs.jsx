export default function RecentScanLogs({ recentLogs }) {
  return (
    <>
      {recentLogs?.data && recentLogs.data.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-3">
          <h2 className="font-black text-base text-gray-800 uppercase tracking-tight">
            Riwayat Scan Hari Ini
          </h2>
          <div className="space-y-2.5">
            {recentLogs.data.map((log, index) => {
              // Determine if it was a check in or check out action based on check_out field
              const isCheckIn = !log.check_out;
              const name = log.student?.nama || log.teacher?.nama || "Unknown";
              const time = isCheckIn ? log.check_in : log.check_out;
              const badgeColor = isCheckIn
                ? "bg-[#9bd47a] text-gray-900"
                : "bg-primary-purple text-white";
              const badgeText = isCheckIn ? "Masuk" : "Pulang";
              const initials = (name || "")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={index}
                  className="bg-white border-2 border-gray-900 rounded-xl px-3.5 py-2.5 flex items-center gap-3 shadow-neo"
                >
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full font-black text-xs border border-gray-900 ${isCheckIn ? "bg-lime-100" : "bg-purple-100"}`}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.student ? "Siswa" : "Guru"} •{" "}
                      {log.student?.kelas || log.teacher?.mapel || "-"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono font-bold text-xs text-gray-800">
                      {time?.slice(0, 5)}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-gray-900 ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
