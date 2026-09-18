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
  const [downloadProgress, setDownloadProgress] = useState("");
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024 ? 1.05 : (window.innerWidth >= 640 ? 1.0 : 0.9);
    }
    return 1.0;
  });
  const [noGap, setNoGap] = useState(false);
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

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      })
    );
  };

  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    setDownloadProgress("Menyiapkan aset gambar kartu...");
    try {
      const wrappers = cardRef.current.querySelectorAll(".id-card-wrapper");
      if (wrappers.length === 0) return;

      const captureWrapper = async (wrapper) => {
        await waitForImages(wrapper);
        return toPng(wrapper, {
          pixelRatio: 2.5,
          backgroundColor: "#ffffff",
          skipFonts: false,
          cacheBust: false,
        });
      };

      if (wrappers.length === 1) {
        setDownloadProgress("Merender kartu...");
        const dataUrl = await captureWrapper(wrappers[0]);
        const link = document.createElement("a");
        const safeName = (students[0]?.nama || "siswa").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
        link.download = `kartu-${safeName}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");
        const zip = new JSZip();

        for (let i = 0; i < wrappers.length; i++) {
          const student = students[i];
          setDownloadProgress(`Merender kartu ${i + 1}/${wrappers.length}: ${student.nama}...`);
          const dataUrl = await captureWrapper(wrappers[i]);
          const imgData = dataUrl.split("base64,")[1];
          const safeName = (student.nama || `siswa-${i + 1}`).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
          zip.file(`kartu-${safeName}-${student.nisn || student.id}.png`, imgData, { base64: true });
        }

        setDownloadProgress(`Mengompresi ${wrappers.length} kartu ke file ZIP...`);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `kartu_identitas_${students.length}_siswa.zip`);
      }
    } catch (error) {
      console.error("Gagal mendownload PNG/ZIP:", error);
      alert("Gagal mendownload kartu. Pastikan aset gambar termuat sempurna.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadProgress("Menyiapkan file PDF ukuran kartu (CR80: 54x85.6mm)...");
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [54, 85.6],
      });

      const wrappers = cardRef.current.querySelectorAll(".id-card-wrapper");
      if (wrappers.length === 0) return;

      let pageCount = 0;
      for (let i = 0; i < wrappers.length; i++) {
        const student = students[i];
        setDownloadProgress(`Memproses PDF ${i + 1}/${wrappers.length}: ${student.nama}...`);

        const cards = wrappers[i].querySelectorAll(".id-card");
        if (cards.length >= 2) {
          // 1. Kartu Depan
          await waitForImages(cards[0]);
          const frontDataUrl = await toPng(cards[0], {
            pixelRatio: 2.5,
            backgroundColor: "#ffffff",
            skipFonts: false,
            cacheBust: false,
          });
          if (pageCount > 0) pdf.addPage([54, 85.6], "portrait");
          pdf.addImage(frontDataUrl, "PNG", 0, 0, 54, 85.6);
          pageCount++;

          // 2. Kartu Belakang
          await waitForImages(cards[1]);
          const backDataUrl = await toPng(cards[1], {
            pixelRatio: 2.5,
            backgroundColor: "#ffffff",
            skipFonts: false,
            cacheBust: false,
          });
          pdf.addPage([54, 85.6], "portrait");
          pdf.addImage(backDataUrl, "PNG", 0, 0, 54, 85.6);
          pageCount++;
        }
      }

      setDownloadProgress("Menyimpan dokumen PDF...");
      const filename = wrappers.length === 1
        ? `kartu-${(students[0]?.nama || "siswa").replace(/\s+/g, "-")}-cr80.pdf`
        : `kartu_siswa_cr80_${students.length}_data.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Gagal membuat PDF kartu:", error);
      alert("Gagal membuat PDF kartu. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
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
    if (url.startsWith("data:")) return url;
    if (url.startsWith("http")) return url;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.raudhatulyatama.sch.id/api/v1";
    const baseUrl = apiBase.replace(/\/api(\/v1)?$/, "");
    let cleanPath = url.startsWith("/") ? url : `/${url}`;
    if (!cleanPath.startsWith("/storage/")) {
      cleanPath = `/storage${cleanPath}`;
    }
    return `${baseUrl}${cleanPath}`;
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
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-gray-100 border border-gray-300 rounded-xl px-2 py-1 gap-1 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
              className="p-1 hover:bg-gray-200 rounded text-gray-700 font-bold cursor-pointer"
              title="Perkecil"
            >
              -
            </button>
            <span className="font-mono text-[11px] font-bold px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 10) / 10))}
              className="p-1 hover:bg-gray-200 rounded text-gray-700 font-bold cursor-pointer"
              title="Perbesar"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="ml-1 text-[10px] text-blue-600 hover:underline cursor-pointer font-bold"
              title="Reset Zoom ke 100%"
            >
              100%
            </button>
          </div>

          {/* Download PNG / ZIP */}
          <button
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="py-2 px-3 sm:px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={students.length > 1 ? "Unduh seluruh kartu dalam file ZIP" : "Unduh kartu format PNG"}
          >
            <span className="material-symbols-outlined text-base">
              {isDownloading ? "hourglass_empty" : "folder_zip"}
            </span>
            <span>{students.length > 1 ? "Unduh ZIP (PNG)" : "Unduh PNG"}</span>
          </button>

          {/* Download PDF (Ukuran Kartu CR80) */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="py-2 px-3 sm:px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Unduh file PDF dengan ukuran standar kartu ID (CR80: 54x85.6mm)"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>Unduh PDF (Kartu)</span>
          </button>

          {/* Print Card */}
          <button
            onClick={handlePrint}
            disabled={isDownloading}
            className="py-2 px-3.5 sm:px-4 bg-primary-green hover:bg-lime-400 text-gray-900 text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Buka dialog cetak printer ukuran kartu"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Cetak Kartu</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="py-2 px-3 font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors text-xs border border-gray-300 cursor-pointer flex items-center justify-center gap-1"
            title="Tutup Pratinjau (Esc)"
          >
            <span className="material-symbols-outlined text-base">close</span>
            <span className="hidden sm:inline">Tutup</span>
          </button>
        </div>
      </div>

      {/* Progress Notification Banner */}
      {isDownloading && (
        <div className="bg-amber-100 border-b-2 border-amber-400 px-4 py-2 flex items-center justify-center gap-2 text-xs font-black text-amber-900 animate-pulse">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          <span>{downloadProgress || "Sedang memproses unduhan kartu..."}</span>
        </div>
      )}

      {/* Main Preview Container - Use justify-start with scroll padding so top header is never clipped */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 md:p-8 bg-slate-200/90 flex flex-col items-center justify-start min-h-0">
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
            gap: 20px;
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
            width: 100px;
            height: 122px;
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
            padding: 0 14px 8px 14px;
            display: flex;
            flex-direction: column;
            gap: 1.5px;
          }
          .info-dashed-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
            padding: 2px 0;
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

          /* PRINT MEDIA OPTIMIZATION: CR80 EXACT CARD SIZE (54mm x 85.6mm) */
          @media print {
            @page {
              size: 54mm 85.6mm;
              margin: 0;
            }
            html, body {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 54mm !important;
            }
            .print-container {
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 54mm !important;
            }
            .id-card-wrapper {
              display: block !important;
              gap: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .id-card {
              width: 54mm !important;
              height: 85.6mm !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 3.5mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        <div
          ref={cardRef}
          className="flex flex-wrap justify-center items-start gap-6 sm:gap-8 p-4 pt-6 pb-24 w-full max-w-full"
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
                        {/* Row 2 Siswa: NISN */}
                        <div className="info-dashed-row">
                          <span className="label-typewriter">NISN</span>
                          <span className="value-text font-mono font-bold">{person.nisn || person.nis || "-"}</span>
                        </div>
                        {/* Row 3 Siswa: Kelas (Langsung X, XI, XII tanpa kata 'Kelas') */}
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
