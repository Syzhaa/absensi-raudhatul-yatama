import useAppStore from "../store/useAppStore";
import api from "../services/api";
import DesktopLocationSync from "../components/DesktopLocationSync";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { playSuccessSound, playErrorSound, playCheckoutSound } from "../utils/scanAudio";

// Calculate distance between two coordinates in meters
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
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

const LOCATION_SESSION_KEY = "yatama_location_sync_session";

function getCachedLocationSession() {
  try {
    const raw = localStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
      return parsed;
    }
    localStorage.removeItem(LOCATION_SESSION_KEY);
  } catch {
    localStorage.removeItem(LOCATION_SESSION_KEY);
  }
  return null;
}

export default function ScanGuru() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLembaga = (searchParams.get("lembaga") || "ma").toLowerCase();
  const [lembaga, setLembaga] = useState(initialLembaga === "mts" ? "mts" : "ma");

  const [scanType, setScanType] = useState("check_in"); // "check_in" | "check_out"
  const [activeMethod, setActiveMethod] = useState("camera"); // "camera" | "manual"
  const [nipInput, setNipInput] = useState("");

  // Location state
  const cachedLoc = getCachedLocationSession();
  const [coords, setCoords] = useState(cachedLoc || null);
  const [locationError, setLocationError] = useState(null);
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(isDesktop && !cachedLoc?.isPcVerified);
  const [isLocating, setIsLocating] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // Result popup state
  const [result, setResult] = useState(null);

  // Sync query param with state
  useEffect(() => {
    setSearchParams({ lembaga });
  }, [lembaga, setSearchParams]);

  // Fetch school coordinates & portal settings
  const { data: settingsResponse, isLoading: isSettingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ["teacher-portal-settings", lembaga],
    queryFn: async () => {
      const baseURL = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
      const res = await axios.get(`${baseURL}/teacher-portal/settings`, {
        params: { lembaga },
      });
      return res.data;
    },
  });

  const settings = settingsResponse?.data || {};
  const isEnabled = settings.enable_teacher_attendance !== false && settings.enable_teacher_self_scan !== false;
  const isLocationRequired = settings.enable_location_check !== false;

  // Function to detect GPS location
  const setPcSchoolLocation = () => {
    setCoords({
      latitude: settings.latitude || -3.37651,
      longitude: settings.longitude || 114.64682,
      accuracy: 0,
      isPcVerified: true,
    });
    setIsLocating(false);
  };

  const detectLocation = () => {
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
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      
      setIsLocating(false);
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          (err) => {
            setIsLocating(false);
            if (err.code === 1) {
              setLocationError("Izin lokasi ditolak. Silakan izinkan akses lokasi (GPS) di browser Anda.");
            } else {
              setLocationError("Perangkat tidak memiliki sensor GPS satelit.");
            }
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  };

  // Auto-detect location on load if required
  useEffect(() => {
    if (isLocationRequired) {
      detectLocation();
    }
  }, [isLocationRequired, lembaga]);

  // Compute live distance
  const currentDistance =
    coords && settings.latitude && settings.longitude
      ? getDistance(coords.latitude, coords.longitude, settings.latitude, settings.longitude)
      : null;

  const isWithinRadius =
    !isLocationRequired ||
    coords?.isPcVerified ||
    (currentDistance !== null && currentDistance <= (settings.radius_meters || 100));

  // Scan Mutation
  const scanMutation = useMutation({
    mutationFn: async (payload) => {
      const baseURL = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
      const res = await axios.post(`${baseURL}/teacher-portal/scan`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (scanType === "check_out") {
        playCheckoutSound();
      } else {
        playSuccessSound();
      }
      setResult({
        success: true,
        data: data.data,
        message: data.message || "Presensi Berhasil Dicatat!",
      });
      setNipInput("");
    },
    onError: (err) => {
      playErrorSound();
      const msg = err.response?.data?.message || "Gagal melakukan presensi.";
      setResult({
        success: false,
        message: msg,
      });
    },
  });

  const submitScan = (identifier) => {
    if (!identifier || !identifier.trim()) {
      alert("Masukkan NIP / NUPTK / NPK atau scan QR Code.");
      return;
    }
    if (!isEnabled) {
      alert("Akses presensi mandiri guru sedang dinonaktifkan oleh Admin sekolah.");
      return;
    }
    if (isLocationRequired && !coords) {
      alert("Lokasi GPS diperlukan. Harap aktifkan GPS dan izinkan browser mendeteksi lokasi.");
      detectLocation();
      return;
    }
    if (isLocationRequired && !isWithinRadius && !coords?.isPcVerified) {
      alert(
        `Anda berada di luar jangkauan sekolah (${Math.round(currentDistance)} meter). Presensi hanya dapat dilakukan di dalam lingkungan sekolah (maksimal ${settings.radius_meters}m).`
      );
      return;
    }

    setResult(null);
    scanMutation.mutate({
      identifier: identifier.trim(),
      scan_type: scanType,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      lembaga,
    });
  };

  // Camera start/stop handlers
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }
      const element = document.getElementById("teacher-qr-reader");
      if (!element) return;

      const qr = new Html5Qrcode("teacher-qr-reader");
      html5QrCodeRef.current = qr;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cameraConfig = isMobile ? { facingMode: { ideal: "environment" } } : { facingMode: "user" };

      const guruScanCallback =
        async (decodedText) => {
          if (scanMutation.isPending) return;

          // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
          const syncMatch = decodedText.match(/(?:sync\/|sync:)([0-9a-fA-F-]+)/i);
          if (syncMatch) {
            const sessionId = syncMatch[1];
            let pcUid = null;
            let pcRole = null;
            let pcName = null;
            try {
              const urlObj = new URL(decodedText.startsWith("http") ? decodedText : `https://dummy.com/${decodedText}`);
              pcUid = urlObj.searchParams.get("uid");
              pcRole = urlObj.searchParams.get("role");
              pcName = urlObj.searchParams.get("name");
            } catch (e) {}

            const storeState = useAppStore.getState();
            let hpId = storeState.userId || localStorage.getItem("user_id");
            let hpRole = storeState.userRole || localStorage.getItem("user_role") || "guru";
            let hpName = storeState.userName || localStorage.getItem("user_name") || "Guru";

            if (!hpId) {
              try {
                const meRes = await api.get("/auth/me");
                if (meRes.data?.data) {
                  hpId = meRes.data.data.id;
                  hpRole = meRes.data.data.role;
                  hpName = meRes.data.data.nama || meRes.data.data.name;
                }
              } catch (e) {}
            }

            const adminRoles = ["super_admin", "admin_yayasan", "admin_ma", "admin_mts", "admin_akademik", "petugas_absen"];
            const isHpAdmin = adminRoles.includes(hpRole);

            // ATURAN KETAT RBAC
            if (!isHpAdmin) {
              if (!pcUid || String(hpId) !== String(pcUid)) {
                setResult({
                  success: false,
                  message: `Akses Ditolak: Anda login sebagai "${hpName}". Akun di PC adalah "${pcName ? decodeURIComponent(pcName) : "Akun Lain"}". Guru hanya dapat menyinkronkan akunnya sendiri.`,
                });
                return;
              }
            }

            const sendSync = async (lat, lon, acc) => {
              try {
                const baseURL = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
                const res = await axios.post(`${baseURL}/location-sync/${sessionId}`, {
                  latitude: lat,
                  longitude: lon,
                  accuracy: acc || 5,
                  synced_by_id: hpId,
                  synced_by_name: hpName,
                  synced_by_role: hpRole,
                  pc_user_id: pcUid,
                });
                if (res.data?.success) {
                  setResult({
                    success: true,
                    message: "✅ Sukses! Lokasi tersinkronisasi ke PC dan aktif selama 3 Jam.",
                  });
                  setTimeout(() => setResult(null), 4000);
                } else {
                  setResult({
                    success: false,
                    message: res.data?.message || "Gagal sinkron lokasi: Akses ditolak.",
                  });
                }
              } catch (e) {
                setResult({
                  success: false,
                  message: "Gagal menghubungkan lokasi ke server.",
                });
              }
            };

            if (coords?.latitude && coords?.longitude) {
              await sendSync(coords.latitude, coords.longitude, coords.accuracy);
            } else if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => sendSync(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                () => {
                  setResult({
                    success: false,
                    message: "Gagal membaca sensor GPS HP.",
                  });
                },
                { enableHighAccuracy: true, timeout: 8000 }
              );
            }
            return;
          }

          submitScan(decodedText);
          await stopCamera();
        };

      try {
        await qr.start(cameraConfig, { fps: 10, aspectRatio: 1.0 }, guruScanCallback);
      } catch (camErr) {
        await qr.start({}, { fps: 10, aspectRatio: 1.0 }, guruScanCallback);
      }
      setIsScanning(true);
    } catch (err) {
      setCameraError("Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan atau gunakan opsi input manual di bawah.");
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (e) {
      // Ignore
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  
  const handleLocationSynced = (syncedCoords) => {
    const expiresAt = Date.now() + 3 * 3600 * 1000; // 3 Hours TTL
    const fullSession = {
      ...syncedCoords,
      isPcVerified: true,
      expiresAt,
    };
    try {
      localStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(fullSession));
    } catch {}
    setCoords(fullSession);
    setIsDesktopBlocked(false);
    setLocationError(null);
  };

  if (isDesktopBlocked && isLocationRequired && !coords?.isPcVerified) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Akses Presensi via PC"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 font-sans p-3 sm:p-6 flex flex-col justify-between">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Top Branding Card */}
        <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl p-4 shadow-neo flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary-green border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl text-gray-900">badge</span>
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-gray-900 leading-tight">
                Presensi Mandiri Guru
              </h1>
              <p className="text-[11px] font-bold text-gray-500">
                Raudhatul Yatama • {lembaga.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Lembaga Switcher */}
          <div className="flex bg-gray-100 p-1 border-2 border-gray-900 rounded-xl">
            <button
              type="button"
              onClick={() => { setLembaga("ma"); stopCamera(); }}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                lembaga === "ma" ? "bg-primary-green border border-gray-900 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              MA
            </button>
            <button
              type="button"
              onClick={() => { setLembaga("mts"); stopCamera(); }}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                lembaga === "mts" ? "bg-primary-green border border-gray-900 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              MTs
            </button>
          </div>
        </div>

        {/* Admin Toggle Access Disabled Alert */}
        {!isSettingsLoading && !isEnabled && (
          <div className="bg-red-50 border-2 sm:border-3 border-red-500 rounded-2xl p-4 shadow-neo space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-red-600 text-2xl flex-shrink-0">block</span>
              <div>
                <h3 className="font-black text-xs sm:text-sm text-red-950">
                  Akses Presensi Mandiri Ditutup
                </h3>
                <p className="text-xs text-red-800 font-medium mt-0.5 leading-relaxed">
                  Admin sekolah saat ini menonaktifkan fitur presensi mandiri guru via link untuk <strong>{lembaga.toUpperCase()}</strong>. Hubungi admin lembaga untuk membukanya.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Geolocation Radius Status Card */}
        {isLocationRequired && (
          <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-emerald-600">distance</span>
                <span className="text-xs font-black uppercase text-gray-900">Validasi Lokasi GPS</span>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={isLocating}
                className="text-[11px] font-bold text-gray-600 hover:text-gray-900 underline flex items-center gap-1 disabled:opacity-50"
              >
                {isLocating ? (
                  <span className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-sm">refresh</span>
                )}
                <span>Refresh GPS</span>
              </button>
            </div>

            {locationError ? (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-amber-600 flex-shrink-0 mt-0.5">warning</span>
                <div>{locationError}</div>
              </div>
            ) : isLocating ? (
              <div className="text-xs text-gray-500 font-bold flex items-center gap-2 p-2">
                <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                <span>Mendeteksi koordinat lokasi HP Anda...</span>
              </div>
            ) : coords ? (
              <div
                className={`p-2.5 rounded-xl border-2 flex items-center justify-between ${
                  isWithinRadius
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                    : "bg-red-50 border-red-500 text-red-950"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">
                    {isWithinRadius ? "check_circle" : "cancel"}
                  </span>
                  <div>
                    <div className="font-black text-xs">
                      {isWithinRadius ? "Di Dalam Area Sekolah" : "Di Luar Jangkauan Sekolah"}
                    </div>
                    <div className="text-[11px] opacity-80">
                      Jarak: <strong>{currentDistance !== null ? `${Math.round(currentDistance)} meter` : "-"}</strong> (Maks: {settings.radius_meters || 100}m)
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white border border-gray-400 rounded-lg">
                  {isWithinRadius ? "VALID" : "INVALID"}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Skenario Masuk / Pulang Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScanType("check_in")}
            className={`p-3 rounded-2xl border-2 sm:border-3 transition-all flex items-center justify-center gap-2 ${
              scanType === "check_in"
                ? "bg-primary-green border-gray-900 text-gray-900 shadow-neo -translate-y-0.5 font-black text-xs sm:text-sm"
                : "bg-white border-gray-300 text-gray-600 hover:border-gray-900 font-bold text-xs"
            }`}
          >
            <span className="material-symbols-outlined text-lg">login</span>
            <span>Hadir / Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => setScanType("check_out")}
            className={`p-3 rounded-2xl border-2 sm:border-3 transition-all flex items-center justify-center gap-2 ${
              scanType === "check_out"
                ? "bg-amber-400 border-gray-900 text-gray-900 shadow-neo -translate-y-0.5 font-black text-xs sm:text-sm"
                : "bg-white border-gray-300 text-gray-600 hover:border-gray-900 font-bold text-xs"
            }`}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Pulang</span>
          </button>
        </div>

        {/* Input Mode Tabs: Camera vs NIP */}
        <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo space-y-4">
          <div className="flex border-b-2 border-gray-200 pb-2 gap-2">
            <button
              type="button"
              onClick={() => { setActiveMethod("camera"); startCamera(); }}
              className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                activeMethod === "camera"
                  ? "bg-gray-900 border-gray-900 text-white shadow-neo"
                  : "bg-gray-100 border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="material-symbols-outlined text-base">qr_code_scanner</span>
              <span>Scan QR Guru</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMethod("manual"); stopCamera(); }}
              className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all ${
                activeMethod === "manual"
                  ? "bg-gray-900 border-gray-900 text-white shadow-neo"
                  : "bg-gray-100 border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="material-symbols-outlined text-base">pin</span>
              <span>NIP / NUPTK / NPK</span>
            </button>
          </div>

          {/* METHOD 1: CAMERA SCAN */}
          {activeMethod === "camera" && (
            <div className="space-y-3 text-center">
              <div
                id="teacher-qr-reader"
                className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-900 relative flex items-center justify-center"
              >
                {!isScanning && (
                  <div className="text-white text-xs space-y-2 p-4">
                    <span className="material-symbols-outlined text-4xl text-emerald-400">videocam</span>
                    <p className="font-bold">Arahkan kamera ke QR Code pada Kartu Guru Anda</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 font-medium">
                  {cameraError}
                </div>
              )}

              <div className="flex gap-2">
                {!isScanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={!isEnabled}
                    className="flex-1 py-2.5 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                    <span>Nyalakan Kamera Scanner</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 py-2.5 bg-red-500 border-2 border-gray-900 rounded-xl font-black text-xs text-white shadow-neo hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">stop</span>
                    <span>Matikan Kamera</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* METHOD 2: MANUAL NIP / NUPTK / NPK */}
          {activeMethod === "manual" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitScan(nipInput);
              }}
              className="space-y-3"
            >
              <div className="space-y-1 text-left">
                <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
                  Masukkan NIP / NUPTK / NPK Guru *
                </label>
                <input
                  type="text"
                  value={nipInput}
                  onChange={(e) => setNipInput(e.target.value)}
                  placeholder="Contoh: 198501012010011001"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-mono text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
                  required
                />
                <span className="text-[10px] text-gray-500 font-medium">
                  Nomor terdaftar di pangkalan data guru sekolah Raudhatul Yatama.
                </span>
              </div>

              <button
                type="submit"
                disabled={scanMutation.isPending || !isEnabled}
                className="w-full py-3 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs sm:text-sm text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {scanMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                )}
                <span>Kirim Presensi Sekarang</span>
              </button>
            </form>
          )}
        </div>

        {/* Scan Result Feedback Card */}
        {result && (
          <div
            className={`p-4 rounded-2xl border-2 sm:border-3 shadow-neo space-y-2 animate-slide-up ${
              result.success
                ? "bg-emerald-50 border-emerald-600 text-emerald-950"
                : "bg-red-50 border-red-600 text-red-950"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">
                  {result.success ? "task_alt" : "error"}
                </span>
                <h3 className="font-black text-sm">{result.message}</h3>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-gray-500 hover:text-gray-900"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {result.success && result.data && (
              <div className="bg-white/90 border border-emerald-300 rounded-xl p-3 text-xs space-y-1 font-medium text-gray-800">
                <div>Nama Guru: <strong className="text-gray-950">{result.data.teacher?.nama}</strong></div>
                <div>NIP/NUPTK: <span className="font-mono">{result.data.teacher?.nip || "-"}</span></div>
                <div>Mata Pelajaran: {result.data.teacher?.mata_pelajaran || "-"}</div>
                <div>Status: <strong className="text-emerald-700 capitalize">{result.data.attendance?.status || "Hadir"}</strong></div>
                <div>Waktu: {result.data.attendance?.check_out || result.data.attendance?.check_in || "-"}</div>
                {result.data.distance_meters !== null && (
                  <div className="text-[11px] text-gray-500">
                    Jarak dari Sekolah: {result.data.distance_meters} meter
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer link to admin login */}
      <div className="text-center pt-6 pb-2">
        <Link
          to="/login"
          className="text-xs font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">lock</span>
          <span>Login Dashboard Admin / Petugas</span>
        </Link>
      </div>
    </div>
  );
}
