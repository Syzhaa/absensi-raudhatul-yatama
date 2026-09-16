const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import useAppStore from "../store/useAppStore";')) {
  code = `import useAppStore from "../store/useAppStore";\n` + code;
}

const targetBlock = `              // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
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
                };`;

const cleanReplacement = `              // INTERCEPT: Deteksi jika ini adalah QR Sinkronisasi Lokasi PC
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
                      message: \`Akses Ditolak: Anda login sebagai "\${hpName}". Akun di PC adalah "\${pcName ? decodeURIComponent(pcName) : "Akun Lain"}". Guru hanya dapat menyinkronkan akunnya sendiri.\`,
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
                    const res = await fetch(\`\${apiUrl}/location-sync/\${sessionId}\`, {
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
                };`;

code = code.replace(targetBlock, cleanReplacement);
fs.writeFileSync(file, code);
console.log("Patched useScanner.js cleanly");
