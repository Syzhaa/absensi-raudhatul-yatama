const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/App.jsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('LocationSyncMobile')) {
  code = code.replace(
    /(import ScanGuru from "\.\/pages\/ScanGuru";)/,
    `$1\nimport LocationSyncMobile from "./pages/LocationSyncMobile";`
  );
  
  // Add the route route /sync/:sessionId
  // Looking for <Route path="/scan-guru" element={<ScanGuru />} />
  code = code.replace(
    /(<Route path="\/scan-guru".*?\/>)/,
    `$1\n        <Route path="/sync/:sessionId" element={<LocationSyncMobile />} />`
  );
}

fs.writeFileSync(file, code);
console.log("Patched App.jsx");
