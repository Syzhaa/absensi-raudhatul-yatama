const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Desktop state
const oldStateRegex = /const \[locationError, setLocationError\] = useState\(null\);\n\s*const \[isDesktopBlocked, setIsDesktopBlocked\] = useState\(false\);/;
const newState = `const [locationError, setLocationError] = useState(null);
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(isDesktop);`;
code = code.replace(oldStateRegex, newState);

// 2. Fix detectLocation
const oldDetectRegex = /const detectLocation = \(\) => \{[\s\S]*?if \(!navigator\.geolocation\) \{/;
const newDetect = `const detectLocation = () => {
    if (isDesktop && !coords?.isPcVerified) {
      setIsDesktopBlocked(true);
      setIsLocating(false);
      return;
    }

    if (!navigator.geolocation) {`;
code = code.replace(oldDetectRegex, newDetect);

// 3. Render condition for blocked desktop
const oldBlockCheck = /if \(isDesktopBlocked\) \{/;
const newBlockCheck = `if (isDesktopBlocked && isLocationRequired && !coords?.isPcVerified) {`;
code = code.replace(oldBlockCheck, newBlockCheck);

fs.writeFileSync(file, code);
console.log("Successfully patched ScanGuru.jsx");
