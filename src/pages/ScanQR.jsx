import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { attendanceService } from '../services';
import { QrCode, CheckCircle, XCircle, Camera, AlertCircle } from 'lucide-react';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const scanMutation = useMutation({
    mutationFn: (uuid) => attendanceService.scan(uuid),
    onSuccess: (data) => {
      setResult({
        success: true,
        type: data.data.type,
        data: data.data,
      });
      stopScanning();
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Scan gagal',
      });
      stopScanning();
    },
  });

  const startScanning = async () => {
    setCameraError(null);
    setResult(null);
    
    try {
      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      // Now start html5-qrcode
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (!scanMutation.isPending) {
            scanMutation.mutate(decodedText);
          }
        },
        () => {
          // Ignore continuous scan errors
        }
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      
      let errorMsg = 'Tidak dapat mengakses kamera';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan. Pastikan device memiliki kamera.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Kamera sedang digunakan aplikasi lain.';
      } else if (err.name === 'NotSupportedError') {
        errorMsg = 'Browser tidak mendukung akses kamera atau halaman tidak HTTPS.';
      }
      
      setCameraError(errorMsg);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const handleNewScan = () => {
    setResult(null);
    setCameraError(null);
    startScanning();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <QrCode size={32} className="text-neo-green" />
          <div>
            <h1 className="text-3xl font-bold">Scan QR Code</h1>
            <p className="text-gray-600">Otomatis deteksi siswa atau guru</p>
          </div>
        </div>

        {/* Camera Error Alert */}
        {cameraError && (
          <div className="mb-6 p-4 bg-red-100 border-3 border-red-500 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-2">Kamera Error</p>
                <p className="mb-3">{cameraError}</p>
                <div className="space-y-2 text-sm">
                  <p className="font-bold">Troubleshooting:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Pastikan menggunakan HTTPS (bukan HTTP)</li>
                    <li>Klik icon gembok/kamera di address bar, izinkan kamera</li>
                    <li>Tutup aplikasi lain yang menggunakan kamera</li>
                    <li>Coba refresh halaman (Ctrl+Shift+R)</li>
                    <li>Gunakan browser Chrome/Firefox terbaru</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Area */}
        {!result && (
          <div className="mb-6">
            <div 
              id="qr-reader" 
              className={`w-full border-3 border-black ${scanning ? 'bg-black' : 'bg-gray-100'}`}
              style={{ minHeight: scanning ? 'auto' : '300px' }}
            />
          </div>
        )}

        {/* Scan Button */}
        {!scanning && !result && (
          <button
            onClick={startScanning}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            Mulai Scan
          </button>
        )}

        {/* Stop Button */}
        {scanning && !result && (
          <button
            onClick={stopScanning}
            className="w-full bg-red-500 text-white font-bold py-3 px-6 border-3 border-black shadow-neo hover:shadow-neo-lg transition-all"
          >
            Stop Scan
          </button>
        )}

        {/* Result */}
        {result && (
          <div className={`p-6 border-3 border-black ${
            result.success ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <div className="flex items-start gap-4 mb-4">
              {result.success ? (
                <CheckCircle size={48} className="text-green-600 flex-shrink-0" />
              ) : (
                <XCircle size={48} className="text-red-600 flex-shrink-0" />
              )}
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  {result.success ? 'Absensi Berhasil!' : 'Absensi Gagal'}
                </h2>
                
                {result.success && result.data && (
                  <div className="space-y-2">
                    <p className="text-lg">
                      <span className="font-bold">Tipe:</span>{' '}
                      {result.data.type === 'student' ? 'Siswa' : 'Guru'}
                    </p>
                    
                    {result.data.type === 'student' && result.data.student && (
                      <>
                        <p className="text-lg">
                          <span className="font-bold">Nama:</span>{' '}
                          {result.data.student.nama}
                        </p>
                        <p className="text-lg">
                          <span className="font-bold">NIS:</span>{' '}
                          {result.data.student.nis}
                        </p>
                        <p className="text-lg">
                          <span className="font-bold">Kelas:</span>{' '}
                          {result.data.student.kelas}
                        </p>
                      </>
                    )}
                    
                    {result.data.type === 'teacher' && result.data.teacher && (
                      <>
                        <p className="text-lg">
                          <span className="font-bold">Nama:</span>{' '}
                          {result.data.teacher.nama}
                        </p>
                        <p className="text-lg">
                          <span className="font-bold">NIP:</span>{' '}
                          {result.data.teacher.nip}
                        </p>
                      </>
                    )}
                    
                    {result.data.attendance && (
                      <>
                        <p className="text-lg">
                          <span className="font-bold">Jam:</span>{' '}
                          {new Date(result.data.attendance.check_in_time || result.data.attendance.check_in).toLocaleTimeString('id-ID')}
                        </p>
                        <p className="text-lg">
                          <span className="font-bold">Status:</span>{' '}
                          <span className={`px-3 py-1 font-bold ${
                            result.data.attendance.status === 'present' || result.data.attendance.status === 'hadir'
                              ? 'bg-green-500 text-white'
                              : 'bg-yellow-500 text-black'
                          }`}>
                            {result.data.attendance.status === 'present' ? 'HADIR' :
                             result.data.attendance.status === 'late' ? 'TERLAMBAT' :
                             result.data.attendance.status.toUpperCase()}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                {!result.success && (
                  <p className="text-lg text-red-700">{result.message}</p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleNewScan}
              className="w-full btn-primary"
            >
              Scan Lagi
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50">
        <h3 className="font-bold mb-3">📱 Cara Menggunakan:</h3>
        <ol className="list-decimal ml-5 space-y-2 text-gray-700">
          <li>Klik tombol "Mulai Scan"</li>
          <li>Izinkan akses kamera (jika diminta)</li>
          <li>Arahkan kamera ke QR code siswa atau guru</li>
          <li>Sistem otomatis deteksi dan catat absensi</li>
          <li>Lihat hasil scan di layar</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-100 border-2 border-yellow-500">
          <p className="text-sm font-bold text-yellow-800">
            ⚠️ Penting: Halaman harus HTTPS untuk akses kamera
          </p>
        </div>
      </div>
    </div>
  );
}
