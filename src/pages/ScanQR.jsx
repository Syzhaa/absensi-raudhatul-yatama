import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [scanType, setScanType] = useState(null);
  const html5QrCodeRef = useRef(null);
  const restartTimerRef = useRef(null);
  const lastScannedRef = useRef(null);
  const scanTypeRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ['recentLogs'],
    queryFn: () => attendanceService.getRecentLogs(5),
    refetchInterval: 10000, // refresh every 10s
  });

  useEffect(() => {
    scanTypeRef.current = scanType;
  }, [scanType]);

  // Cleanup on unmount: stop camera + clear restart timer (prevent memory leak)
  useEffect(() => {
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const scanMutation = useMutation({
    mutationFn: (uuid) => attendanceService.scan(uuid, scanTypeRef.current),
    onSuccess: (data) => {
      const activeScanType = scanTypeRef.current;
      setResult({ success: true, type: data.data.type, data: data.data, scanType: activeScanType });
      stopScanning();
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['recentLogs'] });
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
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    await stopScanning();
    setResult(null);
    setCameraError(null);
    setScanType(null);
    lastScannedRef.current = null;
  };

  const resultScanType = result?.scanType || scanType;
  const isResultCheckIn = resultScanType === 'check_in';
  const personName = result?.data?.type === 'student' ? result?.data?.student?.nama : result?.data?.teacher?.nama;
  const personNumber = result?.data?.student?.nis || result?.data?.student?.nisn || result?.data?.teacher?.nip || '-';
  const resultTime = isResultCheckIn ? result?.data?.attendance?.check_in : result?.data?.attendance?.check_out;
  const displayTime = resultTime ? resultTime.slice(0, 5) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const displayDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center justify-center px-4 py-4 pb-28 md:pb-6">
      <div className="w-full max-w-2xl">
      {/* Scan Type Selection */}
      {!scanType && !result && (
        <div className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 text-center uppercase tracking-tight">Pilih Jenis Absensi</h1>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <button
              onClick={() => { scanTypeRef.current = 'check_in'; setScanType('check_in'); startScanning(); }}
              className="bg-primary-green border-3 border-gray-900 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:clean-shadow-md transition-all active:shadow-none"
            >
              <span className="material-symbols-outlined text-5xl text-gray-800">login</span>
              <div className="text-center">
                <div className="text-gray-800 font-black text-lg md:text-xl">MASUK</div>
                <div className="text-gray-700 text-xs md:text-sm font-bold">Check-in</div>
              </div>
            </button>
            <button
              onClick={() => { scanTypeRef.current = 'check_out'; setScanType('check_out'); startScanning(); }}
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
          {/* Toggle Tabs: MASUK / PULANG */}
          <div className="flex gap-1.5 p-1 bg-white/80 border-3 border-gray-900 rounded-full shadow-neo-sm">
            <button
              onClick={() => { scanTypeRef.current = 'check_in'; setScanType('check_in'); }}
              className={`flex-1 py-2.5 px-4 font-black text-sm md:text-base transition-all rounded-full flex items-center justify-center gap-1.5 ${
                scanType === 'check_in'
                  ? 'bg-primary-green text-gray-800 shadow-neo'
                  : 'bg-gray-100/80 text-gray-600'
              }`}
            >
              <span className="material-symbols-outlined text-lg">login</span>
              MASUK
            </button>
            <button
              onClick={() => { scanTypeRef.current = 'check_out'; setScanType('check_out'); }}
              className={`flex-1 py-2.5 px-4 font-black text-sm md:text-base transition-all rounded-full flex items-center justify-center gap-1.5 ${
                scanType === 'check_out'
                  ? 'bg-primary-green text-gray-800 shadow-neo'
                  : 'bg-gray-100/80 text-gray-600'
              }`}
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              PULANG
            </button>
          </div>

          {/* Camera Viewfinder with Scanner */}
          <div className="relative w-full aspect-square sm:aspect-[4/3] bg-gray-900 border-3 border-gray-900 rounded-2xl overflow-hidden shadow-neo-lg">
            {/* QR Reader */}
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Scanner Brackets (Corner Markers) */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-Left */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-3 border-l-3 border-white"></div>
              {/* Top-Right */}
              <div className="absolute top-4 right-4 w-6 h-6 border-t-3 border-r-3 border-white"></div>
              {/* Bottom-Left */}
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-3 border-l-3 border-white"></div>
              {/* Bottom-Right */}
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-3 border-r-3 border-white"></div>
            </div>

            {/* Animated Scanning Line */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="animate-scan-line h-1 bg-primary-green absolute w-full shadow-[0_0_18px_rgba(177,224,74,0.9)]"></div>
              </div>
            )}
          </div>

          {/* Stop Scan Button */}
          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full bg-white text-gray-800 font-black py-3 border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">visibility_off</span>
              Stop Scan
            </button>
          )}
        </div>
      )}

      {/* Success Modal */}
      {result?.success && result.data && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleNewScan}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white border-4 border-gray-900 rounded-3xl shadow-neo-xl p-6 pt-10 md:p-8 md:pt-10 max-w-sm w-full animate-fade-in">
            {/* Icon Checkmark (partially outside) */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary-green border-4 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-4xl text-white">check</span>
            </div>
            
            {/* Title */}
            <h2 className="font-black text-2xl text-gray-800 text-center mb-6 uppercase tracking-tight leading-tight">
              BERHASIL ABSEN {isResultCheckIn ? 'MASUK' : 'PULANG'}
            </h2>
            
            {/* Details */}
            <div className="space-y-3 mb-8 text-sm">
              <div className="grid grid-cols-[64px_10px_1fr] items-start gap-2 border-b-2 border-gray-200 pb-2">
                <span className="font-bold text-gray-600">Name</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-black text-gray-800 text-right leading-tight">{personName}</span>
              </div>
              <div className="grid grid-cols-[64px_10px_1fr] items-start gap-2 border-b-2 border-gray-200 pb-2">
                <span className="font-bold text-gray-600">{result.data.type === 'student' ? 'NIS' : 'NIP'}</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-black text-gray-800 text-right">{personNumber}</span>
              </div>
              <div className="grid grid-cols-[64px_10px_1fr] items-start gap-2 border-b-2 border-gray-200 pb-2">
                <span className="font-bold text-gray-600">Time</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-black text-gray-800 text-right">{displayTime} WIB</span>
              </div>
              <div className="grid grid-cols-[64px_10px_1fr] items-start gap-2 border-b-2 border-gray-200 pb-2">
                <span className="font-bold text-gray-600">Date</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-black text-gray-800 text-right leading-tight">{displayDate}</span>
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={handleNewScan}
              className="w-full bg-white text-gray-800 font-black py-3 border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md transition-all"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {/* Recent Logs Section */}
      {recentLogs?.data && recentLogs.data.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="font-black text-lg text-gray-800 uppercase tracking-tight">Riwayat Scan Hari Ini</h2>
          <div className="space-y-3">
            {recentLogs.data.map((log, index) => {
              const isCheckIn = log.type === 'check_in';
              const name = log.student?.nama || log.teacher?.nama || 'Unknown';
              const time = isCheckIn ? log.check_in : log.check_out;
              const badgeColor = isCheckIn ? 'bg-primary-green' : 'bg-primary-purple';
              const badgeText = isCheckIn ? 'Masuk' : 'Pulang';
              const initials = (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={index} className="bg-white border-2 border-gray-900 rounded-lg px-4 py-3 flex items-center gap-3 shadow-neo">
                  {/* Initials Circle */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isCheckIn ? 'bg-green-100' : 'bg-purple-100'}`}>
                    <span className="font-black text-sm text-gray-800">{initials}</span>
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-600">
                      {log.student ? 'Siswa' : 'Guru'} • {log.student?.kelas || log.teacher?.mapel || '-'}
                    </p>
                  </div>
                  
                  {/* Time & Status */}
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono font-bold text-sm text-gray-800">{time?.slice(0, 5)}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md text-white ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
