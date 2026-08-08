import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services';
import { QrCode, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [scanType, setScanType] = useState(null);
  const html5QrCodeRef = useRef(null);
  const restartTimerRef = useRef(null);
  const lastScannedRef = useRef(null);
  const queryClient = useQueryClient();

  // Cleanup on unmount: stop camera + clear restart timer (prevent memory leak)
  useEffect(() => {
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const scanMutation = useMutation({
    mutationFn: (uuid) => attendanceService.scan(uuid, scanType),
    onSuccess: (data) => {
      setResult({ success: true, type: data.data.type, data: data.data });
      stopScanning();
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      restartTimerRef.current = setTimeout(() => {
        setResult(null);
        setCameraError(null);
        startScanning();
      }, 3500);
    },
    onError: (error) => {
      setResult({ success: false, message: error.response?.data?.message || 'Scan gagal' });
      stopScanning();
    },
  });

  const startScanning = async () => {
    setCameraError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (scanMutation.isPending || lastScannedRef.current === decodedText) return;
          lastScannedRef.current = decodedText;
          scanMutation.mutate(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      let errorMsg = 'Tidak dapat mengakses kamera';
      if (err.name === 'NotAllowedError') errorMsg = 'Akses kamera ditolak. Izinkan di pengaturan browser.';
      else if (err.name === 'NotFoundError') errorMsg = 'Kamera tidak ditemukan.';
      else if (err.name === 'NotReadableError') errorMsg = 'Kamera sedang digunakan aplikasi lain.';
      else if (err.name === 'NotSupportedError') errorMsg = 'Browser tidak mendukung atau halaman tidak HTTPS.';
      setCameraError(errorMsg);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); html5QrCodeRef.current.clear(); html5QrCodeRef.current = null; } catch (e) {}
    }
    setScanning(false);
  };

  useEffect(() => { return () => { stopScanning(); }; }, []);

  const handleNewScan = async () => {
    await stopScanning();
    setResult(null);
    setCameraError(null);
    setScanType(null);
    lastScannedRef.current = null;
  };

  const personName = result?.data?.type === 'student' ? result?.data?.student?.nama : result?.data?.teacher?.nama;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Scan Type Selection */}
      {!scanType && !result && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <QrCode size={28} className="text-neo-green" />
            <h1 className="text-2xl md:text-3xl font-bold">Scan QR</h1>
          </div>
          <p className="text-center font-bold mb-4">Pilih Jenis Absensi</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setScanType('check_in'); startScanning(); }}
              className="py-8 bg-green-500 text-white font-bold border-3 border-black shadow-neo active:scale-95 transition-transform"
            >
              <div className="text-4xl mb-2">{'🟢'}</div>
              <div className="text-xl">MASUK</div>
            </button>
            <button
              onClick={() => { setScanType('check_out'); startScanning(); }}
              className="py-8 bg-blue-500 text-white font-bold border-3 border-black shadow-neo active:scale-95 transition-transform"
            >
              <div className="text-4xl mb-2">{'🔵'}</div>
              <div className="text-xl">PULANG</div>
            </button>
          </div>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="card bg-red-100 border-3 border-red-500">
          <div className="flex items-start gap-2 text-red-700">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{cameraError}</p>
              <p className="text-sm mt-1">Pastikan HTTPS dan izinkan kamera di browser.</p>
              <button onClick={handleNewScan} className="mt-3 w-full py-2 bg-white border-2 border-black font-bold active:scale-95">
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Area */}
      {scanType && !result && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={handleNewScan} className="p-2 hover:bg-gray-100 border-2 border-black active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <span className="font-bold">
              {scanType === 'check_in' ? '🟢 MASUK' : '🔵 PULANG'}
            </span>
          </div>
          <div
            id="qr-reader"
            className={'w-full border-3 border-black ' + (scanning ? 'bg-black' : 'bg-gray-100')}
            style={{ minHeight: scanning ? 'auto' : '250px' }}
          />
          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full mt-3 bg-red-500 text-white font-bold py-3 border-3 border-black shadow-neo active:scale-95 transition-transform"
            >
              Stop Scan
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={'card ' + (result.success ? 'bg-green-100' : 'bg-red-100')}>
          <div className="text-center mb-4">
            {result.success ? (
              <CheckCircle size={56} className="mx-auto text-green-600" />
            ) : (
              <XCircle size={56} className="mx-auto text-red-600" />
            )}
          </div>

          {result.success && result.data ? (
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">{result.data.message}</h2>
              <p className="text-2xl font-bold">{personName}</p>
              {result.data.type === 'student' && result.data.student && (
                <p className="text-gray-600">{result.data.student.kelas} — NISN {result.data.student?.nisn || result.data.student?.nis}</p>
              )}
              {result.data.attendance && (
                <div className="flex justify-center gap-3 mt-2 flex-wrap">
                  {result.data.attendance.check_in && (
                    <span className="bg-white border-2 border-black px-3 py-1 font-mono text-green-600 font-bold text-sm">
                      In: {result.data.attendance.check_in}
                    </span>
                  )}
                  {result.data.attendance.check_out && (
                    <span className="bg-white border-2 border-black px-3 py-1 font-mono text-blue-600 font-bold text-sm">
                      Out: {result.data.attendance.check_out}
                    </span>
                  )}
                  <span className={'px-3 py-1 font-bold border-2 border-black text-sm ' +
                    (result.data.attendance.status === 'hadir' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black')
                  }>
                    {result.data.attendance.status?.toUpperCase()}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">Melanjutkan scan dalam 3 detik...</p>
            </div>
          ) : (
            <p className="text-center text-lg text-red-700 font-bold">{result.message}</p>
          )}

          <button onClick={handleNewScan} className="w-full mt-4 btn-primary active:scale-95">
            Scan Lagi
          </button>
        </div>
      )}
    </div>
  );
}
