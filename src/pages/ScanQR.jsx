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
    <div className="flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl">
      {/* Scan Type Selection */}
      {!scanType && !result && (
        <div className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 text-center uppercase tracking-tight">Pilih Jenis Absensi</h1>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <button
              onClick={() => { setScanType('check_in'); startScanning(); }}
              className="bg-primary-green border-3 border-gray-900 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:clean-shadow-md transition-all active:shadow-none"
            >
              <span className="material-symbols-outlined text-5xl text-gray-800">login</span>
              <div className="text-center">
                <div className="text-gray-800 font-black text-lg md:text-xl">MASUK</div>
                <div className="text-gray-700 text-xs md:text-sm font-bold">Check-in</div>
              </div>
            </button>
            <button
              onClick={() => { setScanType('check_out'); startScanning(); }}
              className="bg-primary-purple border-3 border-gray-900 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:clean-shadow-md transition-all active:shadow-none"
            >
              <span className="material-symbols-outlined text-5xl text-gray-800">logout</span>
              <div className="text-center">
                <div className="text-gray-800 font-black text-lg md:text-xl">PULANG</div>
                <div className="text-gray-700 text-xs md:text-sm font-bold">Check-out</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="card bg-red-100 border-3 border-error">
          <div className="flex items-start gap-3 text-red-600">
            <span className="material-symbols-outlined text-2xl flex-shrink-0">error</span>
            <div className="flex-1">
              <p className="font-semibold text-base">{cameraError}</p>
              <p className="font-normal text-sm mt-1">Pastikan HTTPS dan izinkan kamera di browser.</p>
              <button 
                onClick={handleNewScan} 
                className="mt-3 w-full py-2 bg-white text-gray-800 border-2 border-gray-900 font-semibold neo-btn clean-shadow-sm"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Area */}
      {scanType && !result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <button 
              onClick={handleNewScan} 
              className="p-3 hover:bg-gray-50 border-2 border-gray-900 neo-btn bg-white"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <span className="font-bold text-xl text-gray-800">
              {scanType === 'check_in' ? '🟢 MASUK' : '🔵 PULANG'}
            </span>
          </div>
          <div
            id="qr-reader"
            className={'w-full border-3 border-gray-900 rounded-lg overflow-hidden ' + (scanning ? 'bg-black' : 'bg-gray-50')}
            style={{ minHeight: scanning ? 'auto' : '400px' }}
          />
          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full bg-error text-white font-bold py-4 border-3 border-gray-900 shadow-neo neo-btn"
            >
              Stop Scan
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={'p-8 border-3 border-gray-900 rounded-lg ' + (result.success ? 'bg-primary-green' : 'bg-red-100')}>
          <div className="text-center mb-6">
            {result.success ? (
              <span className="material-symbols-outlined text-8xl text-green-700 mx-auto block">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-8xl text-red-600 mx-auto block">cancel</span>
            )}
          </div>

          {result.success && result.data ? (
            <div className="text-center space-y-4">
              <p className="font-bold text-3xl text-gray-800">{personName}</p>
              {result.data.type === 'student' && result.data.student && (
                <p className="font-medium text-lg text-gray-600">
                  {result.data.student.kelas}
                </p>
              )}
              {result.data.attendance && (
                <div className="flex justify-center gap-4 mt-4">
                  {result.data.attendance.check_in && (
                    <span className="bg-white border-2 border-gray-900 px-4 py-2 font-mono text-green-700 font-bold text-xl">
                      {result.data.attendance.check_in}
                    </span>
                  )}
                  {result.data.attendance.check_out && (
                    <span className="bg-white border-2 border-gray-900 px-4 py-2 font-mono text-purple-600 font-bold text-xl">
                      {result.data.attendance.check_out}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center font-bold text-xl text-red-600">{result.message}</p>
          )}

          <button onClick={handleNewScan} className="w-full mt-6 btn-primary neo-btn py-4 text-xl">
            Scan Lagi
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
