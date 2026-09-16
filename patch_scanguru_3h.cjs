const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

const helperCode = `const LOCATION_SESSION_KEY = "yatama_location_sync_session";

function getCachedLocationSession() {
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
}
`;

if (!code.includes("LOCATION_SESSION_KEY")) {
  code = code.replace(
    /export default function ScanGuru\(\) \{/,
    `${helperCode}\nexport default function ScanGuru() {`
  );
}

// Replace state initialization
const oldStateRegex = /const \[coords, setCoords\] = useState\(null\);\n\s*const \[locationError, setLocationError\] = useState\(null\);\n\s*const isDesktop = !\(.*?;\n\s*const \[isDesktopBlocked, setIsDesktopBlocked\] = useState\(isDesktop\);\n\s*const \[isLocating, setIsLocating\] = useState\(false\);/;

const newState = `const cachedLoc = getCachedLocationSession();
  const [coords, setCoords] = useState(cachedLoc || null);
  const [locationError, setLocationError] = useState(null);
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(isDesktop && !cachedLoc?.isPcVerified);
  const [isLocating, setIsLocating] = useState(false);`;

code = code.replace(oldStateRegex, newState);

// Replace handleLocationSynced
const oldSyncedRegex = /const handleLocationSynced = \(syncedCoords\) => \{\n\s*setCoords\(syncedCoords\);\n\s*setIsDesktopBlocked\(false\);\n\s*setLocationError\(null\);\n\s*\};/;

const newSynced = `const handleLocationSynced = (syncedCoords) => {
    const expiresAt = Date.now() + 3 * 3600 * 1000; // 3 Hours TTL
    const fullSession = {
      ...syncedCoords,
      isPcVerified: true,
      expiresAt,
    };
    try {
      localStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(fullSession));
    } catch {}
    setCoords(fullSession);
    setIsDesktopBlocked(false);
    setLocationError(null);
  };`;

code = code.replace(oldSyncedRegex, newSynced);

fs.writeFileSync(file, code);
console.log("Patched ScanGuru.jsx with 3-hour TTL");
