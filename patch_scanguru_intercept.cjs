const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

const target = `        async (decodedText) => {
          if (scanMutation.isPending) return;
          submitScan(decodedText);
          await stopCamera();
        }`;

const replacement = `        async (decodedText) => {
          if (scanMutation.isPending) return;

          // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
          const syncMatch = decodedText.match(/(?:sync\\/|sync:)([0-9a-fA-F-]+)/i);
          if (syncMatch) {
            const sessionId = syncMatch[1];
            setResult({
              success: true,
              message: "📡 Terdeteksi QR Sync PC. Mengirim koordinat GPS HP...",
            });

            const sendSync = async (lat, lon, acc) => {
              try {
                const baseURL = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
                const res = await axios.post(\`\${baseURL}/location-sync/\${sessionId}\`, {
                  latitude: lat,
                  longitude: lon,
                  accuracy: acc || 5,
                });
                if (res.data?.success) {
                  setResult({
                    success: true,
                    message: "✅ Lokasi HP berhasil disinkronkan ke PC! Layar PC sekarang aktif.",
                  });
                  setTimeout(() => setResult(null), 4000);
                } else {
                  setResult({
                    success: false,
                    message: "Gagal sinkron: " + (res.data?.message || "QR Kadaluarsa"),
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
        }`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
console.log("Patched ScanGuru with sync intercept");
