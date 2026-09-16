const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

const brokenBlock = `  if (isDesktopBlocked && isLocationRequired && !coords?.isPcVerified) {
    return (
    <div className="min-h-screen bg-slate-100
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 w-full">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Akses Presensi via PC"
        />
      </div>
    );
  }

  return ( text-gray-900 font-sans p-3 sm:p-6 flex flex-col justify-between">`;

const cleanBlock = `  if (isDesktopBlocked && isLocationRequired && !coords?.isPcVerified) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Akses Presensi via PC"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 font-sans p-3 sm:p-6 flex flex-col justify-between">`;

code = code.replace(brokenBlock, cleanBlock);
fs.writeFileSync(file, code);
console.log("Fixed ScanGuru.jsx cleanly");
