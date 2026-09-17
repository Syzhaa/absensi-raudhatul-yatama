const fs = require('fs');

// 1. Patch ScanQR.jsx
let scanQR = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx', 'utf8');
scanQR = scanQR.replace(
  /localStorage\.setItem\(getLocationSessionKey\(effectiveLembaga\), JSON\.stringify\(fullSession\)\);/,
  `localStorage.setItem(getLocationSessionKey(effectiveLembaga), JSON.stringify(fullSession));
      localStorage.setItem("yatama_location_sync_session", JSON.stringify(fullSession));`
);
fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx', scanQR);
console.log('Patched ScanQR.jsx storage');

// 2. Patch ScanGuru.jsx
let scanGuru = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', 'utf8');

// Function to resolve session
const oldGuruSessionFunc = `function getCachedLocationSession() {
  try {
    const raw = localStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
      return parsed;
    }
    localStorage.removeItem(LOCATION_SESSION_KEY);
  } catch {
    localStorage.removeItem(LOCATION_SESSION_KEY);
  }
  return null;
}`;

const newGuruSessionFunc = `function getCachedLocationSession(currentLembaga = "ma") {
  try {
    const norm = (currentLembaga || "ma").toLowerCase();
    const specificKey = \`yatama_location_sync_session_\${norm}\`;
    let raw = localStorage.getItem(specificKey) || localStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
      return parsed;
    }
    localStorage.removeItem(specificKey);
    localStorage.removeItem(LOCATION_SESSION_KEY);
  } catch {
    localStorage.removeItem(LOCATION_SESSION_KEY);
  }
  return null;
}`;

scanGuru = scanGuru.replace(oldGuruSessionFunc, newGuruSessionFunc);

// Update handleLocationSynced in ScanGuru
scanGuru = scanGuru.replace(
  /localStorage\.setItem\(LOCATION_SESSION_KEY, JSON\.stringify\(fullSession\)\);/,
  `localStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(fullSession));
      localStorage.setItem(\`yatama_location_sync_session_\${(lembaga || "ma").toLowerCase()}\`, JSON.stringify(fullSession));`
);

// Add auto-start camera effect in ScanGuru
const oldGuruMountEffect = `  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);`;

const newGuruMountEffect = `  // Auto-start camera when unblocked and in camera mode
  useEffect(() => {
    if (!isDesktopBlocked && activeMethod === "camera") {
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDesktopBlocked, activeMethod, lembaga]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);`;

scanGuru = scanGuru.replace(oldGuruMountEffect, newGuruMountEffect);
fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', scanGuru);
console.log('Patched ScanGuru.jsx');
