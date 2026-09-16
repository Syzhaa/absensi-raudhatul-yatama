const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /return \(\n      <div className="grid grid-cols-1/,
  `return (
    <div className="w-full pb-28 md:pb-8">
      <div className="grid grid-cols-1`
);

fs.writeFileSync(file, code);
console.log("Fixed return in ScanQR.jsx");
