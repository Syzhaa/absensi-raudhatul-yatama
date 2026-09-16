const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/components/LocationPickerMap.jsx';
let code = fs.readFileSync(file, 'utf8');

const regexGetCurrentGPS = /const handleGetCurrentGPS = async \(\) => \{/;
const replaceGetCurrentGPS = `const handleGetCurrentGPS = async () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isDesktop) {
      setGpsStatus({
        success: false,
        message: "⚠️ PERINGATAN: Gunakan HP (Smartphone) Anda untuk memperbarui lokasi maps sekolah.",
      });
      return;
    }`;
code = code.replace(regexGetCurrentGPS, replaceGetCurrentGPS);

const regexTestDistance = /const handleTestDistance = \(\) => \{/;
const replaceTestDistance = `const handleTestDistance = () => {
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isDesktop) {
      alert("⚠️ PERINGATAN: Gunakan HP (Smartphone) Anda untuk menguji jarak lokasi.");
      return;
    }`;
code = code.replace(regexTestDistance, replaceTestDistance);

fs.writeFileSync(file, code);
console.log("Patched LocationPickerMap.jsx");
