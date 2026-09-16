const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js';
let code = fs.readFileSync(file, 'utf8');

// 1. Add coordsRef to parameters of useScanner
code = code.replace(
  /onBeforeScan,\n\}\) \{/,
  `onBeforeScan,\n  coordsRef,\n}) {`
);

// 2. Add intercept logic inside decodedText callback
const targetRegex = /async \(decodedText\) => \{\n\s*if \(\n\s*scanMutation\.isPending \|\|\n\s*lastScannedRef\.current === decodedText\n\s*\)\n\s*return;\n\s*lastScannedRef\.current = decodedText;/;

const replacement = `async (decodedText) => {
              if (
                scanMutation.isPending ||
                lastScannedRef.current === decodedText
              )
                return;
              lastScannedRef.current = decodedText;

              // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
              const syncMatch = decodedText.match(/(?:sync\\/|sync:)([0-9a-fA-F-]+)/i);
              if (syncMatch) {
                const sessionId = syncMatch[1];
                setResult({
                  success: true,
                  manual: true,
                  message: "📡 Terdeteksi QR Sync PC. Mengirim koordinat GPS HP...",
                });

                const pushLocationToPc = async (lat, lon, acc) => {
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
                    const res = await fetch(\`\${apiUrl}/location-sync/\${sessionId}\`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        latitude: lat,
                        longitude: lon,
                        accuracy: acc || 5,
                      }),
                    });
                    const resData = await res.json();
                    if (resData.success) {
                      playSuccessSound();
                      setResult({
                        success: true,
                        manual: true,
                        message: "✅ Lokasi HP berhasil disinkronkan ke PC! Layar PC sekarang aktif.",
                      });
                      setTimeout(() => setResult(null), 4000);
                    } else {
                      playErrorSound();
                      setResult({
                        success: false,
                        message: "Gagal sinkron: " + (resData.message || "QR Kadaluarsa"),
                      });
                    }
                  } catch (e) {
                    playErrorSound();
                    setResult({
                      success: false,
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
              }`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync(file, code);
console.log("Successfully patched useScanner.js");
