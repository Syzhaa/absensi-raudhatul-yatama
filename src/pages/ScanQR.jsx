import DesktopLocationSync from "../components/DesktopLocationSync";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import api from "../services/api";
import { attendanceService } from "../services";
import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAttendanceSettings } from "../hooks/useAttendanceSettings";
import { useScanner } from "../hooks/useScanner";
import ScanResultModal from "../components/ScanResultModal";
import ManualAttendanceForm from "../components/ManualAttendanceForm";
import RecentScanLogs from "../components/RecentScanLogs";
import {
  playSuccessCheckin,
  playLateCheckin,
  playSuccessCheckout,
  playSpecificErrorSound,
} from "../utils/scanAudio";

// Formula Haversine: Hitung jarak akurat antar titik koordinat dalam satuan meter
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getLocationSessionKey(lembaga) {
  const norm = (lembaga || "ma").toLowerCase();
  return `yatama_location_sync_session_${norm}`;
}

function getCachedLocationSession(lembaga) {
  try {
    const key = getLocationSessionKey(lembaga);
    // Jika perangkat adalah HP/Mobile, jangan pakai cache bypass PC (wajib baca GPS asli perangkat)
    if (!isDesktopDevice()) {
      localStorage.removeItem(key);
      localStorage.removeItem("yatama_location_sync_session");
      return null;
    }
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Hapus jika sesi berasal dari bypass alternatif lama
    if (parsed?.isFallbackVerified) {
      localStorage.removeItem(key);
      localStorage.removeItem("yatama_location_sync_session");
      return null;
    }
    if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
      const norm = (lembaga || "ma").toLowerCase();
      if (!parsed.lembaga || parsed.lembaga.toLowerCase() === norm) {
        return parsed;
      }
    }
    localStorage.removeItem(key);
  } catch {
    try {
      localStorage.removeItem(getLocationSessionKey(lembaga));
      localStorage.removeItem("yatama_location_sync_session");
    } catch {}
  }
  return null;
}

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

  // Fetch school settings (GPS coordinates & radius) using centralized hook
  const { settings, enableLocationCheck, isLoading: isSettingsLoading } = useAttendanceSettings();

  // GPS Location states & detection (Isolated Per Lembaga)
  const [coords, setCoords] = useState(() => getCachedLocationSession(effectiveLembaga));
  const [locationError, setLocationError] = useState(null);
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(() => {
    const cached = getCachedLocationSession(effectiveLembaga);
    return isDesktop && !cached?.isPcVerified;
  });
  const [isLocating, setIsLocating] = useState(false);
  const coordsRef = useRef(getCachedLocationSession(effectiveLembaga));

  const userRole = useAppStore((state) => state.userRole);
  const isAdminRole = [
    "super_admin",
    "admin_yayasan",
    "admin_ma",
    "admin_mts",
    "admin_akademik",
    "petugas_absen",
  ].includes(userRole);

  // Wajib validasi jika enableLocationCheck aktif (default true jika undefined)
  const isLocationRequired = enableLocationCheck !== false;
  const schoolLat =
    settings?.latitude !== undefined && settings?.latitude !== null
      ? parseFloat(settings.latitude)
      : -3.3747649;
  const schoolLon =
    settings?.longitude !== undefined && settings?.longitude !== null
      ? parseFloat(settings.longitude)
      : 114.646542;
  const radiusMax = settings?.radius_meters
    ? parseInt(settings.radius_meters, 10)
    : 150;

  const setPcSchoolLocation = () => {
    const activeLembagaNorm = (effectiveLembaga || "ma").toLowerCase();
    const c = {
      latitude: schoolLat,
      longitude: schoolLon,
      accuracy: 5,
      isPcVerified: true,
      lembaga: activeLembagaNorm,
      expiresAt: Date.now() + 3 * 3600 * 1000,
    };
    try {
      localStorage.setItem(getLocationSessionKey(effectiveLembaga), JSON.stringify(c));
      localStorage.setItem("yatama_location_sync_session", JSON.stringify(c));
    } catch {}
    setCoords(c);
    coordsRef.current = c;
    setLocationError(null);
    setIsLocating(false);
    setIsDesktopBlocked(false);
  };

  const detectLocation = () => {
    const cachedForLembaga = getCachedLocationSession(effectiveLembaga);
    // Jika PC sudah terverifikasi untuk lembaga aktif ini, langsung aktif!
    if (coords?.isPcVerified || cachedForLembaga?.isPcVerified) {
      setIsLocating(false);
      setLocationError(null);
      setIsDesktopBlocked(false);
      return;
    }

    if (isDesktop && !coords?.isPcVerified) {
      setIsDesktopBlocked(true);
      setIsLocating(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Browser tidak mendukung sensor GPS.");
      return;
    }
    
    setIsLocating(true);
    setLocationError(null);

    const onPosSuccess = (pos) => {
      const c = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setCoords(c);
      coordsRef.current = c;
      setIsLocating(false);
      setLocationError(null);
    };

    // 1. Coba Satelit Berakurasi Tinggi (GPS Satelit HP) - timeout 10 detik
    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      (err1) => {
        // 2. Jika sinyal satelit lemah/timeout di dalam kelas, coba Jaringan/Cellular/Wi-Fi - timeout 12 detik
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          (err2) => {
            setIsLocating(false);
            const err = err2 || err1;
            if (err.code === 1) {
              setLocationError("Izin lokasi ditolak. Silakan izinkan akses lokasi di browser/HP Anda.");
            } else if (err.code === 3) {
              setLocationError("Pencarian satelit GPS timeout (sinyal terhalang ruangan). Silakan klik 'Coba Lagi GPS'.");
            } else if (err.code === 2) {
              setLocationError("Sinyal GPS tidak terdeteksi di dalam ruangan. Silakan geser ke dekat jendela/luar.");
            } else {
              setLocationError("Sinyal GPS belum terkunci. Silakan klik 'Coba Lagi GPS'.");
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 180000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Bersihkan cache 3 jam dari tombol bypass sebelumnya di HP/mobile
  useEffect(() => {
    if (!isDesktop) {
      try {
        localStorage.removeItem("yatama_location_sync_session");
        ["ma", "mts", "yayasan"].forEach((lem) => {
          localStorage.removeItem(getLocationSessionKey(lem));
        });
      } catch {}
    }
  }, [isDesktop]);

  // Re-evaluate verification status per lembaga
  useEffect(() => {
    const cachedForLembaga = getCachedLocationSession(effectiveLembaga);
    setCoords(cachedForLembaga || null);
    coordsRef.current = cachedForLembaga || null;
    const blocked = isDesktop && !cachedForLembaga?.isPcVerified;
    setIsDesktopBlocked(blocked);
    setLocationError(null);

    if (isLocationRequired) {
      if (cachedForLembaga?.isPcVerified) {
        setIsLocating(false);
      } else {
        detectLocation();
      }
    }
  }, [effectiveLembaga, isLocationRequired, isDesktop]);

  // Live GPS tracking: otomatis perbarui koordinat satelit saat perangkat terkunci
  useEffect(() => {
    if (!navigator.geolocation || isDesktop) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!coordsRef.current?.isPcVerified && !coordsRef.current?.isFallbackVerified) {
          const c = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(c);
          coordsRef.current = c;
          setLocationError(null);
          setIsLocating(false);
        }
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isDesktop]);

  const currentDistance =
    coords && schoolLat && schoolLon
      ? getDistance(coords.latitude, coords.longitude, schoolLat, schoolLon)
      : null;

  // Toleransi BTS/Jaringan Seluler:
  // Jika perangkat berada di lingkungan madrasah tetapi menggunakan triangulasi BTS (misal di dalam ruangan),
  // akurasi HP membaca 100m-600m.
  // Selama jarak fisik <= 650m dan lingkaran akurasi mencakup area madrasah, presensi SAH.
  // Jika jarak > 650m (misal 2000m di rumah), toleransi BTS DITOLAK TOTAL (maksimal diskon hanya 30m).
  const rawAccuracy = coords?.accuracy || 0;
  const isCellularBtsDrift = currentDistance !== null && currentDistance <= 650 && rawAccuracy >= 100;

  const accuracyDeduction = currentDistance !== null && currentDistance <= 650
    ? (isCellularBtsDrift ? Math.min(rawAccuracy, 550) : Math.min(rawAccuracy, 50))
    : Math.min(rawAccuracy, 30);

  const effectiveDistance =
    currentDistance !== null
      ? Math.max(0, currentDistance - accuracyDeduction)
      : null;

  const isWithinRadius =
    !isLocationRequired ||
    coords?.isPcVerified ||
    (effectiveDistance !== null && effectiveDistance <= radiusMax && currentDistance <= 650);

  // Fetch recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ["recentLogs", effectiveLembaga],
    queryFn: () => attendanceService.getRecentLogs(100, effectiveLembaga),
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
  // SSE disabled - data will refresh on page navigation/scan instead
  useEffect(() => {
    // No-op: SSE stream removed to avoid CORS complexity
    // Recent logs will update via invalidateQueries after scan
    return () => {};
  }, [queryClient]);

  const scanMutation = useMutation({
    mutationFn: (uuid) => attendanceService.scan(uuid, scanTypeRef.current, coordsRef.current),
    onSuccess: (data) => {
      const activeScanType = scanTypeRef.current;
      const person = data.data?.student || data.data?.teacher;
      const personName = person?.nama || "";
      const attendanceStatus = data.data?.attendance?.status;

      setResult({
        success: true,
        type: data.data.type,
        data: data.data,
        scanType: activeScanType,
      });
      
      // Play audio feedback spesifik sesuai tipe & ketepatan waktu
      if (activeScanType === 'check_out') {
        playSuccessCheckout(personName);
      } else if (attendanceStatus === 'terlambat') {
        playLateCheckin(personName);
      } else {
        playSuccessCheckin(personName);
      }

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
      const errorMsg = error.response?.data?.message || "Scan gagal";
      setResult({
        success: false,
        message: errorMsg,
      });
      
      // Play sound spesifik dengan pengumuman suara sesuai jenis kesalahan
      playSpecificErrorSound(errorMsg);
      // Tetap tampilkan modal kegagalan agar user bisa membaca diagnosis penyebab kegagalan
    },
  });

  const manualSubmitMutation = useMutation({
    mutationFn: async (data) => {
      const { teacherService } = await import("../services");
      return teacherService.setAttendanceStatus(data.teacher_id, {
        status: data.status,
        note: data.note,
        date: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: (_res, variables) => {
      import("../utils/scanAudio").then((m) => m.playLeaveSubmitted(variables?.status || "izin"));
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

  const onBeforeScan = () => {
    if (isLocationRequired) {
      if (!coordsRef.current) {
        return {
          valid: false,
          message: "Lokasi GPS belum terdeteksi. Silakan klik tombol 'Refresh GPS' di atas kamera.",
        };
      }
      if (!coords?.isPcVerified && (effectiveDistance === null || effectiveDistance > radiusMax || currentDistance > 650)) {
        return {
          valid: false,
          message: `Di luar jangkauan sekolah (${Math.round(currentDistance || 0)}m). Presensi hanya sah di lingkungan madrasah (maks ${radiusMax}m).`,
        };
      }
    }
    return { valid: true };
  };

  const { startScanning, stopScanning } = useScanner({
    html5QrCodeRef,
    lastScannedRef,
    scanTypeRef,
    scanMutation,
    setScanning,
    setResult,
    setCameraError,
    onBeforeScan,
    coordsRef,
  });

  // Auto-start scanner on mount or when desktop block is resolved
  useEffect(() => {
    if (!isDesktopBlocked && !showManualForm) {
      // Small timeout to guarantee #qr-reader is mounted in DOM
      const timer = setTimeout(() => {
        startScanning();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDesktopBlocked, showManualForm]);

  useEffect(() => {
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

  const handleScanTypeChange = (type) => {
    handleSwitchTab(type);
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

  
  const handleLocationSynced = (syncedCoords) => {
    const expiresAt = Date.now() + 3 * 3600 * 1000; // 3 Hours TTL
    const activeLembagaNorm = (effectiveLembaga || "ma").toLowerCase();
    const fullSession = {
      ...syncedCoords,
      isPcVerified: true,
      lembaga: activeLembagaNorm,
      expiresAt,
    };
    try {
      localStorage.setItem(getLocationSessionKey(effectiveLembaga), JSON.stringify(fullSession));
      localStorage.setItem("yatama_location_sync_session", JSON.stringify(fullSession));
    } catch {}
    setCoords(fullSession);
    if (typeof coordsRef !== 'undefined' && coordsRef) {
      coordsRef.current = fullSession;
    }
    setIsDesktopBlocked(false);
    setLocationError(null);
    setIsLocating(false);
  };

  if (isDesktopBlocked && isLocationRequired && !coords?.isPcVerified) {
    return (
      <div className="w-full pb-20 md:pb-6 flex flex-col items-stretch justify-start w-full">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title={`Akses Presensi via PC (${(effectiveLembaga || "MA").toUpperCase()})`}
          lembaga={effectiveLembaga}
        />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 md:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start w-full">
        {/* Kolom Kiri: Kamera Scanner & Controls */}
        <div className="lg:col-span-7 flex flex-col w-full lg:sticky lg:top-4">
          {/* 1. Navigasi Mode (Toggle Tabs) di Atas Kamera */}
          <div className="w-full bg-white border-2 border-gray-900 p-1.5 rounded-2xl md:rounded-3xl shadow-sm flex items-center mb-3.5">
            <button
              onClick={() => handleSwitchTab("check_in")}
              className={`flex-1 py-2.5 px-3 rounded-xl md:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                scanType === "check_in" && !showManualForm
                  ? "bg-primary-green text-gray-900 border-2 border-gray-900 shadow-sm"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-lg">login</span>
              <span>MASUK</span>
            </button>
            <button
              onClick={() => handleSwitchTab("check_out")}
              className={`flex-1 py-2.5 px-3 rounded-xl md:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                scanType === "check_out" && !showManualForm
                  ? "bg-primary-green text-gray-900 border-2 border-gray-900 shadow-sm"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>PULANG</span>
            </button>
          </div>

          {/* GPS Location Status Banner */}
          <div className="mb-3.5">
            {isSettingsLoading ? (
              <div className="p-3 bg-amber-50 border-2 border-gray-900 rounded-2xl flex items-center justify-between shadow-sm animate-pulse text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span className="font-bold">Memuat konfigurasi GPS madrasah...</span>
                </div>
              </div>
            ) : isLocationRequired ? (
              <>
                <div
                  className={`p-3 rounded-2xl border-2 border-gray-900 flex items-center justify-between shadow-sm transition-all ${
                    coords?.isPcVerified || coords?.isFallbackVerified
                      ? "bg-emerald-50"
                      : isLocating
                      ? "bg-amber-50"
                      : locationError
                      ? "bg-red-50"
                      : isWithinRadius
                      ? "bg-emerald-50"
                      : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl border-2 border-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm ${
                        coords?.isPcVerified
                          ? "bg-primary-green text-gray-900"
                          : isLocating
                          ? "bg-amber-200 text-amber-900"
                          : locationError
                          ? "bg-red-200 text-red-900"
                          : isWithinRadius
                          ? "bg-primary-green text-gray-900"
                          : "bg-red-200 text-red-900"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {coords?.isPcVerified
                          ? "verified_user"
                          : isLocating
                          ? "radar"
                          : isWithinRadius
                          ? (isCellularBtsDrift ? "cell_tower" : "pin_drop")
                          : "location_off"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-gray-900">
                          {coords?.isPcVerified
                            ? "Lokasi Sah: PC Terverifikasi"
                            : isLocating
                            ? "Mendeteksi Lokasi GPS..."
                            : locationError
                            ? "Izin / Sensor Lokasi GPS Diperlukan"
                            : isWithinRadius
                            ? (isCellularBtsDrift ? "Lokasi Sah: Toleransi BTS Madrasah" : "Lokasi Sah: Di Lingkungan Sekolah")
                            : "Di Luar Jangkauan Sekolah"}
                        </span>
                        {coords && (
                          <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${
                            isWithinRadius ? "bg-emerald-100 border-emerald-400 text-emerald-900" : "bg-red-100 border-red-400 text-red-900"
                          }`}>
                            {coords.isPcVerified
                              ? `PC Terverifikasi (s.d. ${format(new Date(coords.expiresAt || Date.now() + 3 * 3600 * 1000), "HH:mm")})`
                              : isCellularBtsDrift
                              ? `BTS Terkompensasi (Jarak: ${Math.round(currentDistance || 0)}m, Akurasi: ±${Math.round(rawAccuracy)}m)`
                              : `${currentDistance !== null ? `${Math.round(currentDistance)}m` : ""} / Maks ${radiusMax}m`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium truncate mt-0.5">
                        {coords?.isPcVerified
                          ? `Akses pemindaian presensi disetujui dari stasiun PC madrasah (${effectiveLembaga?.toUpperCase() || "MA"})`
                          : isLocating
                          ? "Menghubungkan sensor satelit GPS / jaringan..."
                          : locationError || (isWithinRadius
                              ? (isCellularBtsDrift
                                  ? `Terdeteksi di area madrasah via sinyal BTS (Jarak fisik: ${Math.round(currentDistance || 0)}m, Akurasi: ±${Math.round(rawAccuracy)}m)`
                                  : `Jarak ${Math.round(currentDistance || 0)}m dari titik pusat (${effectiveLembaga?.toUpperCase() || "MA"})`)
                              : (currentDistance !== null && currentDistance > 650
                                  ? `Jarak ${Math.round(currentDistance)}m terlalu jauh dari sekolah (Maks 100m). Presensi ditolak.`
                                  : `Jarak ${Math.round(currentDistance || 0)}m melebihi batas toleransi radius ${radiusMax}m.`))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {coords?.isPcVerified || isWithinRadius ? (
                      <div className="px-2.5 py-1.5 bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-base text-emerald-700">verified</span>
                        <span>Siap Scan</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={isLocating}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                        title="Perbarui koordinat GPS sekarang"
                      >
                        <span className={`material-symbols-outlined text-base ${isLocating ? "animate-spin" : ""}`}>
                          refresh
                        </span>
                        <span className="hidden sm:inline">{isLocating ? "Mencari..." : "Cek GPS"}</span>
                      </button>
                    )}
                    {coords && (
                      <a
                        href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-bold text-xs flex items-center shadow-sm transition-colors text-blue-700"
                        title="Buka titik koordinat saya di Google Maps"
                      >
                        <span className="material-symbols-outlined text-base">map</span>
                      </a>
                    )}
                  </div>
                </div>

                {locationError && (
                  <div className="mt-2.5 p-3 bg-amber-50 border-2 border-gray-900 rounded-2xl flex items-center justify-between gap-2.5 shadow-sm text-xs animate-slide-in">
                    <div className="flex items-center gap-2 text-amber-950 font-bold min-w-0">
                      <span className="material-symbols-outlined text-amber-600 text-lg flex-shrink-0">location_disabled</span>
                      <span className="leading-snug">{locationError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border-2 border-gray-900 rounded-xl font-black text-gray-900 shadow-xs cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      <span>Coba Lagi GPS</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-2.5 bg-gray-50 border-2 border-gray-300 rounded-2xl flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500">public</span>
                  <span className="font-bold">Validasi Radius GPS: Nonaktif (Bebas Lokasi)</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">Pengaturan Sekolah</span>
              </div>
            )}
          </div>

          {/* 2. Area Kamera (Viewfinder) - Hidden when manual form active */}
          {!showManualForm && (
            <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-[4/3] lg:aspect-[16/10] bg-gray-950 rounded-2xl md:rounded-3xl border-2 border-gray-900 overflow-hidden shadow-sm md:shadow-md flex items-center justify-center">
              {/* QR Reader Viewport */}
              <div id="qr-reader" className="w-full h-full relative overflow-hidden" />

              {/* Visual Bracket Scanner Corners (Frame Persegi Pas di Tengah) */}
              <div className="absolute inset-6 sm:inset-10 pointer-events-none z-10 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-t-4 border-l-4 border-primary-green rounded-tl-xl shadow-sm"></div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-t-4 border-r-4 border-primary-green rounded-tr-xl shadow-sm"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-b-4 border-l-4 border-primary-green rounded-bl-xl shadow-sm"></div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-b-4 border-r-4 border-primary-green rounded-br-xl shadow-sm"></div>
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
            <div className="w-full mt-3 px-3.5 py-2.5 bg-red-100/90 border-2 border-gray-900 rounded-xl md:rounded-2xl shadow-sm flex items-center justify-between text-red-600 text-xs font-bold gap-2">
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

          {/* 3. Tombol 'Mulai / Stop Scan' - Hidden when manual form active */}
          {!showManualForm && (
            <div className="w-full mt-3.5">
              {scanning ? (
                <button
                  onClick={stopScanning}
                  className="w-full bg-[#e5e7eb] hover:bg-gray-300 text-gray-900 font-black py-3 px-6 border-2 border-gray-900 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:translate-y-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">
                    visibility_off
                  </span>
                  <span>Stop Scan</span>
                </button>
              ) : (
                <button
                  onClick={startScanning}
                  className="w-full bg-primary-green hover:bg-lime-400 text-gray-900 font-black py-3 px-6 border-2 border-gray-900 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:translate-y-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">
                    videocam
                  </span>
                  <span>Mulai Scan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Riwayat Scan Hari Ini */}
        <div className="lg:col-span-5 flex flex-col w-full">
          <RecentScanLogs recentLogs={recentLogs} />
        </div>
      </div>

      {/* 4. Modal Dialog Sukses & Gagal Absensi (Popup dengan Diagnostik Cerdas) */}
      <ScanResultModal
        result={result}
        scanType={scanType}
        handleCloseModal={handleCloseModal}
        onSwitchScanType={handleScanTypeChange}
      />
    </div>
  );
}
