const fs = require('fs');

function injectUI(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (code.includes('<DesktopLocationSync')) {
     console.log('Already injected', file);
     return;
  }

  const handleLocationSyncedStr = `
  const handleLocationSynced = (syncedCoords) => {
    setCoords(syncedCoords);
    if (typeof coordsRef !== 'undefined' && coordsRef) {
       coordsRef.current = syncedCoords;
    }
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

  // Try to find the main return ( div or Layout
  const regexScanQR = /return \(\s*<div className="w-full pb-28 md:pb-8">/;
  const regexScanGuru = /return \(\s*<div className="w-full pb-20 md:pb-8">/;
  
  if (regexScanQR.test(code)) {
    code = code.replace(regexScanQR, handleLocationSyncedStr.replace('return (', 'return (\n    <div className="w-full pb-28 md:pb-8">'));
    fs.writeFileSync(file, code);
    console.log(`Injected UI in ScanQR`);
  } else if (regexScanGuru.test(code)) {
    code = code.replace(regexScanGuru, handleLocationSyncedStr.replace('return (', 'return (\n    <div className="w-full pb-20 md:pb-8">'));
    fs.writeFileSync(file, code);
    console.log(`Injected UI in ScanGuru`);
  } else {
    // maybe it returns just <div className="w-full...
    const fallbackRegex = /return \(\s*<div className="w-full/;
    if (fallbackRegex.test(code)) {
       code = code.replace(fallbackRegex, handleLocationSyncedStr.replace('return (', 'return (\n    <div className="w-full'));
       fs.writeFileSync(file, code);
       console.log('Injected UI via fallback', file);
    } else {
       console.log('Could not find return render in', file);
    }
  }
}

injectUI('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx');
injectUI('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx');
