const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

const handleLocationSyncedStr = `
  const handleLocationSynced = (syncedCoords) => {
    setCoords(syncedCoords);
    setIsDesktopBlocked(false);
    setLocationError(null);
  };

  if (isDesktopBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 w-full">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Akses Presensi via PC"
        />
      </div>
    );
  }

  return (`;
  
const regexScanGuru = /return \(\s*<div className="min-h-screen bg-slate-100/;
code = code.replace(regexScanGuru, handleLocationSyncedStr.replace('return (', 'return (\n    <div className="min-h-screen bg-slate-100'));

fs.writeFileSync(file, code);
console.log('Fixed ScanGuru');
