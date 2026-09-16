const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

// Ensure api is imported
if (!code.includes('import api from "../services/api";')) {
  code = `import api from "../services/api";\n` + code;
}

const targetBlock = `          // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
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
          }`;

const rbacReplacement = `          // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
          const syncMatch = decodedText.match(/(?:sync\\/|sync:)([0-9a-fA-F-]+)/i);
          if (syncMatch) {
            const sessionId = syncMatch[1];
            let pcUid = null;
            let pcRole = null;
            let pcName = null;
            try {
              const urlObj = new URL(decodedText.startsWith("http") ? decodedText : \`https://dummy.com/\${decodedText}\`);
              pcUid = urlObj.searchParams.get("uid");
              pcRole = urlObj.searchParams.get("role");
              pcName = urlObj.searchParams.get("name");
            } catch (e) {}

            let hpUser = null;
            try {
              const meRes = await api.get("/auth/me");
              hpUser = meRes.data?.data;
            } catch (e) {}

            const adminRoles = ["super_admin", "admin_yayasan", "admin_ma", "admin_mts", "admin_akademik", "petugas_absen"];
            const isHpAdmin = adminRoles.includes(hpUser?.role);

            if (hpUser && !isHpAdmin && hpUser.role === "guru") {
              if (pcUid && String(hpUser.id) !== String(pcUid)) {
                setResult({
                  success: false,
                  message: \`Akses Ditolak: Anda login sebagai \${hpUser.nama || hpUser.name || "Guru"}. PC milik \${pcName || "Akun Lain"}. Guru hanya dapat menyinkronkan akunnya sendiri.\`,
                });
                return;
              }
            }

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
                  synced_by_id: hpUser?.id,
                  synced_by_name: hpUser?.nama || hpUser?.name,
                  synced_by_role: hpUser?.role,
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
                    message: res.data?.message || "Gagal sinkron lokasi.",
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
          }`;

code = code.replace(targetBlock, rbacReplacement);
fs.writeFileSync(file, code);
console.log("Patched ScanGuru.jsx with RBAC validation");
