const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

// Insert helper before component
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
    /export default function ScanQR\(\) \{/,
    `${helperCode}\nexport default function ScanQR() {`
  );
}

// Replace state initialization
const oldStateRegex = /const \[coords, setCoords\] = useState\(null\);\n\s*const \[locationError, setLocationError\] = useState\(null\);\n\s*const isDesktop = !\(.*?;\n\s*const \[isDesktopBlocked, setIsDesktopBlocked\] = useState\(isDesktop\);\n\s*const \[isLocating, setIsLocating\] = useState\(false\);\n\s*const coordsRef = useRef\(null\);/;

const newState = `const cachedLoc = getCachedLocationSession();
  const [coords, setCoords] = useState(cachedLoc || null);
  const [locationError, setLocationError] = useState(null);
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(isDesktop && !cachedLoc?.isPcVerified);
  const [isLocating, setIsLocating] = useState(false);
  const coordsRef = useRef(cachedLoc || null);`;

code = code.replace(oldStateRegex, newState);

// Replace handleLocationSynced
const oldSyncedRegex = /const handleLocationSynced = \(syncedCoords\) => \{[\s\S]*?setLocationError\(null\);\n\s*\};/;
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
    if (typeof coordsRef !== 'undefined' && coordsRef) {
      coordsRef.current = fullSession;
    }
    setIsDesktopBlocked(false);
    setLocationError(null);
  };`;
code = code.replace(oldSyncedRegex, newSynced);

// Update status badge to show remaining TTL
code = code.replace(
  /\{coords\.isPcVerified \? "PC Terverifikasi" : `\$\{currentDistance !== null \? `\$\{Math\.round\(currentDistance\)\}m` : ""\} \/ Maks \$\{radiusMax\}m`\}/,
  `{coords.isPcVerified ? \`PC Terverifikasi (s.d. \${format(new Date(coords.expiresAt || Date.now() + 3 * 3600 * 1000), "HH:mm")})\` : \`\${currentDistance !== null ? \`\${Math.round(currentDistance)}m\` : ""} / Maks \${radiusMax}m\`}`
);

fs.writeFileSync(file, code);
console.log("Patched ScanQR.jsx with 3-hour TTL");
