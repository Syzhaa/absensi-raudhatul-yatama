import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024 ? 1.4 : (window.innerWidth >= 640 ? 1.15 : 0.95);
    }
    return 1.35;
  });
  const [noGap, setNoGap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFitScreen = () => {
    if (typeof window === "undefined") return;
    const availH = window.innerHeight - 120;
    const fitScale = Math.min(1.85, Math.max(0.75, availH / 360));
    setZoom(Math.round(fitScale * 20) / 20);
  };

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

  const modalContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 p-0 bg-slate-900/90 backdrop-blur-sm flex flex-col z-[9999] overflow-hidden"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        zIndex: 9999,
      }}
    >
      {/* Top Action Header */}
      <div className="bg-white border-b-2 border-gray-900 shadow-sm p-2.5 sm:p-3.5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5 z-10 shrink-0 m-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
              Preview Kartu {type === "teacher" ? "Guru & Pendidik" : "Pelajar & Santri"}
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              {students.length} Kartu siap cetak atau unduh format PNG
            </p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-end">
          {/* Celah Toggle (No-Gap) */}
          <button
            type="button"
            onClick={() => setNoGap(!noGap)}
            className={`px-2.5 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              noGap
                ? "bg-emerald-100 text-emerald-950 border-emerald-600 shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-900"
            }`}
            title="Ubah celah pemisah antara kartu depan & belakang"
          >
            <span className={`material-symbols-outlined text-sm ${noGap ? "text-emerald-700" : "text-gray-600"}`}>
              {noGap ? "splitscreen" : "space_bar"}
            </span>
            <span>{noGap ? "Tanpa Celah (0mm - Lipat)" : "Berjarak (16px - Pisah)"}</span>
          </button>

          {/* Zoom Toolbar */}
          <div className="flex items-center bg-gray-100 border-2 border-gray-900 rounded-xl p-0.5 gap-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}
              className="px-2 py-1 hover:bg-gray-200 rounded-lg text-xs font-black text-gray-800 transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              -
            </button>
            <span className="px-1.5 text-[11px] font-mono font-black text-gray-900 min-w-[42px] text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10))}
              className="px-2 py-1 hover:bg-gray-200 rounded-lg text-xs font-black text-gray-800 transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleFitScreen}
              className="px-2 py-1 bg-white hover:bg-emerald-50 border border-gray-400 rounded-lg text-[10px] font-black text-emerald-800 transition-colors cursor-pointer"
              title="Sesuaikan ke Ukuran Layar Penuh"
            >
              Fit
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border-2 border-gray-900 rounded-xl shadow-xs transition-all cursor-pointer hidden sm:flex items-center justify-center"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Full Screen)"}
          >
            <span className="material-symbols-outlined text-base">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            title="Unduh file gambar PNG beresolusi tinggi"
          >
            <span className="material-symbols-outlined text-base">
              {isDownloading ? "hourglass_empty" : "download"}
            </span>
            <span className="hidden sm:inline">{isDownloading ? "Memproses..." : "Unduh PNG"}</span>
            <span className="sm:hidden">PNG</span>
          </button>

          {/* Print Card */}
          <button
            onClick={handlePrint}
            className="py-1.5 px-3.5 bg-primary-green hover:bg-lime-400 text-gray-900 text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Buka dialog cetak printer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Cetak Kartu</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="hidden md:inline-flex px-3 py-1.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-xs border border-gray-300 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center justify-center min-h-0">
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
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 24px;
            page-break-inside: avoid;
            flex-shrink: 0;
            transition: gap 0.2s ease;
          }
          .id-card-wrapper.no-gap {
            gap: 0px !important;
          }
          .id-card-wrapper.no-gap .id-card:first-child {
            border-top-right-radius: 0px !important;
            border-bottom-right-radius: 0px !important;
            border-right: 1.5px dashed #475569 !important;
          }
          .id-card-wrapper.no-gap .id-card:last-child {
            border-top-left-radius: 0px !important;
            border-bottom-left-radius: 0px !important;
            border-left: none !important;
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

          /* HEADER ZONE: Dark Green Bar with School Logo */
          .card-header-nct {
            background: #064e3b;
            color: #ffffff;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 52px;
            border-bottom: 2px solid #022c22;
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
            color: #a7f3d0;
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
            color: #6ee7b7;
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
            color: #064e3b;
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
            border: 1.5px solid #064e3b;
            background: #f8fafc;
            overflow: hidden;
            box-shadow: 0 3px 8px rgba(6, 78, 59, 0.15);
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
            padding: 0 14px 11px 14px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .info-dashed-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
            padding: 2.5px 0;
            border-bottom: 0.8px dashed #cbd5e1;
          }
          .info-dashed-row:last-child {
            border-bottom: none;
          }
          .label-typewriter {
            font-family: 'Courier New', Courier, monospace;
            font-size: 6.8px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            flex-shrink: 0;
            line-height: 1.25;
            padding-top: 0.5px;
          }
          .value-text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 7.2px;
            font-weight: 600;
            color: #000000;
            text-align: right;
            word-break: break-word;
            line-height: 1.25;
            max-width: 138px;
          }
          .value-text.value-name {
            font-size: 7.8px;
            font-weight: 800;
            letter-spacing: 0.2px;
            text-transform: uppercase;
            color: #000000;
          }
          .value-text.value-class {
            font-size: 7.5px;
            font-weight: 800;
            color: #000000;
          }
          .value-text.value-address {
            font-size: 6.4px;
            font-weight: 600;
            line-height: 1.25;
            color: #111827;
            letter-spacing: 0.1px;
          }

          /* BACK SIDE: Matching Dark Green Accent + Big Crisp QR */
          .back-header-nct {
            background: #064e3b;
            color: #ffffff;
            padding: 9px 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: Georgia, serif, 'Times New Roman';
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            min-height: 42px;
            border-bottom: 2px solid #022c22;
            width: 100%;
            box-sizing: border-box;
          }
          .back-body-nct {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
          }
          .back-qr-box {
            width: 118px;
            height: 118px;
            background: #ffffff;
            border: 2px solid #064e3b;
            border-radius: 10px;
            padding: 6px;
            box-shadow: 0 4px 10px rgba(6, 78, 59, 0.12);
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
            color: #064e3b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .back-rules-nct {
            background: #f8fafc;
            border-top: 1px dashed #94a3b8;
            padding: 8px 12px;
            font-size: 6.5px;
            line-height: 1.4;
            color: #334155;
            box-sizing: border-box;
          }
          .rules-header {
            font-family: 'Courier New', Courier, monospace;
            font-size: 7px;
            font-weight: 900;
            color: #064e3b;
            margin-bottom: 3px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            text-align: center;
          }
          .rules-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .rules-item {
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }
          .rules-num {
            font-weight: 800;
            color: #064e3b;
            flex-shrink: 0;
          }

          /* PRINT MEDIA OPTIMIZATION */
          @media print {
            @page {
              margin: 8mm;
              size: auto;
            }
            body {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-container {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
              gap: 8mm !important;
              padding: 0 !important;
              margin: 0 auto !important;
            }
            .id-card-wrapper {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 6mm !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 8mm !important;
            }
            .id-card-wrapper.no-gap {
              gap: 0mm !important;
            }
            .id-card {
              width: 54mm !important;
              height: 85.6mm !important;
              box-shadow: none !important;
              border: 1px solid #94a3b8 !important;
              border-radius: 3.5mm !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
            }
            .id-card-wrapper.no-gap .id-card:first-child {
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
              border-right: 1px dashed #475569 !important;
            }
            .id-card-wrapper.no-gap .id-card:last-child {
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;
              border-left: none !important;
            }
          }
        `}</style>

        <div
          ref={cardRef}
          className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 my-auto p-2 sm:p-4"
          style={{
            zoom: zoom,
          }}
        >
          {students.map((person) => {
            const isTeacher = type === "teacher" || person.nip !== undefined;

            // Format Kelas: Directly show "X", "XI", "XII", "VII", etc. without "Kelas" prefix
            const cleanKelas = person.kelas
              ? String(person.kelas)
                  .replace(/^kelas\s*/i, "")
                  .trim() || "-"
              : "-";

            // Format TTL: Place of birth in Title Case + formatted date
            const toTitleCase = (str) => {
              if (!str) return "";
              return str
                .toLowerCase()
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
            };

            const ttl = [toTitleCase(person.tempat_lahir), formatDate(person.tanggal_lahir)]
              .filter(Boolean)
              .join(", ");

            // Clean address string from duplicate whitespaces/newlines and fix missing spaces after dots/commas
            const cleanAlamat = (person.alamat || "-")
              .replace(/\.([a-zA-Z])/g, ". $1")
              .replace(/,([a-zA-Z])/g, ", $1")
              .replace(/\s+/g, " ")
              .trim();

            return (
              <div
                key={person.id}
                data-id={person.id}
                data-uuid={person.uuid}
                className={`student-card-print id-card-wrapper ${noGap ? "no-gap" : ""}`}
              >
                {/* FRONT SIDE (DESAIN PREPPY ACADEMY STYLE) */}
                <div className="id-card">
                  {/* 1. Header Zone: Dark Green Bar with Clean School Logo */}
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
                      <span className="value-text value-name">{person.nama || "-"}</span>
                    </div>

                    {isTeacher ? (
                      <>
                        {/* Row 2 Guru: NPK / NIP */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">NPK / NIP</span>
                          <span className="value-text font-mono font-bold">{person.nip || "-"}</span>
                        </div>
                        {/* Row 3 Guru: Mapel */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">MAPEL</span>
                          <span className="value-text font-semibold">{person.mata_pelajaran || "Umum"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Row 2 Siswa: Kelas (Langsung X, XI, XII tanpa kata 'Kelas') */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">KELAS</span>
                          <span className="value-text value-class">{cleanKelas}</span>
                        </div>
                        {/* Row 3 Siswa: TTL */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">TTL</span>
                          <span className="value-text">{ttl || "-"}</span>
                        </div>
                        {/* Row 4 Siswa: Alamat */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">ALAMAT</span>
                          <span className="value-text value-address">{cleanAlamat}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* BACK SIDE (SISI BELAKANG: QR PRESENSI DIGITAL) */}
                <div className="id-card">
                  <div className="back-header-nct">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
                      <div>KARTU PRESENSI DIGITAL</div>
                      <div style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "1.2px", opacity: 0.95, marginTop: "1px" }}>
                        {isTeacher ? "DEWAN GURU" : "SANTRI"}
                      </div>
                    </div>
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
                    <div className="rules-header">KETENTUAN KARTU</div>
                    <div className="rules-list">
                      <div className="rules-item">
                        <span className="rules-num">1.</span>
                        <span>Kartu identitas resmi Raudhatul Yatama.</span>
                      </div>
                      <div className="rules-item">
                        <span className="rules-num">2.</span>
                        <span>Wajib dibawa untuk presensi kehadiran digital.</span>
                      </div>
                      <div className="rules-item">
                        <span className="rules-num">3.</span>
                        <span>Jika kartu hilang, segera lapor ke bagian administrasi.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
