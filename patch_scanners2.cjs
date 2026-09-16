const fs = require('fs');

function patchLogic(file, isGuru) {
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('DesktopLocationSync')) {
    code = `import DesktopLocationSync from "../components/DesktopLocationSync";\n` + code;
  }

  const detectRegex = /if \(isDesktop\) \{[\s\S]*?setLocationError\("⚠️ PERINGATAN: Gunakan HP.*?return;\n\s*\}/;
  code = code.replace(detectRegex, `if (isDesktop) {
      setIsDesktopBlocked(true);
      return;
    }`);

  if (!code.includes('isDesktopBlocked')) {
    code = code.replace(
      /const \[locationError, setLocationError\] = useState\(null\);/,
      `const [locationError, setLocationError] = useState(null);\n  const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);`
    );
  }

  // Inject handleLocationSynced before the first `return (` of the component
  const handleLocationSyncedStr = `
  const handleLocationSynced = (syncedCoords) => {
    setCoords(syncedCoords);
    ${!isGuru ? "coordsRef.current = syncedCoords;" : ""}
    setIsDesktopBlocked(false);
    setLocationError(null);
  };

  if (isDesktopBlocked) {
    return (
      <Layout ${isGuru ? '' : 'title="Presensi QR" userRole={isAdminRole ? "admin" : "guru"}'}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <DesktopLocationSync 
            onLocationReceived={handleLocationSynced} 
            title="Akses Presensi via PC"
          />
        </div>
      </Layout>
    );
  }

  return (`;
  
  // Find `return (` that returns `<Layout`
  const returnRegex = /return \(\s*<Layout/;
  code = code.replace(returnRegex, handleLocationSyncedStr.replace('return (', 'return (\n    <Layout'));

  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}

patchLogic('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanQR.jsx', false);
patchLogic('/media/syzhaa/DATA/Project/yatama/absen/src/pages/ScanGuru.jsx', true);
