const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /onBeforeScan,\n  \}\);/,
  `onBeforeScan,\n    coordsRef,\n  });`
);

fs.writeFileSync(file, code);
console.log("Patched ScanQR with coordsRef");
