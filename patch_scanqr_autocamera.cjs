const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

// Look for the useEffect that starts scanning:
// useEffect(() => {
//   startScanning();
//   return () => {
//     stopScanning();
//     if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
//   };
// }, []);

const oldScanEffect = `  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);`;

const newScanEffect = `  // Auto-start scanner on mount or when desktop block is resolved
  useEffect(() => {
    if (!isDesktopBlocked && !showManualForm) {
      // Small timeout to guarantee #qr-reader is mounted in DOM
      const timer = setTimeout(() => {
        startScanning();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDesktopBlocked, showManualForm]);

  useEffect(() => {
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);`;

code = code.replace(oldScanEffect, newScanEffect);
fs.writeFileSync(file, code);
console.log("Patched ScanQR with auto camera start");
