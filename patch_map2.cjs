const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/components/LocationPickerMap.jsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('DesktopLocationSync')) {
  code = code.replace(
    /import React.*?;\n/,
    `$&import DesktopLocationSync from "./DesktopLocationSync";\n`
  );
}

// Add state
if (!code.includes('isDesktopBlocked')) {
  code = code.replace(
    /const \[isGettingGPS, setIsGettingGPS\] = useState\(false\);/,
    `const [isGettingGPS, setIsGettingGPS] = useState(false);\n  const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);`
  );
}

// Change the handler to trigger desktop block instead of showing alert
code = code.replace(
  /const isDesktop = !.*?;\n\s*if \(isDesktop\) \{[\s\S]*?return;\n\s*\}/g,
  `const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isDesktop) {
      setIsDesktopBlocked(true);
      return;
    }`
);

// Inject UI
const uiInjection = `
  const handleLocationSynced = (syncedCoords) => {
    setIsDesktopBlocked(false);
    setLatNum(syncedCoords.latitude);
    setLonNum(syncedCoords.longitude);
    handleLatLonChange(syncedCoords.latitude, syncedCoords.longitude);
    setGpsStatus({
      success: true,
      message: "Koordinat berhasil disinkronkan dari HP!",
    });
  };

  if (isDesktopBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-4 bg-gray-50 rounded-3xl border-2 border-gray-200">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Sinkron Lokasi via HP"
        />
        <button 
          onClick={() => setIsDesktopBlocked(false)} 
          className="mt-4 text-xs font-bold text-gray-500 hover:text-gray-900 underline"
        >
          Batal & Kembali
        </button>
      </div>
    );
  }

  return (`;
  
code = code.replace(/return \(\s*<div className="w-full flex flex-col gap-4">/, uiInjection.replace('return (', 'return (\n    <div className="w-full flex flex-col gap-4">'));

fs.writeFileSync(file, code);
console.log("Patched LocationPickerMap.jsx");
