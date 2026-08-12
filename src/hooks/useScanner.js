import { Html5Qrcode } from "html5-qrcode";
import { saveOfflineScan } from "../services/db";

export function useScanner({
  html5QrCodeRef,
  lastScannedRef,
  scanTypeRef,
  scanMutation,
  setScanning,
  setResult,
  setCameraError,
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
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
            async (decodedText) => {
              if (
                scanMutation.isPending ||
                lastScannedRef.current === decodedText
              )
                return;
              lastScannedRef.current = decodedText;

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
