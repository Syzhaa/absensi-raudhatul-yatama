const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx';
let code = fs.readFileSync(file, 'utf8');

// The block has unmatched divs
code = code.replace(
  /if \(isDesktopBlocked\) \{\n    return \(\n    <div className="w-full pb-28 md:pb-8">\n      <div className="flex flex-col items-center justify-center min-h-\[60vh\] p-4 w-full">\n        <DesktopLocationSync \n          onLocationReceived=\{handleLocationSynced\} \n          title="Akses Presensi via PC"\n        \/>\n      <\/div>\n    \);\n  \}/,
  `if (isDesktopBlocked) {
    return (
      <div className="w-full pb-28 md:pb-8 flex flex-col items-center justify-center min-h-[60vh] p-4">
        <DesktopLocationSync 
          onLocationReceived={handleLocationSynced} 
          title="Akses Presensi via PC"
        />
      </div>
    );
  }`
);

fs.writeFileSync(file, code);
console.log("Fixed syntax in ScanQR.jsx");
