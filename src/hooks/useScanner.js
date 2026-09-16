import useAppStore from "../store/useAppStore";
import api from "../services/api";
import { Html5Qrcode } from "html5-qrcode";
import { saveOfflineScan } from "../services/db";
import { playSuccessSound, playErrorSound } from "../utils/scanAudio";

export function useScanner({
  html5QrCodeRef,
  lastScannedRef,
  scanTypeRef,
  scanMutation,
  setScanning,
  setResult,
  setCameraError,
  onBeforeScan,
  coordsRef,
}) {
  const startScanning = async () => {
    setCameraError(null);
    setResult(null);
    try {
      if (html5QrCodeRef.current) {
        await stopScanning();
      }
      setTimeout(async () => {
        const readerElement = document.getElementById("qr-reader");
        if (!readerElement) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          stream.getTracks().forEach((track) => track.stop());
          html5QrCodeRef.current = new Html5Qrcode("qr-reader");
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 10,
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              if (
                scanMutation.isPending ||
                lastScannedRef.current === decodedText
              )
                return;
              lastScannedRef.current = decodedText;

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

                // Ambil data akun di HP secara synchronous dan akurat
                const storeState = useAppStore.getState();
                let hpId = storeState.userId || localStorage.getItem("user_id");
                let hpRole = storeState.userRole || localStorage.getItem("user_role") || "guru";
                let hpName = storeState.userName || localStorage.getItem("user_name") || "Guru";

                // Jika belum lengkap di cache, fetch langsung
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

                // ATURAN KETAT RBAC: Jika HP login akun guru, PC WAJIB milik guru yang sama
                if (!isHpAdmin) {
                  if (!pcUid || String(hpId) !== String(pcUid)) {
                    playErrorSound();
                    setResult({
                      success: false,
                      manual: true,
                      message: `Akses Ditolak: Anda login sebagai "${hpName}". Akun di PC adalah "${pcName ? decodeURIComponent(pcName) : "Akun Lain"}". Guru hanya dapat menyinkronkan akunnya sendiri.`,
                    });
                    setTimeout(() => {
                      if (lastScannedRef.current === decodedText) lastScannedRef.current = null;
                    }, 4000);
                    return;
                  }
                }

                const pushLocationToPc = async (lat, lon, acc) => {
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
                    const res = await fetch(`${apiUrl}/location-sync/${sessionId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        latitude: lat,
                        longitude: lon,
                        accuracy: acc || 5,
                        synced_by_id: hpId,
                        synced_by_name: hpName,
                        synced_by_role: hpRole,
                        pc_user_id: pcUid,
                      }),
                    });
                    const resData = await res.json();
                    if (resData.success) {
                      playSuccessSound();
                      setResult({
                        success: true,
                        manual: true,
                        message: "✅ Sukses! Lokasi tersinkronisasi ke PC dan aktif selama 3 Jam.",
                      });
                      setTimeout(() => setResult(null), 4000);
                    } else {
                      playErrorSound();
                      setResult({
                        success: false,
                        manual: true,
                        message: resData.message || "Gagal sinkron: Akses ditolak.",
                      });
                    }
                  } catch (e) {
                    playErrorSound();
                    setResult({
                      success: false,
                      manual: true,
                      message: "Gagal menghubungkan lokasi ke server.",
                    });
                  }
                };

                if (coordsRef?.current?.latitude && coordsRef?.current?.longitude) {
                  await pushLocationToPc(coordsRef.current.latitude, coordsRef.current.longitude, coordsRef.current.accuracy);
                } else if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => pushLocationToPc(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                    () => {
                      playErrorSound();
                      setResult({
                        success: false,
                        message: "Gagal membaca sensor GPS HP. Pastikan izin lokasi aktif.",
                      });
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                } else {
                  playErrorSound();
                  setResult({
                    success: false,
                    message: "Browser HP tidak mendukung sensor GPS.",
                  });
                }

                setTimeout(() => {
                  if (lastScannedRef.current === decodedText) {
                    lastScannedRef.current = null;
                  }
                }, 4000);
                return;
              }

              if (onBeforeScan) {
                const check = onBeforeScan();
                if (check && !check.valid) {
                  setResult({
                    success: false,
                    message: check.message || "Lokasi Anda di luar jangkauan sekolah.",
                  });
                  playErrorSound();
                  setTimeout(() => {
                    if (lastScannedRef.current === decodedText) {
                      lastScannedRef.current = null;
                    }
                  }, 3000);
                  return;
                }
              }

              if (!navigator.onLine) {
                // Offline fallback
                const timestamp = Date.now();
                const secret = import.meta.env.VITE_SCAN_SECRET;
                if (!secret) {
                  setResult({
                    success: false,
                    message: "Konfigurasi scan secret tidak ditemukan",
                  });
                  return;
                }
                const msgBuffer = new TextEncoder().encode(
                  decodedText + timestamp + secret,
                );
                const hashBuffer = await crypto.subtle.digest(
                  "SHA-256",
                  msgBuffer,
                );
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const signature = hashArray
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");

                await saveOfflineScan({
                  uuid: decodedText,
                  scan_type: scanTypeRef.current,
                  timestamp,
                  signature,
                });

                setResult({
                  success: true,
                  message:
                    "Tersimpan offline (Tunggu koneksi untuk sinkronisasi)",
                  scanType: scanTypeRef.current,
                  data: { type: "offline" },
                });
                
                // Play success sound for offline save
                playSuccessSound();

                // Auto-clear result after 2.5 seconds to ready for next scan visually
                setTimeout(() => {
                  setResult(null);
                }, 2500);
              } else {
                scanMutation.mutate(decodedText);
              }

              // Anti-spam debounce: allow scanning the same code again after 3 seconds
              setTimeout(() => {
                if (lastScannedRef.current === decodedText) {
                  lastScannedRef.current = null;
                }
              }, 3000);
            },
            () => {},
          );
          setScanning(true);
        } catch (err) {
          let errorMsg = "Tidak dapat mengakses kamera";
          if (err.name === "NotAllowedError")
            errorMsg = "Akses kamera ditolak. Izinkan di pengaturan browser.";
          else if (err.name === "NotFoundError")
            errorMsg = "Kamera tidak ditemukan.";
          else if (err.name === "NotReadableError")
            errorMsg = "Kamera sedang digunakan aplikasi lain.";
          else if (err.name === "NotSupportedError")
            errorMsg = "Browser tidak mendukung atau halaman tidak HTTPS.";
          setCameraError(errorMsg);
        }
      }, 100);
    } catch (err) {
      setCameraError("Gagal memulai scanner kamera.");
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  return { startScanning, stopScanning };
}
