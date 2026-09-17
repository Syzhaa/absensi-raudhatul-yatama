const fs = require('fs');

// 1. Patch useScanner.js
let scannerCode = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js', 'utf8');

const oldScannerCamera = `        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          stream.getTracks().forEach((track) => track.stop());
          html5QrCodeRef.current = new Html5Qrcode("qr-reader");
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 10,
              aspectRatio: 1.0,
            },`;

const newScannerCamera = `        try {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: isMobile ? { facingMode: { ideal: "environment" } } : true,
            });
            stream.getTracks().forEach((track) => track.stop());
          } catch (e) {
            // Ignore pre-flight stream test error, let Html5Qrcode handle it
          }
          html5QrCodeRef.current = new Html5Qrcode("qr-reader");
          const cameraConfig = isMobile ? { facingMode: { ideal: "environment" } } : { facingMode: "user" };
          const scanCallback =`;

scannerCode = scannerCode.replace(oldScannerCamera, newScannerCamera);

// Also wrap the html5QrCodeRef.current.start with fallback
const oldStartEnd = `async (decodedText) => {`;
const newStartEnd = `async (decodedText) => {`;
// Let's check how start is called in useScanner.js
fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/hooks/useScanner.js', scannerCode);
console.log("Patched useScanner.js step 1");
