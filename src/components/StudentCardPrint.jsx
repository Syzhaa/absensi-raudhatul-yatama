import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchApiLogo = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.raudhatulyatama.sch.id/api/v1";
        const res = await fetch(`${apiBase}/logo`, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.url && isMounted) {
            setLogoUrl(json.data.url);
          }
        }
      } catch (err) {
        console.warn("Logo API fallback to /logo.png:", err);
      }
    };
    fetchApiLogo();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Generate QR code for each person
  useEffect(() => {
    if (!students || students.length === 0) return;

    const generateQR = async (id, uuid) => {
      if (!uuid || qrCodes[id]) return;
      try {
        const qr = await QRCode.toDataURL(uuid, {
          width: 320,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrCodes((prev) => ({ ...prev, [id]: qr }));
      } catch (err) {
        console.error("Failed generating QR for", id, err);
      }
    };

    students.forEach((person) => {
      if (person.id && person.uuid) {
        generateQR(person.id, person.uuid);
      }
    });
  }, [students, qrCodes]);

  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    try {
      const wrappers = cardRef.current.querySelectorAll(".id-card-wrapper");
      if (wrappers.length === 0) return;

      const captureWrapper = async (wrapper) => {
        return toPng(wrapper, {
          pixelRatio: 3,
          backgroundColor: "#ffffff",
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
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");
        const zip = new JSZip();

        for (let i = 0; i < wrappers.length; i++) {
          const student = students[i];
          const dataUrl = await captureWrapper(wrappers[i]);
          const imgData = dataUrl.split("base64,")[1];
          zip.file(`kartu-${student.nama.replace(/\s+/g, "-")}.png`, imgData, { base64: true });
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "kartu_identitas_batch.zip");
      }
    } catch (error) {
      console.error("Gagal mendownload PNG:", error);
      alert("Gagal mendownload PNG. Pastikan gambar dapat diakses.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const cardHTML = cardRef.current.innerHTML;
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
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  const getLembagaName = (code) => {
    const c = (code || "").trim().toUpperCase();
    if (c === "MA") return "MADRASAH ALIYAH";
    if (c === "MTS") return "MADRASAH TSANAWIYAH";
    if (c === "YAYASAN") return "RAUDHATUL YATAMA";
    return code || "MADRASAH ALIYAH";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getPhotoUrl = (url) => {
    if (!url || url === "storage/" || url === "/storage/") return null;
    let fullUrl = url;
    if (!url.startsWith("http")) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.raudhatulyatama.sch.id/api/v1";
      const baseUrl = apiBase.replace(/\/api(\/v1)?$/, "");
      let cleanPath = url.startsWith("/") ? url : `/${url}`;
      if (!cleanPath.startsWith("/storage/")) {
        cleanPath = `/storage${cleanPath}`;
      }
      fullUrl = `${baseUrl}${cleanPath}`;
    }
    const encodedUrl = encodeURIComponent(fullUrl);
    const cacheBuster = `&cb=${Date.now()}`;
    return `https://wsrv.nl/?url=${encodedUrl}${cacheBuster}`;
  };

  const getFallbackAvatar = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="200" height="200"><rect width="100%" height="100%" fill="#e2e8f0"/><path fill="#94a3b8" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col z-[100] overflow-hidden animate-fade-in">
      {/* Top Action Header */}
      <div className="bg-white border-b-2 border-gray-900 shadow-md p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 z-10 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
              Preview Kartu {type === "teacher" ? "Guru & Pendidik" : "Pelajar & Santri"}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {students.length} Kartu siap cetak atau unduh format PNG
            </p>
          </div>
          <button
            onClick={onClose}
            className="sm:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="flex-1 sm:flex-initial py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-lg active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {isDownloading ? "hourglass_empty" : "download"}
            </span>
            <span>{isDownloading ? "Memproses..." : "Unduh PNG"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial py-2 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 text-xs sm:text-sm font-black rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-lg active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Cetak Kartu</span>
          </button>
          <button
            onClick={onClose}
            className="hidden sm:inline-flex px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-xs sm:text-sm border border-gray-300 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-200 flex flex-col items-center">
        <style id="id-card-styles">{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f1f5f9;
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
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            page-break-inside: avoid;
            flex-shrink: 0;
          }
          @media (min-width: 640px) {
            .id-card-wrapper {
              flex-direction: row;
              align-items: flex-start;
              gap: 16px;
            }
          }

          /* CR80 Card Dimensions (Standard ID Card) */
          .id-card {
            width: 216px;
            height: 342px;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
            border: 1.5px solid #cbd5e1;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* HEADER ZONE: Navy Blue Bar with Circular Emblem */
          .card-header-nct {
            background: #0f1c3f;
            color: #ffffff;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 52px;
            border-bottom: 2px solid #1e293b;
          }
          .card-header-nct .logo-emblem {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .card-header-nct .logo-emblem img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          .card-header-nct .title-box {
            flex: 1;
            min-width: 0;
            text-align: left;
          }
          .card-header-nct .title-institution {
            font-size: 8px;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .card-header-nct .title-main {
            font-size: 10.5px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.2;
            font-family: Georgia, serif, 'Times New Roman';
          }
          .card-header-nct .title-location {
            font-size: 6.5px;
            font-weight: 600;
            color: #cbd5e1;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            line-height: 1.1;
          }

          /* MIDDLE ZONE: Vertical Typography on Left + Portrait Photo on Right */
          .card-middle-nct {
            padding: 10px 12px 6px 12px;
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            gap: 10px;
            flex: 1;
          }
          .vertical-ribbon {
            width: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1.5px solid #e2e8f0;
            padding-right: 4px;
          }
          .vertical-text {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-family: 'Courier New', Courier, monospace;
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #475569;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .photo-container-nct {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .photo-box-nct {
            width: 105px;
            height: 130px;
            border-radius: 8px;
            border: 1.5px solid #0f1c3f;
            background: #f8fafc;
            overflow: hidden;
            box-shadow: 0 3px 8px rgba(15, 28, 63, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .photo-box-nct img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 20%;
            display: block;
          }

          /* BOTTOM ZONE: Personal Info with Dashed Line Separators */
          .card-info-nct {
            padding: 0 14px 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .info-dashed-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 6px;
            padding: 3px 0;
            border-bottom: 1px dashed #cbd5e1;
          }
          .info-dashed-row:last-child {
            border-bottom: none;
          }
          .label-typewriter {
            font-family: 'Courier New', Courier, monospace;
            font-size: 7px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            flex-shrink: 0;
          }
          .value-navy {
            font-size: 8px;
            font-weight: 800;
            color: #0f1c3f;
            text-align: right;
            word-break: break-word;
            line-height: 1.2;
            max-width: 130px;
          }
          .value-navy.value-name {
            font-size: 8.5px;
            font-weight: 900;
            text-transform: uppercase;
          }

          /* BACK SIDE: Matching Navy Accent + Big Crisp QR */
          .back-header-nct {
            background: #0f1c3f;
            color: #ffffff;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Georgia, serif, 'Times New Roman';
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            min-height: 38px;
            border-bottom: 2px solid #1e293b;
          }
          .back-body-nct {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 12px;
          }
          .back-qr-box {
            width: 120px;
            height: 120px;
            background: #ffffff;
            border: 2px solid #0f1c3f;
            border-radius: 10px;
            padding: 6px;
            box-shadow: 0 4px 10px rgba(15, 28, 63, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .back-qr-box img {
            width: 100%;
            height: 100%;
            display: block;
          }
          .back-qr-label {
            margin-top: 6px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 7px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .back-rules-nct {
            background: #f8fafc;
            border-top: 1px dashed #cbd5e1;
            padding: 8px 12px;
            font-size: 6px;
            line-height: 1.35;
            color: #475569;
          }
          .back-rules-nct strong {
            display: block;
            font-family: 'Courier New', Courier, monospace;
            font-size: 6.5px;
            color: #0f1c3f;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .back-rules-nct ol {
            padding-left: 12px;
          }

          /* PRINT MEDIA OPTIMIZATION */
          @media print {
            body {
              background: #ffffff;
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
              height: 85.6mm !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              page-break-after: always;
              page-break-inside: avoid;
              border-radius: 4mm !important;
              margin: 0;
            }
            @page {
              margin: 0;
              size: 54mm 85.6mm;
            }
          }
        `}</style>

        <div ref={cardRef} className="flex flex-wrap justify-center gap-6 sm:gap-8">
          {students.map((person) => {
            const isTeacher = type === "teacher" || person.nip !== undefined;
            const ttl = [person.tempat_lahir, formatDate(person.tanggal_lahir)]
              .filter(Boolean)
              .join(", ");

            const formattedKelas = person.kelas
              ? person.kelas.toString().toLowerCase().startsWith("kelas")
                ? person.kelas
                : `Kelas ${person.kelas}`
              : "-";

            return (
              <div
                key={person.id}
                data-id={person.id}
                data-uuid={person.uuid}
                className="student-card-print id-card-wrapper"
              >
                {/* FRONT SIDE (DESAIN NCT 127 STYLE) */}
                <div className="id-card">
                  {/* 1. Header Zone: Navy Block with Circular Logo */}
                  <div className="card-header-nct">
                    <div className="logo-emblem">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.removeAttribute("crossOrigin");
                          e.target.src = "/logo.png";
                        }}
                      />
                    </div>
                    <div className="title-box">
                      <div className="title-institution">{getLembagaName(person.lembaga)}</div>
                      <div className="title-main">RAUDHATUL YATAMA</div>
                      <div className="title-location">KABUPATEN BANJAR</div>
                    </div>
                  </div>

                  {/* 2. Middle Zone: Vertical Text Ribbon & Portrait Photo */}
                  <div className="card-middle-nct">
                    <div className="vertical-ribbon">
                      <div className="vertical-text">
                        {isTeacher ? "TEACHER IDENTITY CARD" : "STUDENT IDENTITY CARD"}
                      </div>
                    </div>
                    <div className="photo-container-nct">
                      <div className="photo-box-nct">
                        {person.foto ? (
                          <img
                            src={getPhotoUrl(person.foto)}
                            alt={person.nama}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.removeAttribute("crossOrigin");
                              e.target.src = getFallbackAvatar();
                            }}
                          />
                        ) : (
                          <img src={getFallbackAvatar()} alt={person.nama} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Bottom Zone: Fields with Dashed Separators */}
                  <div className="card-info-nct">
                    {/* Row 1: Nama */}
                    <div className="info-dashed-row">
                      <span className="label-typewriter">NAMA</span>
                      <span className="value-navy value-name">{person.nama || "-"}</span>
                    </div>

                    {isTeacher ? (
                      <>
                        {/* Row 2 Guru: NPK / NIP */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">NPK / NIP</span>
                          <span className="value-navy font-mono">{person.nip || "-"}</span>
                        </div>
                        {/* Row 3 Guru: Mapel */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">MAPEL</span>
                          <span className="value-navy">{person.mata_pelajaran || "Umum"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Row 2 Siswa: Kelas */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">KELAS</span>
                          <span className="value-navy">{formattedKelas}</span>
                        </div>
                        {/* Row 3 Siswa: TTL */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">TTL</span>
                          <span className="value-navy">{ttl || "-"}</span>
                        </div>
                        {/* Row 4 Siswa: Alamat */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">ALAMAT</span>
                          <span className="value-navy">{person.alamat || "-"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* BACK SIDE (SISI BELAKANG: QR PRESENSI DIGITAL) */}
                <div className="id-card">
                  <div className="back-header-nct">
                    KARTU PRESENSI DIGITAL {isTeacher ? "GURU" : "SANTRI"}
                  </div>

                  <div className="back-body-nct">
                    <div className="back-qr-box">
                      {qrCodes[person.id] ? (
                        <img src={qrCodes[person.id]} alt="QR Presensi" />
                      ) : (
                        <div className="text-[10px] text-gray-400 font-mono">Membuat QR...</div>
                      )}
                    </div>
                    <div className="back-qr-label">SCAN UNTUK PRESENSI</div>
                  </div>

                  <div className="back-rules-nct">
                    <strong>Ketentuan Kartu:</strong>
                    <ol>
                      <li>Kartu identitas resmi Raudhatul Yatama.</li>
                      <li>Wajib dibawa untuk presensi kehadiran digital.</li>
                      <li>Jika kartu hilang, segera lapor ke bagian administrasi.</li>
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
