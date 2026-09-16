const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/components/ScanResultModal.jsx';
let code = fs.readFileSync(file, 'utf8');

// Update success title
code = code.replace(
  /\{result\.manual\s*\?\s*"BERHASIL DISIMPAN"\s*:\s*`BERHASIL ABSEN \$\{isResultCheckIn \? "MASUK" : "PULANG"\}`\}/,
  `{result.manual
                ? (result.message?.includes("PC") || result.message?.includes("Lokasi") ? "LOKASI TERSINKRON" : "BERHASIL DISIMPAN")
                : \`BERHASIL ABSEN \${isResultCheckIn ? "MASUK" : "PULANG"}\`}`
);

// Update error title
code = code.replace(
  /<h2 className="font-black text-xl text-gray-900 text-center mb-3 tracking-tight uppercase">\s*ABSEN GAGAL\s*<\/h2>/,
  `<h2 className="font-black text-xl text-gray-900 text-center mb-3 tracking-tight uppercase">
              {result.manual || result.message?.includes("Sinkron") || result.message?.includes("Akses Ditolak")
                ? "SINKRONISASI DITOLAK"
                : "ABSEN GAGAL"}
            </h2>`
);

fs.writeFileSync(file, code);
console.log("Patched ScanResultModal.jsx");
