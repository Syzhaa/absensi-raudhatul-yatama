const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/components/LocationPickerMap.jsx';
let code = fs.readFileSync(file, 'utf8');

const targetGetCurrent = `  const handleGetCurrentGPS = async () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isDesktop) {
      setIsDesktopBlocked(true);
      return;
    }`;

const replacement = `  const handleGetCurrentGPS = async () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    // Jika di Desktop, cek apakah ada sesi GPS sinkronisasi 3 jam yang masih aktif
    if (isDesktop) {
      try {
        const raw = localStorage.getItem("yatama_location_sync_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.latitude && parsed?.longitude && parsed?.expiresAt && Date.now() < parsed.expiresAt) {
            const myLat = parseFloat(Number(parsed.latitude).toFixed(8));
            const myLon = parseFloat(Number(parsed.longitude).toFixed(8));
            onChangeCoordinates(myLat, myLon);
            if (mapInstanceRef.current && markerRef.current && circleRef.current) {
              markerRef.current.setLatLng([myLat, myLon]);
              circleRef.current.setLatLng([myLat, myLon]);
              mapInstanceRef.current.setView([myLat, myLon], 17, { animate: true });
            }
            setGpsStatus({
              success: true,
              message: \`Koordinat berhasil diambil dari sesi sinkronisasi HP (\${myLat}, \${myLon}). Klik 'Simpan Pengaturan' untuk memperbarui.\`,
            });
            return;
          }
        }
      } catch (e) {}

      setGpsStatus({
        success: false,
        message: "Perangkat PC tidak memiliki GPS fisik. Buka menu 'Scan Presensi' dan lakukan sinkronisasi via HP terlebih dahulu, atau geser pin 🏫 di peta secara manual.",
      });
      return;
    }`;

code = code.replace(targetGetCurrent, replacement);
fs.writeFileSync(file, code);
console.log("Patched LocationPickerMap.jsx with 3-hour cache fallback");
