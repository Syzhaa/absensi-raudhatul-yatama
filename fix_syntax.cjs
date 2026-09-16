const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  // replace the duplicate or bad syntax
  code = code.replace(/\{\s*setLocationError\("Browser tidak mendukung sensor GPS\."\);\s*return;\s*\}/, 
  `if (!navigator.geolocation) {
      setLocationError("Browser tidak mendukung sensor GPS.");
      return;
    }`);
  fs.writeFileSync(file, code);
}

fix('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx');
fix('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx');
