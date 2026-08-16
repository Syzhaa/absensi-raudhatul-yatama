import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});

  useEffect(() => {
    // Prevent body scrolling when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const generateQRs = async () => {
      const newQrCodes = {};
      for (const student of students) {
        if (student?.uuid) {
          try {
            newQrCodes[student.id] = await QRCode.toDataURL(student.uuid, {
              width: 300,
              margin: 1,
              color: { dark: "#000000", light: "#ffffff" },
            });
          } catch (error) {
            console.error("Failed to generate QR for", student.id, error);
          }
        }
      }
      setQrCodes(newQrCodes);
    };

    if (students.length > 0) {
      generateQRs();
    }
  }, [students]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    try {
      const wrappers = cardRef.current.querySelectorAll('.id-card-wrapper');
      if (wrappers.length === 0) return;

      // html-to-image uses browser's own rendering engine (SVG foreignObject)
      // sehingga hasil PNG 100% identik dengan tampilan preview
      const captureWrapper = async (wrapper) => {
        return toPng(wrapper, {
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          skipFonts: false,
          cacheBust: true,
        });
      };

      if (wrappers.length === 1) {
        const dataUrl = await captureWrapper(wrappers[0]);
        const link = document.createElement("a");
        link.download = `kartu-${students[0].nama.replace(/\s+/g, "-")}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const JSZip = (await import('jszip')).default;
        const { saveAs } = await import('file-saver');
        const zip = new JSZip();

        for (let i = 0; i < wrappers.length; i++) {
          const student = students[i];
          const dataUrl = await captureWrapper(wrappers[i]);
          const imgData = dataUrl.split("base64,")[1];
          zip.file(`kartu-${student.nama.replace(/\s+/g, "-")}.png`, imgData, { base64: true });
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "kartu_pelajar_batch.zip");
      }
    } catch (error) {
      console.error("Gagal mendownload PNG:", error);
      alert("Gagal mendownload PNG. Pastikan gambar (foto/logo) dapat diakses.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const cardHTML = cardRef.current.innerHTML;
    // We get the styles from the style tag we'll inject in the component
    const styles = document.getElementById("id-card-styles").innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu - ${students.length} Data</title>
          <style>
            ${styles}
          </style>
        </head>
        <body>
          <div class="print-container">
            ${cardHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for images and QR to load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  const getLembagaName = (code) => {
    if (code === "MA") return "MADRASAH ALIYAH";
    if (code === "MTs") return "MADRASAH TSANAWIYAH";
    if (code === "Yayasan") return "YAYASAN RAUDHATUL YATAMA";
    return code;
  };

  const calculateValidUntil = (kelas) => {
    const currentYear = new Date().getFullYear();
    // Simplified logic: If they are class 10/7 it's +3 years, 11/8 +2, 12/9 +1.
    // If not standard, fallback to "Selama Menjadi Siswa"
    const k = parseInt(kelas);
    if ([7, 10].includes(k)) return currentYear + 3;
    if ([8, 11].includes(k)) return currentYear + 2;
    if ([9, 12].includes(k)) return currentYear + 1;
    return "Selama Menjadi Siswa";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPhotoUrl = (url) => {
    if (!url) return null;
    let fullUrl = url;
    if (!url.startsWith("http")) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "https://apima.sylink.my.id/api/v1";
      const baseUrl = apiBase.replace(/\/api(\/v1)?$/, "");
      fullUrl = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    }
    // We use wsrv.nl proxy because it reliably returns CORS headers for html2canvas
    const encodedUrl = encodeURIComponent(fullUrl);
    const cacheBuster = `&cb=${Date.now()}`;
    return `https://wsrv.nl/?url=${encodedUrl}${cacheBuster}`;
  };

  const getFallbackAvatar = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="200" height="200"><rect width="100%" height="100%" fill="#e5e7eb"/><path fill="#9ca3af" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-[100] overflow-hidden">
      {/* Responsive Header */}
      <div className="bg-white border-b-2 border-gray-900 shadow-md p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 z-10 relative shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">Preview Cetak Kartu</h2>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold">{students.length} Kartu siap dicetak</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="sm:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 flex items-center justify-center"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="flex-1 sm:flex-initial py-2 px-3 sm:px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">{isDownloading ? 'hourglass_empty' : 'image'}</span>
            <span>{isDownloading ? 'Memproses...' : 'Unduh PNG'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial py-2 px-3 sm:px-5 bg-primary-green hover:bg-emerald-400 text-gray-900 text-xs sm:text-sm font-bold rounded-lg shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 border-2 border-gray-900"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">print</span>
            <span>Cetak Kartu</span>
          </button>
          <button
            onClick={onClose}
            className="hidden sm:inline-flex px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Tutup
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-6 md:p-8 bg-gray-200 flex flex-col items-center">
        <style id="id-card-styles">{`
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: #f3f4f6;
              padding: 20px;
            }
            .print-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              justify-content: center;
              max-width: 100%;
            }
            .id-card-wrapper {
              display: flex;
              gap: 12px;
              margin-bottom: 20px;
              page-break-inside: avoid;
              flex-shrink: 0;
            }
            .id-card {
              width: 204px;
              height: 325px;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              border: 1px solid #e5e7eb;
              position: relative;
              display: flex;
              flex-direction: column;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* FRONT SIDE */
            .card-header {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              color: white;
              padding: 5px 6px;
              display: flex;
              align-items: center;
              border-bottom-left-radius: 8px;
              border-bottom-right-radius: 8px;
              min-height: 58px;
              box-sizing: border-box;
            }
            .card-header .logo {
              width: 40px;
              height: 40px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-left: 16px;
              margin-right: 5px;
            }
            .card-header .logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
            .card-header .title-group {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-width: 0;
              padding-left: 2px;
              padding-right: 16px;
            }
            .card-header h1 {
              font-size: 10px;
              font-weight: 900;
              margin: 0;
              text-transform: uppercase;
              line-height: 1.15;
            }
            .card-header h2 {
              font-size: 8px;
              font-weight: 800;
              margin: 1px 0 0 0;
              line-height: 1.15;
            }
            .card-header h3 {
              font-size: 6.5px;
              font-weight: 600;
              margin: 1px 0 0 0;
              line-height: 1.1;
              opacity: 0.95;
            }

            .card-body {
              padding: 6px 10px 8px;
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-around;
              position: relative;
            }
            .card-body::before {
              content: '';
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 145px; height: 145px;
              background-image: url('/logo.jpg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.06;
              z-index: 1;
              pointer-events: none;
            }
            .student-role {
              font-size: 10.5px;
              color: #059669;
              font-weight: 900;
              margin: 1px auto 5px;
              text-transform: uppercase;
              z-index: 10;
              text-align: center;
              width: 100%;
              line-height: 1.2;
            }
            .photo-frame {
              width: 87px;
              height: 110px;
              border: 2px solid #059669;
              border-radius: 4px;
              background: #f9fafb;
              z-index: 10;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0 auto 5px;
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            
            .student-name {
              font-size: 12.5px;
              font-weight: 900;
              color: #111827;
              margin: 0 auto;
              text-align: center;
              line-height: 1.2;
              width: 100%;
              z-index: 10;
              display: block;
            }

            .info-grid {
              width: 100%;
              display: grid;
              grid-template-columns: 30px 4px 1fr;
              gap: 3.5px 0;
              font-size: 8.5px;
              line-height: 1.3;
              margin-top: 7px;
              margin-bottom: 2px;
              padding-left: 4px;
              z-index: 10;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
            }
            .info-colon {
              text-align: center;
              color: #374151;
              font-weight: bold;
            }
            .info-value {
              color: #111827;
              font-weight: 600;
            }
            .card-footer-front {
              background: #059669;
              color: white;
              font-size: 8px;
              width: 100%;
              font-weight: bold;
              padding: 4.5px 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10;
              margin: 0;
            }

            /* BACK SIDE */
            .back-side {
              background: #f9fafb;
              justify-content: space-between;
              position: relative;
            }
            .back-side::before {
              content: '';
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 160px; height: 160px;
              background-image: url('/logo.jpg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.05;
              z-index: 1;
              pointer-events: none;
            }
            .back-header {
              background: #059669;
              color: white;
              font-size: 8.5px;
              font-weight: 900;
              padding: 5px 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2;
              width: 100%;
              margin: 0;
            }
            .qr-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 2;
              padding: 4px 0;
            }
            .qr-box {
              width: 106px;
              height: 106px;
              background: white;
              padding: 6px;
              border-radius: 4px;
              border: 1.5px solid #10b981;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
              display: block;
            }
            .qr-text {
              margin-top: 4px;
              font-size: 7.5px;
              font-weight: bold;
              color: #374151;
              text-align: center;
            }
            .rules {
              font-size: 6px;
              padding: 6px 8px;
              z-index: 2;
              background: rgba(255,255,255,0.9);
              line-height: 1.35;
              color: #374151;
            }
            .rules ol {
              padding-left: 12px;
              margin-top: 2px;
              color: #374151;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }
              .print-container {
                display: block;
                gap: 0;
              }
              .id-card-wrapper {
                display: block;
                margin: 0;
                padding: 0;
              }
              .id-card {
                width: 54mm !important;
                height: 86mm !important;
                box-shadow: none;
                border: none;
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0;
              }
              @page {
                margin: 0;
                size: 54mm 86mm;
              }
            }
        `}</style>
        <div ref={cardRef} className="flex flex-wrap justify-center gap-6">
          {students.map((person) => {
            const isTeacher = type === "teacher" || person.nip !== undefined;
            const ttl = [person.tempat_lahir, formatDate(person.tanggal_lahir)]
              .filter(Boolean)
              .join(", ");
            const rawValidUntil = isTeacher ? "Selama Menjadi Guru" : calculateValidUntil(person.kelas);
            const validUntil = typeof rawValidUntil === "number"
              ? `${new Date().getFullYear()} - ${rawValidUntil}`
              : rawValidUntil;

            return (
              <div key={person.id} className="id-card-wrapper">
                {/* FRONT SIDE */}
                <div className="id-card">
                  <div className="card-header">
                    <div className="logo">
                      <img src="/logo.jpg" alt="Logo" />
                    </div>
                    <div className="title-group">
                      <h1>{getLembagaName(person.lembaga)}</h1>
                      <h2>RAUDHATUL YATAMA</h2>
                      <h3>KABUPATEN BANJAR</h3>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="student-role">
                      {isTeacher ? "GURU / PENDIDIK" : "KARTU PELAJAR"}
                    </div>

                    <div className="photo-frame">
                      {person.foto ? (
                        <img
                          src={getPhotoUrl(person.foto)}
                          alt={person.nama}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.removeAttribute('crossOrigin');
                            e.target.src = getFallbackAvatar();
                          }}
                        />
                      ) : (
                        <img
                          src={getFallbackAvatar()}
                          alt={person.nama}
                        />
                      )}
                    </div>

                    <div className="student-name">{person.nama}</div>

                    <div className="info-grid">
                      {isTeacher ? (
                        <>
                          <div className="info-label">NIP</div><div className="info-colon">:</div>
                          <div className="info-value">{person.nip || "-"}</div>
                          <div className="info-label">Mapel</div><div className="info-colon">:</div>
                          <div className="info-value">{person.mata_pelajaran || "Umum"}</div>
                        </>
                      ) : (
                        <>
                          <div className="info-label">NISN</div><div className="info-colon">:</div>
                          <div className="info-value">{person.nisn || "-"}</div>
                        </>
                      )}

                      <div className="info-label">TTL</div><div className="info-colon">:</div>
                      <div className="info-value" style={{ whiteSpace: "normal" }}>{ttl || "-"}</div>

                      <div className="info-label">Alamat</div><div className="info-colon">:</div>
                      <div className="info-value" style={{ whiteSpace: "normal" }}>
                        {person.alamat || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="card-footer-front">
                    Berlaku: {validUntil}
                  </div>
                </div>

                {/* BACK SIDE */}
                <div className="id-card back-side">
                  <div className="back-header">
                    KARTU {isTeacher ? "GURU" : "PELAJAR"} & ABSENSI
                  </div>

                  <div className="qr-container">
                    <div className="qr-box">
                      {qrCodes[person.id] && <img src={qrCodes[person.id]} alt="QR" />}
                    </div>
                    <div className="qr-text">Scan Untuk Presensi</div>
                  </div>

                  <div className="rules">
                    <strong>Ketentuan:</strong>
                    <ol>
                      <li>Kartu ini wajib dibawa setiap hari ke sekolah.</li>
                      <li>Digunakan untuk presensi kehadiran secara digital.</li>
                      <li>Apabila hilang, harap segera melapor ke Tata Usaha.</li>
                    </ol>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
