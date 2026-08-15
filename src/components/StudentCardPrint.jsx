import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";

export default function StudentCardPrint({ student, onClose }) {
  const cardRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (student?.uuid) {
      QRCode.toDataURL(student.uuid, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrDataUrl);
    }
  }, [student?.uuid]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const cardHTML = cardRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu Pelajar - ${student.nama}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f3f4f6;
              padding: 20px;
            }
            .card-container {
              width: 340px;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .card-header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              padding: 20px;
              text-align: center;
              color: white;
            }
            .school-logo {
              width: 60px;
              height: 60px;
              margin: 0 auto 10px;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .school-logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .school-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .school-subtitle {
              font-size: 11px;
              opacity: 0.9;
            }
            .card-body {
              padding: 24px 20px;
            }
            .student-photo-container {
              width: 120px;
              height: 140px;
              margin: 0 auto 20px;
              border-radius: 8px;
              overflow: hidden;
              border: 3px solid #10b981;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .student-photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .no-photo {
              font-size: 48px;
              color: #9ca3af;
            }
            .student-info {
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              color: #6b7280;
              width: 100px;
              flex-shrink: 0;
            }
            .info-value {
              font-size: 12px;
              font-weight: 600;
              color: #111827;
              flex: 1;
            }
            .qr-section {
              text-align: center;
              padding-top: 16px;
              border-top: 2px dashed #e5e7eb;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              margin: 0 auto 8px;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 8px;
              background: white;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
            }
            .qr-label {
              font-size: 10px;
              color: #6b7280;
              font-weight: 500;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .card-container {
                box-shadow: none;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${cardHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for images and QR to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Kartu Pelajar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div ref={cardRef}>
          <div className="card-container">
            <div className="card-header">
              <div className="school-logo">
                <img src="/logo.jpg" alt="Logo" />
              </div>
              <div className="school-name">RAUDHATUL YATAMA</div>
              <div className="school-subtitle">
                {student.lembaga === "MA" ? "MADRASAH ALIYAH" : "MADRASAH TSANAWIYAH"}
              </div>
            </div>

            <div className="card-body">
              <div className="student-photo-container">
                {student.foto ? (
                  <img
                    src={student.foto}
                    alt={student.nama}
                    className="student-photo"
                  />
                ) : (
                  <span className="material-symbols-outlined no-photo">
                    person
                  </span>
                )}
              </div>

              <div className="student-info">
                <div className="info-row">
                  <div className="info-label">Nama</div>
                  <div className="info-value">{student.nama}</div>
                </div>
                {student.nisn && (
                  <div className="info-row">
                    <div className="info-label">NISN</div>
                    <div className="info-value">{student.nisn}</div>
                  </div>
                )}
                {student.kelas && (
                  <div className="info-row">
                    <div className="info-label">Kelas</div>
                    <div className="info-value">Kelas {student.kelas}</div>
                  </div>
                )}
                <div className="info-row">
                  <div className="info-label">Jenis Kelamin</div>
                  <div className="info-value">
                    {student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </div>
                </div>
                {student.tempat_lahir && student.tanggal_lahir && (
                  <div className="info-row">
                    <div className="info-label">TTL</div>
                    <div className="info-value">
                      {student.tempat_lahir},{" "}
                      {new Date(student.tanggal_lahir).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="qr-section">
                <div className="qr-code">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR Code" />}
                </div>
                <div className="qr-label">Scan untuk absensi</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-6 bg-primary-green text-gray-900 font-bold rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">print</span>
            <span>Cetak Kartu</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
