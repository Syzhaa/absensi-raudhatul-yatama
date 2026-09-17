const fs = require('fs');

// 1. Fix useScanner.js
let scannerCode = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js', 'utf8');

const oldEnd = `              setTimeout(() => {
                if (lastScannedRef.current === decodedText) {
                  lastScannedRef.current = null;
                }
              }, 3000);
            },
            () => {},
          );
          setScanning(true);`;

const newEnd = `              setTimeout(() => {
                if (lastScannedRef.current === decodedText) {
                  lastScannedRef.current = null;
                }
              }, 3000);
            };

          try {
            await html5QrCodeRef.current.start(cameraConfig, { fps: 10, aspectRatio: 1.0 }, scanCallback, () => {});
          } catch (camErr) {
            // Fallback to any default camera if ideal/facingMode constraint fails
            await html5QrCodeRef.current.start({}, { fps: 10, aspectRatio: 1.0 }, scanCallback, () => {});
          }
          setScanning(true);`;

scannerCode = scannerCode.replace(oldEnd, newEnd);
fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js', scannerCode);
console.log("Patched useScanner.js camera execution");

// 2. Fix ScanGuru.jsx
let guruCode = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', 'utf8');

const oldGuruStart = `      await qr.start(
        { facingMode: "environment" },
        { fps: 10, aspectRatio: 1.0 },`;

const newGuruStart = `      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cameraConfig = isMobile ? { facingMode: { ideal: "environment" } } : { facingMode: "user" };

      const guruScanCallback =`;

guruCode = guruCode.replace(oldGuruStart, newGuruStart);

const oldGuruEnd = `          submitScan(decodedText);
          await stopCamera();
        }
      );
      setIsScanning(true);`;

const newGuruEnd = `          submitScan(decodedText);
          await stopCamera();
        };

      try {
        await qr.start(cameraConfig, { fps: 10, aspectRatio: 1.0 }, guruScanCallback);
      } catch (camErr) {
        await qr.start({}, { fps: 10, aspectRatio: 1.0 }, guruScanCallback);
      }
      setIsScanning(true);`;

guruCode = guruCode.replace(oldGuruEnd, newGuruEnd);
fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', guruCode);
console.log("Patched ScanGuru.jsx camera execution");
