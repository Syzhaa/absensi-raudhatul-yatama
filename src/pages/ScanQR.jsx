import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { attendanceService } from '../services';
import { QrCode, CheckCircle, XCircle, User } from 'lucide-react';

export default function ScanQR() {
  const [scanType, setScanType] = useState('student');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const scanMutation = useMutation({
    mutationFn: (uuid) => {
      return scanType === 'student'
        ? attendanceService.scanStudent(uuid)
        : attendanceService.scanTeacher(uuid);
    },
    onSuccess: (data) => {
      setResult({
        success: true,
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
    try {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          scanMutation.mutate(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
      
      setScanning(true);
      setResult(null);
    } catch (err) {
      alert('Tidak dapat mengakses kamera: ' + err.message);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
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
    startScanning();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold mb-4">Scan QR Code</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setScanType('student')}
            className={`flex-1 py-3 px-4 font-bold border-3 border-black ${
              scanType === 'student'
                ? 'bg-neo-green shadow-neo'
                : 'bg-white shadow-neo hover:shadow-neo-lg'
            } transition-all`}
          >
            Siswa
          </button>
          <button
            onClick={() => setScanType('teacher')}
            className={`flex-1 py-3 px-4 font-bold border-3 border-black ${
              scanType === 'teacher'
                ? 'bg-neo-yellow shadow-neo'
                : 'bg-white shadow-neo hover:shadow-neo-lg'
            } transition-all`}
          >
            Guru
          </button>
        </div>

        {!scanning && !result && (
          <button onClick={startScanning} className="w-full btn-primary">
            <div className="flex items-center justify-center gap-2">
              <QrCode size={24} />
              <span>Mulai Scan</span>
            </div>
          </button>
        )}

        {scanning && (
          <div className="space-y-4">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="border-3 border-black"
            ></div>
            <button onClick={stopScanning} className="w-full btn-secondary">
              Batal
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div
              className={`p-6 border-3 border-black ${
                result.success ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                {result.success ? (
                  <CheckCircle size={48} className="text-green-600" />
                ) : (
                  <XCircle size={48} className="text-red-600" />
                )}
                <div>
                  <h2 className="text-2xl font-bold">
                    {result.success ? 'Berhasil!' : 'Gagal!'}
                  </h2>
                  <p className="text-gray-700">
                    {result.success
                      ? result.data.message
                      : result.message}
                  </p>
                </div>
              </div>

              {result.success && result.data.student && (
                <div className="bg-white border-3 border-black p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-neo-blue border-3 border-black flex items-center justify-center">
                      <User size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">
                        {result.data.student.nama}
                      </h3>
                      <p className="text-gray-600">
                        NIS: {result.data.student.nis}
                      </p>
                      <p className="text-gray-600">
                        Kelas: {result.data.student.kelas}
                      </p>
                      <p className="text-gray-600">
                        Lembaga: {result.data.student.lembaga}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t-3 border-black">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Jam Masuk</span>
                        <p className="font-bold text-lg">
                          {result.data.attendance.check_in}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Status</span>
                        <p className={`font-bold text-lg ${
                          result.data.attendance.status === 'hadir'
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {result.data.attendance.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result.success && result.data.teacher && (
                <div className="bg-white border-3 border-black p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-neo-pink border-3 border-black flex items-center justify-center">
                      <User size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">
                        {result.data.teacher.nama}
                      </h3>
                      <p className="text-gray-600">
                        NIP: {result.data.teacher.nip || '-'}
                      </p>
                      <p className="text-gray-600">
                        Mata Pelajaran: {result.data.teacher.mata_pelajaran || '-'}
                      </p>
                      <p className="text-gray-600">
                        Lembaga: {result.data.teacher.lembaga}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t-3 border-black">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">
                          {result.data.attendance.check_out ? 'Check Out' : 'Check In'}
                        </span>
                        <p className="font-bold text-lg">
                          {result.data.attendance.check_out || result.data.attendance.check_in}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Status</span>
                        <p className={`font-bold text-lg ${
                          result.data.attendance.status === 'hadir'
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {result.data.attendance.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleNewScan} className="w-full btn-primary">
              Scan Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
