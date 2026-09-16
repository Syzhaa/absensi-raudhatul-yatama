const fs = require('fs');

function patch(file, isGuru) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace detectLocation logic to immediately bypass on desktop
  const newLogic = `const detectLocation = () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    // Langsung bypass jika menggunakan Desktop/PC untuk mencegah loading terus menerus (bug browser)
    if (isDesktop ${!isGuru ? "|| isAdminRole" : ""}) {
      setPcSchoolLocation();
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
      ${!isGuru ? "coordsRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };" : ""}
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
  };`;
  
  // Regex to match the detectLocation function block
  const regex = /const detectLocation = \(\) => \{[\s\S]*?\{ enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 \}\n    \);\n  \};/;
  
  code = code.replace(regex, newLogic);
  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}

patch('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx', false);
patch('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', true);
