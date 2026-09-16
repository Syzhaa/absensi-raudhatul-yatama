const fs = require('fs');

function patchFile(file, isGuru) {
  let code = fs.readFileSync(file, 'utf8');

  // 1. Tambahkan import DesktopLocationSync di bagian atas (setelah import react dkk)
  if (!code.includes('DesktopLocationSync')) {
    code = code.replace(
      /(import React.*?;\n)/,
      `$1import DesktopLocationSync from "../components/DesktopLocationSync";\n`
    );
  }

  // 2. Cari state 'isDesktopBlocked'
  // Ubah regex detectLocation untuk men-set state
  const detectRegex = /if \(isDesktop\) \{[\s\S]*?setLocationError\("⚠️ PERINGATAN: Gunakan HP \(Smartphone\) untuk absen atau memperbarui lokasi maps sekolah\."\);\n\s*setIsLocating\(false\);\n\s*return;\n\s*\}/;
  
  code = code.replace(detectRegex, `if (isDesktop) {
      setIsDesktopBlocked(true);
      return;
    }`);

  // 3. Daftarkan const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);
  if (!code.includes('isDesktopBlocked')) {
    code = code.replace(
      /const \[locationError, setLocationError\] = useState\(null\);/,
      `const [locationError, setLocationError] = useState(null);\n  const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);`
    );
  }

  // 4. Integrasikan UI QR Code sebagai fallback
  // Kita cari titik render utama. Biasanya return ( <Layout ...
  // Kita potong di tengahnya.
  const renderRegex = /return \(\s*<Layout.*?>/;
  
  const uiInjection = `
  const handleLocationSynced = (syncedCoords) => {
    setCoords(syncedCoords);
    ${!isGuru ? "coordsRef.current = syncedCoords;" : ""}
    setIsDesktopBlocked(false);
    setLocationError(null);
  };

  if (isDesktopBlocked) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <DesktopLocationSync 
            onLocationReceived={handleLocationSynced} 
            title="Akses via PC / Laptop"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>`;
    
  // Since we replaced the return <Layout> slightly, we need to match it generically
  // For ScanQR and ScanGuru:
  code = code.replace(/return \(\s*<Layout[^>]*>/, uiInjection.replace('<Layout>', '<Layout title="Presensi QR" userRole={isAdminRole ? "admin" : "guru"}>'));
  // The exact layout tags are different in ScanGuru vs ScanQR, let's do a safer string replace:

  fs.writeFileSync(file, code);
  console.log(`Patched logic in ${file}`);
}

// We will do a custom safer replace for the render part because <Layout> attributes differ.
