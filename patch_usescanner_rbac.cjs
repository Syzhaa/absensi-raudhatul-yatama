const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js';
let code = fs.readFileSync(file, 'utf8');

// Ensure api is imported
if (!code.includes('import api from "../services/api";')) {
  code = `import api from "../services/api";\n` + code;
}

const targetBlock = `              // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
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

const rbacReplacement = `              // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
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

                // Validasi Akun HP (RBAC)
                let hpUser = null;
                try {
                  const meRes = await api.get("/auth/me");
                  hpUser = meRes.data?.data;
                } catch (e) {}

                const adminRoles = ["super_admin", "admin_yayasan", "admin_ma", "admin_mts", "admin_akademik", "petugas_absen"];
                const isHpAdmin = adminRoles.includes(hpUser?.role);

                if (hpUser && !isHpAdmin && hpUser.role === "guru") {
                  if (pcUid && String(hpUser.id) !== String(pcUid)) {
                    playErrorSound();
                    setResult({
                      success: false,
                      message: \`Akses Ditolak: Anda login sebagai \${hpUser.nama || hpUser.name || "Guru"}. Akun di PC adalah \${pcName || "Akun Lain"}. Guru hanya dapat menyinkronkan akunnya sendiri.\`,
                    });
                    setTimeout(() => {
                      if (lastScannedRef.current === decodedText) lastScannedRef.current = null;
                    }, 4000);
                    return;
                  }
                }

                setResult({
                  success: true,
                  manual: true,
                  message: "📡 Mengirim koordinat GPS HP ke PC...",
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
                        synced_by_id: hpUser?.id,
                        synced_by_name: hpUser?.nama || hpUser?.name,
                        synced_by_role: hpUser?.role,
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
                        message: resData.message || "Gagal sinkron lokasi.",
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

code = code.replace(targetBlock, rbacReplacement);
fs.writeFileSync(file, code);
console.log("Patched useScanner.js with RBAC validation");
