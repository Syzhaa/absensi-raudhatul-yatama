import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { attendanceService } from "../services";
import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useScanner } from "../hooks/useScanner";
import ScanResultModal from "../components/ScanResultModal";
import ManualAttendanceForm from "../components/ManualAttendanceForm";
import RecentScanLogs from "../components/RecentScanLogs";

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [scanType, setScanType] = useState("check_in");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    teacher_id: "",
    status: "izin",
    note: "",
  });
  const html5QrCodeRef = useRef(null);
  const restartTimerRef = useRef(null);
  const lastScannedRef = useRef(null);
  const scanTypeRef = useRef("check_in");
  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();

  // Fetch recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ["recentLogs", effectiveLembaga],
    queryFn: () => attendanceService.getRecentLogs(5, effectiveLembaga),
    refetchInterval: 10000,
  });

  // Fetch teachers list for manual form
  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => import("../services").then((m) => m.teacherService.getAll()),
    enabled: showManualForm,
  });

  useEffect(() => {
    scanTypeRef.current = scanType;
  }, [scanType]);

  // SSE Realtime Updates for Scan logs
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const connectSSE = async () => {
      try {
        const token =
          localStorage.getItem("auth_token") || localStorage.getItem("token");
        const isTestMode = useAppStore.getState().isTestMode;
        const today = format(new Date(), "yyyy-MM-dd");

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/logs/stream?date=${today}${isTestMode ? "&is_test=1" : ""}${effectiveLembaga ? `&lembaga=${effectiveLembaga}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: abortController.signal,
          },
        );

        if (!response.ok) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunks = decoder.decode(value).split("\n\n");
          for (const chunk of chunks) {
            if (chunk.startsWith("data: ")) {
              try {
                const data = JSON.parse(chunk.substring(6));

                queryClient.setQueryData(
                  ["recentLogs", effectiveLembaga],
                  (old) => {
                    const currentLogs = old?.data || [];
                    // Remove if already exists
                    const filteredLogs = currentLogs.filter(
                      (log) =>
                        log.id !== data.id ||
                        (log.student?.id !== data.student?.id &&
                          log.teacher?.id !== data.teacher?.id),
                    );

                    // Add to top and keep only 5
                    const newLogs = [data, ...filteredLogs].slice(0, 5);
                    return { ...old, data: newLogs };
                  },
                );

                // Also invalidate the main attendance list so the dashboard is kept up to date
                queryClient.invalidateQueries({
                  queryKey: ["attendance_students"],
                });
                queryClient.invalidateQueries({
                  queryKey: ["attendance_teachers"],
                });
              } catch (e) {}
            }
          }
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setTimeout(connectSSE, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [queryClient]);

  const scanMutation = useMutation({
    mutationFn: (uuid) => attendanceService.scan(uuid, scanTypeRef.current),
    onSuccess: (data) => {
      const activeScanType = scanTypeRef.current;
      setResult({
        success: true,
        type: data.data.type,
        data: data.data,
        scanType: activeScanType,
      });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_students"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_teachers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      // Auto-clear result after 2.5 seconds to ready for next scan visually
      setTimeout(() => {
        setResult(null);
      }, 2500);
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.response?.data?.message || "Scan gagal",
      });

      // Auto-clear result after 2.5 seconds to ready for next scan visually
      setTimeout(() => {
        setResult(null);
      }, 2500);
    },
  });

  const manualSubmitMutation = useMutation({
    mutationFn: async (data) => {
      const { teacherService } = await import("../services");
      return teacherService.setAttendanceStatus(data.teacher_id, {
        status: data.status,
        note: data.note,
        date: format(new Date(), "yyyy-MM-dd"),
        is_test: useAppStore.getState().isTestMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_teachers"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_students"] });
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setResult({
        success: true,
        manual: true,
        message: "Status kehadiran berhasil disimpan",
      });
      setManualFormData({ teacher_id: "", status: "izin", note: "" });
      setShowManualForm(false);
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.response?.data?.message || "Gagal menyimpan status",
      });
    },
  });

  const { startScanning, stopScanning } = useScanner({
    html5QrCodeRef,
    lastScannedRef,
    scanTypeRef,
    scanMutation,
    setScanning,
    setResult,
    setCameraError,
  });

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const handleSwitchTab = async (type) => {
    if (type === "manual") {
      // Switch to manual form mode
      await stopScanning();
      setShowManualForm(true);
      setScanType("check_in"); // Reset scan type
      scanTypeRef.current = "check_in";
      lastScannedRef.current = null;
    } else {
      // Switch to scan mode (check_in or check_out)
      setShowManualForm(false);
      scanTypeRef.current = type;
      setScanType(type);
      lastScannedRef.current = null;
      if (!scanning && !result) {
        startScanning();
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualFormData.teacher_id) {
      alert("Pilih guru terlebih dahulu");
      return;
    }
    manualSubmitMutation.mutate(manualFormData);
  };

  const handleCloseModal = async () => {
    setResult(null);
    lastScannedRef.current = null;
    await startScanning();
  };


  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 pb-28 md:pb-8 max-w-lg mx-auto">
      {/* 1. Navigasi Mode (Toggle Tabs) di Atas Kamera */}
      <div className="w-full max-w-sm bg-white/90 p-1.5 rounded-full border-3 border-gray-900 shadow-neo flex items-center mb-5 landscape:mb-2">
        <button
          onClick={() => handleSwitchTab("check_in")}
          className={`flex-1 py-2.5 px-3 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none ${
            scanType === "check_in" && !showManualForm
              ? "bg-[#9bd47a] text-gray-900 border-2 border-gray-900 shadow-sm"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="material-symbols-outlined text-lg">login</span>
          <span>MASUK</span>
        </button>
        <button
          onClick={() => handleSwitchTab("check_out")}
          className={`flex-1 py-2.5 px-3 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none ${
            scanType === "check_out" && !showManualForm
              ? "bg-[#9bd47a] text-gray-900 border-2 border-gray-900 shadow-sm"
              : "bg-transparent text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>PULANG</span>
        </button>
      </div>

      {/* 2. Area Kamera (Viewfinder) - Hidden when manual form active */}
      {!showManualForm && (
        <div className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-3xl border-3 border-gray-900 overflow-hidden shadow-neo-lg">
          {/* QR Reader Viewport */}
          <div id="qr-reader" className="w-full h-full" />

          {/* Visual Bracket Scanner Corners */}
          <div className="absolute inset-6 pointer-events-none z-10 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-9 h-9 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
              <div className="w-9 h-9 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
            </div>
            <div className="flex justify-between">
              <div className="w-9 h-9 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
              <div className="w-9 h-9 border-b-4 border-r-4 border-white rounded-br-xl"></div>
            </div>
          </div>

          {/* Animated Scanning Line */}
          {scanning && (
            <div className="animate-scan-line h-1 bg-[#4ade80] shadow-[0_0_15px_#4ade80] absolute w-full left-0 z-20 pointer-events-none"></div>
          )}

          {/* Placeholder when not scanning */}
          {!scanning && !cameraError && (
            <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white z-10 p-4 text-center">
              <span className="material-symbols-outlined text-5xl mb-2 text-gray-400">
                videocam_off
              </span>
              <p className="font-bold text-sm text-gray-300">
                Kamera tidak aktif
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manual Form - Input Izin/Sakit/Alpha */}
      {showManualForm && (
        <ManualAttendanceForm
          manualFormData={manualFormData}
          setManualFormData={setManualFormData}
          teachersData={teachersData}
          manualSubmitMutation={manualSubmitMutation}
          handleManualSubmit={handleManualSubmit}
        />
      )}

      {/* Camera Error Message (Minimalist 1-Line) */}
      {cameraError && (
        <div className="w-full max-w-sm mt-3 px-3.5 py-2 bg-red-100/90 border-2 border-gray-900 rounded-xl shadow-neo-sm flex items-center justify-between text-red-600 text-xs font-bold gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <span className="material-symbols-outlined text-base flex-shrink-0 text-red-600">
              error
            </span>
            <span className="truncate">{cameraError}</span>
          </div>
          <button
            onClick={startScanning}
            className="flex-shrink-0 px-2.5 py-1 bg-white hover:bg-red-50 text-gray-900 font-black border-1.5 border-gray-900 rounded-lg shadow-sm text-[11px] active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Tombol 'Stop Scan' - Hidden when manual form active */}
      {!showManualForm && (
        <div className="w-full max-w-sm mt-5">
          {scanning ? (
            <button
              onClick={stopScanning}
              className="w-full bg-[#e5e7eb] hover:bg-gray-300 text-gray-900 font-extrabold py-3 px-6 border-3 border-gray-900 rounded-2xl shadow-neo transition-all flex items-center justify-center gap-2 text-base"
            >
              <span className="material-symbols-outlined text-xl">
                visibility_off
              </span>
              <span>Stop Scan</span>
            </button>
          ) : (
            <button
              onClick={startScanning}
              className="w-full bg-[#9bd47a] hover:bg-lime-400 text-gray-900 font-extrabold py-3 px-6 border-3 border-gray-900 rounded-2xl shadow-neo transition-all flex items-center justify-center gap-2 text-base"
            >
              <span className="material-symbols-outlined text-xl">
                videocam
              </span>
              <span>Mulai Scan</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Modal Dialog Sukses Absensi (Popup) */}
      <ScanResultModal
        result={result}
        scanType={scanType}
        handleCloseModal={handleCloseModal}
      />

      {/* Recent Logs Section */}
      <RecentScanLogs recentLogs={recentLogs} />
    </div>
  );
}
