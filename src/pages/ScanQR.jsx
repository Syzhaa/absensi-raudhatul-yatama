import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services';

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
            <span className="material-symbols-outlined text-4xl text-primary-container">qr_code_scanner</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Scan QR</h1>
          </div>
          <p className="text-center font-label-lg text-label-lg text-on-surface mb-4">Pilih Jenis Absensi</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setScanType('check_in'); startScanning(); }}
              className="py-8 bg-neo-green text-on-primary font-label-lg border-3 border-outline shadow-neo neo-btn"
            >
              <div className="text-4xl mb-2">🟢</div>
              <div className="text-xl">MASUK</div>
            </button>
            <button
              onClick={() => { setScanType('check_out'); startScanning(); }}
              className="py-8 bg-tertiary text-on-tertiary font-label-lg border-3 border-outline shadow-neo neo-btn"
            >
              <div className="text-4xl mb-2">🔵</div>
              <div className="text-xl">PULANG</div>
            </button>
          </div>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="card bg-error-container border-3 border-error">
          <div className="flex items-start gap-3 text-on-error-container">
            <span className="material-symbols-outlined text-2xl flex-shrink-0">error</span>
            <div className="flex-1">
              <p className="font-label-lg text-label-lg">{cameraError}</p>
              <p className="font-body-md text-sm mt-1">Pastikan HTTPS dan izinkan kamera di browser.</p>
              <button 
                onClick={handleNewScan} 
                className="mt-3 w-full py-2 bg-surface text-on-surface border-2 border-outline font-label-lg neo-btn shadow-neo-sm"
              >
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
            <button 
              onClick={handleNewScan} 
              className="p-2 hover:bg-surface-container border-2 border-outline neo-btn"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-label-lg text-label-lg text-on-surface">
              {scanType === 'check_in' ? '🟢 MASUK' : '🔵 PULANG'}
            </span>
          </div>
          <div
            id="qr-reader"
            className={'w-full border-3 border-outline ' + (scanning ? 'bg-black' : 'bg-surface-container')}
            style={{ minHeight: scanning ? 'auto' : '250px' }}
          />
          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full mt-3 bg-error text-on-error font-label-lg py-3 border-3 border-outline shadow-neo neo-btn"
            >
              Stop Scan
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={'card ' + (result.success ? 'bg-primary-container' : 'bg-error-container')}>
          <div className="text-center mb-4">
            {result.success ? (
              <span className="material-symbols-outlined text-6xl text-neo-green mx-auto block">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-6xl text-error mx-auto block">cancel</span>
            )}
          </div>

          {result.success && result.data ? (
            <div className="text-center space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-primary-container">{result.data.message}</h2>
              <p className="font-headline-lg text-headline-lg text-on-primary-container">{personName}</p>
              {result.data.type === 'student' && result.data.student && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {result.data.student.kelas} — NISN {result.data.student?.nisn || result.data.student?.nis}
                </p>
              )}
              {result.data.attendance && (
                <div className="flex justify-center gap-3 mt-2 flex-wrap">
                  {result.data.attendance.check_in && (
                    <span className="bg-surface border-2 border-outline px-3 py-1 font-mono text-neo-green font-bold text-sm">
                      In: {result.data.attendance.check_in}
                    </span>
                  )}
                  {result.data.attendance.check_out && (
                    <span className="bg-surface border-2 border-outline px-3 py-1 font-mono text-tertiary font-bold text-sm">
                      Out: {result.data.attendance.check_out}
                    </span>
                  )}
                  <span className={'px-3 py-1 font-bold border-2 border-outline text-sm ' +
                    (result.data.attendance.status === 'hadir' ? 'bg-neo-green text-on-primary' : 'bg-neo-yellow text-on-primary-container')
                  }>
                    {result.data.attendance.status?.toUpperCase()}
                  </span>
                </div>
              )}
              <p className="font-body-md text-sm text-on-surface-variant mt-2">Melanjutkan scan dalam 3 detik...</p>
            </div>
          ) : (
            <p className="text-center font-label-lg text-label-lg text-on-error-container">{result.message}</p>
          )}

          <button onClick={handleNewScan} className="w-full mt-4 btn-primary neo-btn">
            Scan Lagi
          </button>
        </div>
      )}
    </div>
  );
}
