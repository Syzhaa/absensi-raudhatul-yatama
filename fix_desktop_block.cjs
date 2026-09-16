const fs = require('fs');

function patchFile(file, isMap) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  const regex = /const isDesktop = !\(\/Android\|webOS\|iPhone\|iPad\|iPod\|BlackBerry\|IEMobile\|Opera Mini\/i\.test\(navigator\.userAgent\)\);\n\n.*?(?:\n.*?)*?(?:setPcSchoolLocation\(\);\n.*?return;\n.*?\}|if \(!navigator\.geolocation\))/s;

  const newBlock = `const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    // BLOKIR AKSES DARI PC/LAPTOP SESUAI INSTRUKSI BARU
    if (isDesktop) {
      setLocationError("⚠️ PERINGATAN: Gunakan HP (Smartphone) untuk absen atau memperbarui lokasi maps sekolah.");
      setIsLocating(false);
      return;
    }

    if (!navigator.geolocation)`;

  code = code.replace(regex, newBlock);
  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}

patchFile('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx', false);
patchFile('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', false);
