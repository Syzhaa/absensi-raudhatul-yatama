const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\{locationError && \(\s*<button\s*type="button"\s*onClick=\{setPcSchoolLocation\}[\s\S]*?<\/button>\s*\)\}/;
code = code.replace(regex, "");

fs.writeFileSync(file, code);
console.log("Removed button from ScanQR.jsx");
