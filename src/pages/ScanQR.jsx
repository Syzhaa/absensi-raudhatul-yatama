import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [scanType, setScanType] = useState('check_in');
  const html5QrCodeRef = useRef(null);
  const restartTimerRef = useRef(null);
  const lastScannedRef = useRef(null);
  const scanTypeRef = useRef('check_in');
  const queryClient = useQueryClient();

  // Fetch recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ['recentLogs'],
    queryFn: () => attendanceService.getRecentLogs(5),
    refetchInterval: 10000,
  });

  useEffect(() => {
    scanTypeRef.current = scanType;
  }, [scanType]);

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
      if (html5QrCodeRef.current) {
        await stopScanning();
      }
      setTimeout(async () => {
        const readerElement = document.getElementById('qr-reader');
        if (!readerElement) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          stream.getTracks().forEach(track => track.stop());
          html5QrCodeRef.current = new Html5Qrcode('qr-reader');
          await html5QrCodeRef.current.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
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
      }, 100);
    } catch (err) {
      setCameraError('Gagal memulai scanner kamera.');
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const handleSwitchTab = (type) => {
    scanTypeRef.current = type;
    setScanType(type);
    lastScannedRef.current = null;
    if (!scanning && !result) {
      startScanning();
    }
  };

  const handleCloseModal = async () => {
    setResult(null);
    lastScannedRef.current = null;
    await startScanning();
  };

  const resultScanType = result?.scanType || scanType;
  const isResultCheckIn = resultScanType === 'check_in';
  const personName = result?.data?.type === 'student' ? result?.data?.student?.nama : result?.data?.teacher?.nama;
  const personNumber = result?.data?.student?.nis || result?.data?.student?.nisn || result?.data?.teacher?.nip || '-';
  const resultTime = isResultCheckIn ? result?.data?.attendance?.check_in : result?.data?.attendance?.check_out;
  const displayTime = resultTime ? resultTime.slice(0, 5) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const displayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 pb-28 md:pb-8 max-w-lg mx-auto">
      
      {/* 1. Navigasi Mode (Toggle Tabs) di Atas Kamera */}
      <div className="w-full max-w-sm bg-white/90 p-1.5 rounded-full border-3 border-gray-900 shadow-neo flex items-center mb-5">
        <button
          onClick={() => handleSwitchTab('check_in')}
          className={`flex-1 py-2.5 px-4 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all select-none ${
            scanType === 'check_in'
              ? 'bg-[#9bd47a] text-gray-900 border-2 border-gray-900 shadow-sm'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-xl">login</span>
          <span>MASUK</span>
        </button>
        <button
          onClick={() => handleSwitchTab('check_out')}
          className={`flex-1 py-2.5 px-4 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all select-none ${
            scanType === 'check_out'
              ? 'bg-[#9bd47a] text-gray-900 border-2 border-gray-900 shadow-sm'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span>PULANG</span>
        </button>
      </div>

      {/* 2. Area Kamera (Viewfinder) */}
      <div className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-3xl border-3 border-gray-900 overflow-hidden shadow-neo-lg">
        {/* QR Reader Viewport */}
        <div id="qr-reader" className="w-full h-full" />

        {/* Visual Bracket Scanner Corners */}
        <div className="absolute inset-6 pointer-events-none z-10 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="w-9 h-9 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
            <div className="w-9 h-9 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
          </div>
          <div className="flex justify-between">
            <div className="w-9 h-9 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
            <div className="w-9 h-9 border-b-4 border-r-4 border-white rounded-br-xl"></div>
          </div>
        </div>

        {/* Animated Scanning Line */}
        {scanning && (
          <div className="animate-scan-line h-1 bg-[#4ade80] shadow-[0_0_15px_#4ade80] absolute w-full left-0 z-20 pointer-events-none"></div>
        )}

        {/* Placeholder when not scanning */}
        {!scanning && !cameraError && (
          <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white z-10 p-4 text-center">
            <span className="material-symbols-outlined text-5xl mb-2 text-gray-400">videocam_off</span>
            <p className="font-bold text-sm text-gray-300">Kamera tidak aktif</p>
          </div>
        )}
      </div>

      {/* Camera Error Message (Minimalist 1-Line) */}
      {cameraError && (
        <div className="w-full max-w-sm mt-3 px-3.5 py-2 bg-red-100/90 border-2 border-gray-900 rounded-xl shadow-neo-sm flex items-center justify-between text-red-600 text-xs font-bold gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <span className="material-symbols-outlined text-base flex-shrink-0 text-red-600">error</span>
            <span className="truncate">{cameraError}</span>
          </div>
          <button
            onClick={startScanning}
            className="flex-shrink-0 px-2.5 py-1 bg-white hover:bg-red-50 text-gray-900 font-black border-1.5 border-gray-900 rounded-lg shadow-sm text-[11px] active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Tombol 'Stop Scan' */}
      <div className="w-full max-w-sm mt-5">
        {scanning ? (
          <button
            onClick={stopScanning}
            className="w-full bg-[#e5e7eb] hover:bg-gray-300 text-gray-900 font-extrabold py-3 px-6 border-3 border-gray-900 rounded-2xl shadow-neo transition-all flex items-center justify-center gap-2 text-base"
          >
            <span className="material-symbols-outlined text-xl">visibility_off</span>
            <span>Stop Scan</span>
          </button>
        ) : (
          <button
            onClick={startScanning}
            className="w-full bg-[#9bd47a] hover:bg-lime-400 text-gray-900 font-extrabold py-3 px-6 border-3 border-gray-900 rounded-2xl shadow-neo transition-all flex items-center justify-center gap-2 text-base"
          >
            <span className="material-symbols-outlined text-xl">videocam</span>
            <span>Mulai Scan</span>
          </button>
        )}
      </div>

      {/* 4. Modal Dialog Sukses Absensi (Popup) */}
      {result?.success && result.data && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo-xl p-6 pt-9 max-w-xs sm:max-w-sm w-full animate-fade-in">
            {/* Header Icon Checkmark (Centang besar hijau menonjol ke luar) */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#4ade80] border-3 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-3xl text-white font-black">check</span>
            </div>

            {/* Judul */}
            <h2 className="font-black text-xl text-gray-900 text-center mb-5 tracking-tight uppercase">
              BERHASIL ABSEN {isResultCheckIn ? 'MASUK' : 'PULANG'}
            </h2>

            {/* Detail Info Format Label & Titik Dua */}
            <div className="space-y-2 text-left mb-6 text-sm">
              <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                <span className="font-bold text-gray-600">Name</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-bold text-gray-900 truncate">{personName}</span>
              </div>
              <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                <span className="font-bold text-gray-600">{result.data.type === 'student' ? 'NIS' : 'NIP'}</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-bold text-gray-900">{personNumber}</span>
              </div>
              <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5 border-b border-gray-200">
                <span className="font-bold text-gray-600">Time</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-bold text-gray-900">{displayTime} WIB</span>
              </div>
              <div className="grid grid-cols-[55px_10px_1fr] items-baseline pb-1.5">
                <span className="font-bold text-gray-600">Date</span>
                <span className="font-bold text-gray-600">:</span>
                <span className="font-bold text-gray-900">{displayDate}</span>
              </div>
            </div>

            {/* Tombol Aksi Kapsul */}
            <button
              onClick={handleCloseModal}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-black py-2.5 border-3 border-gray-900 rounded-full shadow-neo transition-all active:translate-y-0.5"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog Gagal Absensi */}
      {result && !result.success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border-3 border-gray-900 rounded-3xl shadow-neo-xl p-6 pt-9 max-w-xs sm:max-w-sm w-full animate-fade-in text-center">
            {/* Header Icon Cross */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-red-500 border-3 border-gray-900 rounded-full flex items-center justify-center shadow-neo">
              <span className="material-symbols-outlined text-3xl text-white font-black">close</span>
            </div>

            <h2 className="font-black text-xl text-gray-900 text-center mb-3 tracking-tight uppercase">
              ABSEN GAGAL
            </h2>

            <p className="text-sm font-semibold text-red-600 mb-6 bg-red-50 p-3 rounded-xl border border-red-200">
              {result.message}
            </p>

            <button
              onClick={handleCloseModal}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-black py-2.5 border-3 border-gray-900 rounded-full shadow-neo transition-all active:translate-y-0.5"
            >
              TUTUP
            </button>
          </div>
        </div>
      )}

      {/* Recent Logs Section */}
      {recentLogs?.data && recentLogs.data.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-3">
          <h2 className="font-black text-base text-gray-800 uppercase tracking-tight">Riwayat Scan Hari Ini</h2>
          <div className="space-y-2.5">
            {recentLogs.data.map((log, index) => {
              const isCheckIn = log.type === 'check_in';
              const name = log.student?.nama || log.teacher?.nama || 'Unknown';
              const time = isCheckIn ? log.check_in : log.check_out;
              const badgeColor = isCheckIn ? 'bg-[#9bd47a] text-gray-900' : 'bg-primary-purple text-white';
              const badgeText = isCheckIn ? 'Masuk' : 'Pulang';
              const initials = (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={index} className="bg-white border-2 border-gray-900 rounded-xl px-3.5 py-2.5 flex items-center gap-3 shadow-neo">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full font-black text-xs border border-gray-900 ${isCheckIn ? 'bg-lime-100' : 'bg-purple-100'}`}>
                    {initials}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500">
                      {log.student ? 'Siswa' : 'Guru'} • {log.student?.kelas || log.teacher?.mapel || '-'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono font-bold text-xs text-gray-800">{time?.slice(0, 5)}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-gray-900 ${badgeColor}`}>
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
  );
}
