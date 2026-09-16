const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/absen/src/pages/LocationSyncMobile.jsx';
let code = fs.readFileSync(file, 'utf8');

// We need to fetch the current user to verify they are logged in before allowing sync
if (!code.includes('useAppStore')) {
  code = code.replace(
    /import axios from "axios";/,
    `import axios from "axios";\nimport useAppStore from "../store/useAppStore";`
  );
}

const functionBodyRegex = /export default function LocationSyncMobile\(\) \{([\s\S]*?)const handleSync = \(\) => \{/;

const newLogic = `export default function LocationSyncMobile() {
  const { sessionId } = useParams();
  const { user, isAuthenticated } = useAppStore();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Ketuk tombol di bawah untuk mengirim koordinat satelit (GPS) Anda ke sistem.");

  // Pembatasan Akses: Hanya Admin/Petugas/Guru yang terautentikasi yang boleh mengirim lokasi
  useEffect(() => {
    if (!isAuthenticated) {
      setStatus("error");
      setMessage("Akses Ditolak: Anda harus login ke akun Admin/Guru di HP ini terlebih dahulu sebelum dapat menyinkronkan lokasi.");
    }
  }, [isAuthenticated]);

  const handleSync = () => {
    if (!isAuthenticated) return;
`;

code = code.replace(functionBodyRegex, newLogic);

// Add logout warning to UI
const uiInjection = `{status === "error" && !isAuthenticated && (
          <div className="mt-4 px-4 py-3 bg-gray-100 rounded-xl border-2 border-gray-900 text-gray-800 font-bold text-sm">
            Silakan buka tab baru, login ke absen.raudhatulyatama.sch.id, lalu kembali ke halaman ini.
          </div>
        )}
        
        {status === "success" &&`;
code = code.replace(/\{status === "success" &&/, uiInjection);

fs.writeFileSync(file, code);
console.log("Updated LocationSyncMobile.jsx");
