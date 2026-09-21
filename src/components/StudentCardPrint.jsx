import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

// Preset Ukuran ID Card Lengkap (CR80, Seri A: A1-A3, Seri B: B1-B4)
export const CARD_SIZES = [
  {
    id: "cr80",
    name: "Standar CR80 / PVC",
    code: "CR80",
    group: "Standar",
    dims: "54 × 85.6 mm",
    desc: "Standar KTP, ATM, Kartu Pelajar PVC",
    widthMm: 54,
    heightMm: 85.6,
    widthPx: 216,
    heightPx: 342,
    isLandscape: false,
  },
  {
    id: "a1",
    name: "Holder Mika A1",
    code: "A1",
    group: "Seri A (Mika Tegak)",
    dims: "54 × 85 mm",
    desc: "Standar Mika A1 Tegak (Ukuran Pas KTP)",
    widthMm: 54,
    heightMm: 85,
    widthPx: 216,
    heightPx: 340,
    isLandscape: false,
  },
  {
    id: "a2",
    name: "Holder Mika A2",
    code: "A2",
    group: "Seri A (Mika Tegak)",
    dims: "70 × 100 mm",
    desc: "Standar Mika A2 Tegak (Ukuran Sedang)",
    widthMm: 70,
    heightMm: 100,
    widthPx: 280,
    heightPx: 400,
    isLandscape: false,
  },
  {
    id: "a3",
    name: "Holder Mika A3",
    code: "A3",
    group: "Seri A (Mika Tegak)",
    dims: "80 × 105 mm",
    desc: "Standar Mika A3 Tegak (Ukuran Besar)",
    widthMm: 80,
    heightMm: 105,
    widthPx: 320,
    heightPx: 420,
    isLandscape: false,
  },
  {
    id: "b1",
    name: "Holder Mika B1",
    code: "B1",
    group: "Seri B (Mika ID Card)",
    dims: "85 × 54 mm",
    desc: "Standar Mika B1 Landscape / Mendatar",
    widthMm: 85,
    heightMm: 54,
    widthPx: 340,
    heightPx: 216,
    isLandscape: true,
  },
  {
    id: "b2",
    name: "Holder Mika B2",
    code: "B2",
    group: "Seri B (Mika ID Card)",
    dims: "70 × 105 mm",
    desc: "Standar Mika B2 Tegak (Casing Tali Gantung)",
    widthMm: 70,
    heightMm: 105,
    widthPx: 280,
    heightPx: 420,
    isLandscape: false,
  },
  {
    id: "b3",
    name: "Holder Mika B3",
    code: "B3",
    group: "Seri B (Mika ID Card)",
    dims: "85 × 110 mm",
    desc: "Standar Mika B3 Panitia / Peserta",
    widthMm: 85,
    heightMm: 110,
    widthPx: 340,
    heightPx: 440,
    isLandscape: false,
  },
  {
    id: "b4",
    name: "Holder Mika B4",
    code: "B4",
    group: "Seri B (Mika ID Card)",
    dims: "95 × 135 mm",
    desc: "Standar Mika B4 Ekstra Besar",
    widthMm: 95,
    heightMm: 135,
    widthPx: 380,
    heightPx: 540,
    isLandscape: false,
  },
];

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  // State Pengaturan Cetak
  const [viewMode, setViewMode] = useState("a4"); // "a4" | "single"
  const [cardSizeId, setCardSizeId] = useState("cr80"); // "cr80", "a1", "a2", "a3", "b1", "b2", "b3", "b4"
  const [a4SideMode, setA4SideMode] = useState("pairs"); // "pairs" (depan-belakang lipat), "front" (depan saja), "back" (belakang saja)
  const [showCutMarks, setShowCutMarks] = useState(true);

  const currentSize = useMemo(() => {
    return CARD_SIZES.find((s) => s.id === cardSizeId) || CARD_SIZES[0];
  }, [cardSizeId]);

  // Skala ukuran font & elemen di dalam kartu
  const cardScale = useMemo(() => {
    if (currentSize.isLandscape) {
      return Math.min(1.2, currentSize.heightMm / 54);
    }
    return Math.max(1.0, Math.min(1.45, currentSize.widthMm / 54));
  }, [currentSize]);

  // Hitung otomatis susunan grid A4 terbaik (Landscape vs Portrait, Kolom × Baris)
  const a4LayoutConfig = useMemo(() => {
    // Area cetak A4 (210 × 297 mm) dengan margin aman 10mm:
    // Portrait: 190 mm width, 277 mm height
    // Landscape: 277 mm width, 190 mm height
    const isPairs = a4SideMode === "pairs";

    if (currentSize.isLandscape) {
      // B1 Landscape (85 × 54 mm)
      if (isPairs) {
        // Sepasang diletakkan berdampingan: 170 mm lebar × 54 mm tinggi
        // A4 Portrait muat 1 kolom × 4 baris = 4 pasang
        return {
          orientation: "portrait",
          cols: 1,
          rows: 4,
          capacity: 4,
          label: "A4 Portrait: 4 Pasang (8 Kartu / Lembar)",
        };
      } else {
        // Satuan: 85 mm lebar × 54 mm tinggi -> A4 Portrait muat 2 kolom × 4 baris = 8 kartu
        return {
          orientation: "portrait",
          cols: 2,
          rows: 4,
          capacity: 8,
          label: "A4 Portrait: 8 Kartu (2 Kolom × 4 Baris)",
        };
      }
    }

    // Untuk kartu vertikal (CR80, A1, A2, A3, B2, B3, B4):
    const w = currentSize.widthMm;
    const h = currentSize.heightMm;

    if (isPairs) {
      const pairW = w * 2;
      const pairH = h;

      // Cek kapasitas di Landscape (277 × 190)
      const colsL = Math.floor(277 / pairW);
      const rowsL = Math.floor(190 / pairH);
      const capL = colsL * rowsL;

      // Cek kapasitas di Portrait (190 × 277)
      const colsP = Math.floor(190 / pairW);
      const rowsP = Math.floor(277 / pairH);
      const capP = colsP * rowsP;

      if (capL >= capP && capL > 0) {
        return {
          orientation: "landscape",
          cols: Math.max(1, colsL),
          rows: Math.max(1, rowsL),
          capacity: capL,
          label: `A4 Landscape: ${capL} Pasang (${capL * 2} Kartu / Lembar)`,
        };
      } else {
        return {
          orientation: "portrait",
          cols: Math.max(1, colsP),
          rows: Math.max(1, rowsP),
          capacity: Math.max(1, capP),
          label: `A4 Portrait: ${Math.max(1, capP)} Pasang (${Math.max(1, capP) * 2} Kartu / Lembar)`,
        };
      }
    } else {
      // Satuan (Depan Saja / Belakang Saja)
      const colsP = Math.floor(190 / w);
      const rowsP = Math.floor(277 / h);
      const capP = colsP * rowsP;

      const colsL = Math.floor(277 / w);
      const rowsL = Math.floor(190 / h);
      const capL = colsL * rowsL;

      if (capP >= capL && capP > 0) {
        return {
          orientation: "portrait",
          cols: Math.max(1, colsP),
          rows: Math.max(1, rowsP),
          capacity: capP,
          label: `A4 Portrait: ${capP} Kartu (${colsP} Kolom × ${rowsP} Baris)`,
        };
      } else {
        return {
          orientation: "landscape",
          cols: Math.max(1, colsL),
          rows: Math.max(1, rowsL),
          capacity: Math.max(1, capL),
          label: `A4 Landscape: ${Math.max(1, capL)} Kartu (${colsL} Kolom × ${rowsL} Baris)`,
        };
      }
    }
  }, [currentSize, a4SideMode]);

  // Pembagian data siswa per lembar kertas A4
  const a4Pages = useMemo(() => {
    if (viewMode !== "a4") return [];
    const perPage = a4LayoutConfig.capacity || 4;
    const pages = [];
    for (let i = 0; i < students.length; i += perPage) {
      pages.push(students.slice(i, i + perPage));
    }
    return pages;
  }, [students, viewMode, a4LayoutConfig]);

  // Responsive default zoom
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1280 ? 0.85 : window.innerWidth >= 1024 ? 0.75 : 0.65;
    }
    return 0.8;
  });

  // Shortcut Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Fetch Logo
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
        console.warn("Logo fallback to /logo.png", err);
      }
    };
    fetchApiLogo();
    return () => {
      isMounted = false;
    };
  }, []);

  // Generate QR Codes
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

  // Handler: Unduh PNG / ZIP
  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    setDownloadProgress("Menyiapkan berkas gambar...");
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
        link.download = `kartu-${currentSize.code.toLowerCase()}-${safeName}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");
        const zip = new JSZip();

        for (let i = 0; i < wrappers.length; i++) {
          const student = students[i];
          setDownloadProgress(`Merender kartu ${i + 1}/${wrappers.length}: ${student?.nama || "Siswa"}...`);
          const dataUrl = await captureWrapper(wrappers[i]);
          const imgData = dataUrl.split("base64,")[1];
          const safeName = (student?.nama || `siswa-${i + 1}`).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
          zip.file(`kartu-${currentSize.code.toLowerCase()}-${safeName}-${student?.nisn || student?.id || i}.png`, imgData, { base64: true });
        }

        setDownloadProgress(`Mengompresi ${wrappers.length} kartu ke file ZIP...`);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `kartu_${type}_${currentSize.code}_${students.length}_data.zip`);
      }
    } catch (error) {
      console.error("Gagal mendownload PNG/ZIP:", error);
      alert("Gagal mendownload kartu. Pastikan aset gambar termuat sempurna.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  // Handler: Unduh PDF (Lembar A4 atau Kartu Satuan)
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      if (viewMode === "a4") {
        const isLandscape = a4LayoutConfig.orientation === "landscape";
        setDownloadProgress(`Menyiapkan PDF Lembar A4 (${currentSize.name})...`);
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
        });

        const sheets = cardRef.current.querySelectorAll(".a4-sheet");
        if (sheets.length === 0) return;

        for (let i = 0; i < sheets.length; i++) {
          setDownloadProgress(`Memproses Lembar A4 ${i + 1}/${sheets.length}...`);
          await waitForImages(sheets[i]);
          const sheetDataUrl = await toPng(sheets[i], {
            pixelRatio: 2.0,
            backgroundColor: "#ffffff",
            skipFonts: false,
            cacheBust: false,
          });

          if (i > 0) {
            pdf.addPage("a4", isLandscape ? "landscape" : "portrait");
          }
          const pageW = isLandscape ? 297 : 210;
          const pageH = isLandscape ? 210 : 297;
          pdf.addImage(sheetDataUrl, "PNG", 0, 0, pageW, pageH);
        }

        setDownloadProgress("Menyimpan file PDF A4...");
        const filename = `kartu_${type}_a4_${currentSize.code.toLowerCase()}_${students.length}_data.pdf`;
        pdf.save(filename);
      } else {
        // Mode Kartu Satuan
        setDownloadProgress(`Menyiapkan PDF Satuan (${currentSize.name})...`);
        const pdf = new jsPDF({
          orientation: currentSize.isLandscape ? "landscape" : "portrait",
          unit: "mm",
          format: currentSize.isLandscape
            ? [currentSize.heightMm, currentSize.widthMm]
            : [currentSize.widthMm, currentSize.heightMm],
        });

        const wrappers = cardRef.current.querySelectorAll(".id-card-wrapper");
        if (wrappers.length === 0) return;

        let pageCount = 0;
        for (let i = 0; i < wrappers.length; i++) {
          const student = students[i];
          setDownloadProgress(`Memproses PDF ${i + 1}/${wrappers.length}: ${student?.nama || "Siswa"}...`);

          const cards = wrappers[i].querySelectorAll(".id-card");
          if (cards.length >= 2) {
            // Sisi Depan
            await waitForImages(cards[0]);
            const frontDataUrl = await toPng(cards[0], {
              pixelRatio: 2.5,
              backgroundColor: "#ffffff",
              skipFonts: false,
              cacheBust: false,
            });
            if (pageCount > 0) {
              pdf.addPage(
                [currentSize.widthMm, currentSize.heightMm],
                currentSize.isLandscape ? "landscape" : "portrait"
              );
            }
            pdf.addImage(frontDataUrl, "PNG", 0, 0, currentSize.widthMm, currentSize.heightMm);
            pageCount++;

            // Sisi Belakang
            await waitForImages(cards[1]);
            const backDataUrl = await toPng(cards[1], {
              pixelRatio: 2.5,
              backgroundColor: "#ffffff",
              skipFonts: false,
              cacheBust: false,
            });
            pdf.addPage(
              [currentSize.widthMm, currentSize.heightMm],
              currentSize.isLandscape ? "landscape" : "portrait"
            );
            pdf.addImage(backDataUrl, "PNG", 0, 0, currentSize.widthMm, currentSize.heightMm);
            pageCount++;
          }
        }

        setDownloadProgress("Menyimpan dokumen PDF...");
        const filename = `kartu_${type}_satuan_${currentSize.code.toLowerCase()}_${students.length}_data.pdf`;
        pdf.save(filename);
      }
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  // Handler: Cetak Langsung (Print Dialog)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const cardHTML = cardRef.current.innerHTML;
    const styles = document.getElementById("id-card-styles").innerHTML;
    const isA4 = viewMode === "a4";
    const isLandscape = isA4 && a4LayoutConfig.orientation === "landscape";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu - ${students.length} Data (${isA4 ? `Lembar A4 ${currentSize.code}` : `Kartu Satuan ${currentSize.code}`})</title>
          <style>
            ${styles}
            @media print {
              @page {
                size: ${isA4 ? (isLandscape ? "A4 landscape" : "A4 portrait") : `${currentSize.widthMm}mm ${currentSize.heightMm}mm`};
                margin: 0;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              .a4-page-badge {
                display: none !important;
              }
              .a4-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                page-break-after: always !important;
                break-after: page !important;
                width: ${isA4 ? (isLandscape ? "297mm" : "210mm") : `${currentSize.widthMm}mm`} !important;
                height: ${isA4 ? (isLandscape ? "210mm" : "297mm") : `${currentSize.heightMm}mm`} !important;
                min-width: ${isA4 ? (isLandscape ? "297mm" : "210mm") : `${currentSize.widthMm}mm`} !important;
                min-height: ${isA4 ? (isLandscape ? "210mm" : "297mm") : `${currentSize.heightMm}mm`} !important;
                padding: ${isA4 ? "8mm" : "0"} !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="${isA4 ? "print-a4-container" : "print-container"}">
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

  // Render Kartu Sisi Depan (Mendukung Format Portrait & Format Landscape B1)
  const renderFrontCard = (person) => {
    const isTeacher = type === "teacher" || person.nip !== undefined;
    const cleanKelas = person.kelas
      ? String(person.kelas).replace(/^kelas\s*/i, "").trim() || "-"
      : "-";

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

    const cleanAlamat = (person.alamat || "-")
      .replace(/\.([a-zA-Z])/g, ". $1")
      .replace(/,([a-zA-Z])/g, ", $1")
      .replace(/\s+/g, " ")
      .trim();

    if (currentSize.isLandscape) {
      // Layout Khusus Format B1 Landscape (85 × 54 mm)
      return (
        <div
          className="id-card id-card-horizontal"
          style={{
            width: `${currentSize.widthPx}px`,
            height: `${currentSize.heightPx}px`,
          }}
        >
          {/* Header Bar Mendatar */}
          <div className="card-header-nct" style={{ minHeight: "40px", padding: "6px 10px" }}>
            <div className="logo-emblem" style={{ width: "30px", height: "30px" }}>
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
              <div className="title-main" style={{ fontSize: "9.5px" }}>RAUDHATUL YATAMA</div>
            </div>
            <span className="text-[8px] font-mono font-black text-emerald-300 uppercase tracking-widest bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/50">
              {isTeacher ? "GURU" : "SANTRI"}
            </span>
          </div>

          {/* Body Mendatar: Foto di Kiri, Data di Kanan */}
          <div className="flex items-center gap-3 p-2.5 flex-1 min-h-0 bg-white">
            <div className="photo-box-nct shrink-0" style={{ width: "76px", height: "98px", borderRadius: "6px" }}>
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

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="info-dashed-row">
                <span className="label-typewriter">NAMA</span>
                <span className="value-text value-name truncate">{person.nama || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">{isTeacher ? "NPK/NIP" : "NISN"}</span>
                <span className="value-text font-mono font-bold">{isTeacher ? person.nip : (person.nisn || person.nis || "-")}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">{isTeacher ? "MAPEL" : "KELAS"}</span>
                <span className="value-text value-class">{isTeacher ? (person.mata_pelajaran || "Umum") : cleanKelas}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">ALAMAT</span>
                <span className="value-text value-address truncate">{cleanAlamat}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Layout Standar Format Portrait (CR80, A1, A2, A3, B2, B3, B4)
    const photoWidth = Math.round(100 * cardScale);
    const photoHeight = Math.round(122 * cardScale);

    return (
      <div
        className="id-card"
        style={{
          width: `${currentSize.widthPx}px`,
          height: `${currentSize.heightPx}px`,
        }}
      >
        {/* 1. Header Zone */}
        <div className="card-header-nct" style={{ minHeight: `${Math.round(52 * cardScale)}px`, padding: `${Math.round(8 * cardScale)}px ${Math.round(10 * cardScale)}px` }}>
          <div className="logo-emblem" style={{ width: `${Math.round(36 * cardScale)}px`, height: `${Math.round(36 * cardScale)}px` }}>
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
            <div className="title-institution" style={{ fontSize: `${8 * cardScale}px` }}>
              {getLembagaName(person.lembaga)}
            </div>
            <div className="title-main" style={{ fontSize: `${10.5 * cardScale}px` }}>
              RAUDHATUL YATAMA
            </div>
            <div className="title-location" style={{ fontSize: `${6.5 * cardScale}px` }}>
              KABUPATEN BANJAR
            </div>
          </div>
        </div>

        {/* 2. Middle Zone */}
        <div className="card-middle-nct" style={{ padding: `${Math.round(8 * cardScale)}px ${Math.round(12 * cardScale)}px` }}>
          <div className="vertical-ribbon" style={{ width: `${Math.round(22 * cardScale)}px` }}>
            <div className="vertical-text" style={{ fontSize: `${7.5 * cardScale}px` }}>
              {isTeacher ? "TEACHER IDENTITY CARD" : "STUDENT IDENTITY CARD"}
            </div>
          </div>
          <div className="photo-container-nct">
            <div className="photo-box-nct" style={{ width: `${photoWidth}px`, height: `${photoHeight}px` }}>
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

        {/* 3. Bottom Zone: Data Diri */}
        <div className="card-info-nct" style={{ padding: `0 ${Math.round(14 * cardScale)}px ${Math.round(8 * cardScale)}px` }}>
          <div className="info-dashed-row">
            <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>NAMA</span>
            <span className="value-text value-name" style={{ fontSize: `${7.8 * cardScale}px` }}>{person.nama || "-"}</span>
          </div>

          {isTeacher ? (
            <>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>NPK / NIP</span>
                <span className="value-text font-mono font-bold" style={{ fontSize: `${7.2 * cardScale}px` }}>{person.nip || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>MAPEL</span>
                <span className="value-text font-semibold" style={{ fontSize: `${7.2 * cardScale}px` }}>{person.mata_pelajaran || "Umum"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>NISN</span>
                <span className="value-text font-mono font-bold" style={{ fontSize: `${7.2 * cardScale}px` }}>{person.nisn || person.nis || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>KELAS</span>
                <span className="value-text value-class" style={{ fontSize: `${7.5 * cardScale}px` }}>{cleanKelas}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>TTL</span>
                <span className="value-text" style={{ fontSize: `${7.2 * cardScale}px` }}>{ttl || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>ALAMAT</span>
                <span className="value-text value-address" style={{ fontSize: `${6.4 * cardScale}px` }}>{cleanAlamat}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Kartu Sisi Belakang (QR Presensi Digital)
  const renderBackCard = (person) => {
    const isTeacher = type === "teacher" || person.nip !== undefined;
    const qrSize = currentSize.isLandscape ? 90 : Math.round(114 * cardScale);

    if (currentSize.isLandscape) {
      // Sisi Belakang B1 Landscape
      return (
        <div
          className="id-card id-card-horizontal"
          style={{
            width: `${currentSize.widthPx}px`,
            height: `${currentSize.heightPx}px`,
          }}
        >
          <div className="back-header-nct" style={{ minHeight: "36px", padding: "6px 10px", fontSize: "8.5px" }}>
            KARTU PRESENSI DIGITAL • {isTeacher ? "DEWAN GURU" : "SANTRI"}
          </div>
          <div className="flex items-center gap-3 p-2.5 flex-1 min-h-0 bg-white">
            <div className="flex flex-col items-center shrink-0">
              <div className="back-qr-box" style={{ width: `${qrSize}px`, height: `${qrSize}px`, padding: "4px" }}>
                {qrCodes[person.id] ? (
                  <img src={qrCodes[person.id]} alt="QR Presensi" />
                ) : (
                  <div className="text-[9px] text-gray-400 font-mono">Membuat QR...</div>
                )}
              </div>
              <div className="back-qr-label" style={{ fontSize: "6px", marginTop: "3px" }}>SCAN PRESENSI</div>
            </div>

            <div className="flex-1 text-[7px] text-slate-700 space-y-1">
              <div className="font-bold text-emerald-950 uppercase border-b border-emerald-200 pb-0.5">Ketentuan Kartu:</div>
              <div>1. Kartu resmi Yayasan Raudhatul Yatama.</div>
              <div>2. Wajib dibawa saat presensi digital sekolah.</div>
              <div>3. Jika hilang segera lapor ke admin sekolah.</div>
            </div>
          </div>
        </div>
      );
    }

    // Sisi Belakang Standar Portrait
    return (
      <div
        className="id-card"
        style={{
          width: `${currentSize.widthPx}px`,
          height: `${currentSize.heightPx}px`,
        }}
      >
        <div className="back-header-nct" style={{ minHeight: `${Math.round(42 * cardScale)}px`, fontSize: `${9 * cardScale}px` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <div>KARTU PRESENSI DIGITAL</div>
            <div style={{ fontSize: `${8 * cardScale}px`, fontWeight: 800, letterSpacing: "1.2px", opacity: 0.95, marginTop: "1px" }}>
              {isTeacher ? "DEWAN GURU" : "SANTRI"}
            </div>
          </div>
        </div>

        <div className="back-body-nct" style={{ padding: `${Math.round(8 * cardScale)}px` }}>
          <div className="back-qr-box" style={{ width: `${qrSize}px`, height: `${qrSize}px` }}>
            {qrCodes[person.id] ? (
              <img src={qrCodes[person.id]} alt="QR Presensi" />
            ) : (
              <div className="text-[10px] text-gray-400 font-mono">Membuat QR...</div>
            )}
          </div>
          <div className="back-qr-label" style={{ fontSize: `${7 * cardScale}px` }}>SCAN UNTUK PRESENSI</div>
        </div>

        <div className="back-rules-nct" style={{ padding: `${Math.round(8 * cardScale)}px ${Math.round(12 * cardScale)}px`, fontSize: `${6.5 * cardScale}px` }}>
          <div className="rules-header" style={{ fontSize: `${7 * cardScale}px` }}>KETENTUAN KARTU</div>
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
    );
  };

  const modalContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 p-0 bg-slate-900/90 backdrop-blur-sm flex flex-col z-[9999] overflow-hidden"
    >
      {/* Top Action Header */}
      <div className="bg-white border-b-2 border-gray-900 shadow-sm p-2.5 sm:p-3.5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 z-10 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-gray-900 leading-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">badge</span>
              <span>Cetak Kartu {type === "teacher" ? "Dewan Guru" : "Santri & Pelajar"}</span>
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              {students.length} Data • {viewMode === "a4" ? `Kertas A4 (${a4Pages.length} Lembar) • Ukuran: ${currentSize.code}` : `Kartu Satuan: ${currentSize.name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Toolbar Pengaturan Lengkap */}
        <div className="flex items-center gap-2 justify-start lg:justify-end flex-wrap">
          {/* 1. Mode Tampilan: Kertas A4 vs Kartu Satuan */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-300 text-xs font-bold">
            <button
              onClick={() => setViewMode("a4")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "a4"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-gray-700 hover:text-gray-900"
              }`}
              title="Cetak bersusun rapi di lembar kertas A4"
            >
              <span className="material-symbols-outlined text-sm">article</span>
              <span>Kertas A4</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "single"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-gray-700 hover:text-gray-900"
              }`}
              title="Cetak ukuran kartu satuan untuk printer PVC / lepas"
            >
              <span className="material-symbols-outlined text-sm">credit_card</span>
              <span>Satuan</span>
            </button>
          </div>

          {/* 2. Pemilih Lengkap Ukuran ID Card (A1-A3, B1-B4, CR80) */}
          <div className="flex items-center gap-1">
            <select
              value={cardSizeId}
              onChange={(e) => setCardSizeId(e.target.value)}
              className="px-3 py-1.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              title="Pilih ukuran ID card sesuai wadah/mika"
            >
              <optgroup label="Standar Internasional / PVC">
                <option value="cr80">CR80 (54 × 85.6 mm) - KTP/PVC</option>
              </optgroup>
              <optgroup label="Seri A (Plastik Holder Mika Tegak)">
                <option value="a1">A1 (54 × 85 mm) - Pas KTP</option>
                <option value="a2">A2 (70 × 100 mm) - Sedang</option>
                <option value="a3">A3 (80 × 105 mm) - Besar</option>
              </optgroup>
              <optgroup label="Seri B (Plastik Holder Mika ID Card)">
                <option value="b1">B1 (85 × 54 mm) - Landscape</option>
                <option value="b2">B2 (70 × 105 mm) - Casing Tali</option>
                <option value="b3">B3 (85 × 110 mm) - Panitia</option>
                <option value="b4">B4 (95 × 135 mm) - Ekstra Besar</option>
              </optgroup>
            </select>
          </div>

          {/* 3. Pilihan Sisi di A4: Berpasangan (Lipat) vs Depan Saja vs Belakang Saja */}
          {viewMode === "a4" && (
            <div className="flex items-center gap-1">
              <select
                value={a4SideMode}
                onChange={(e) => setA4SideMode(e.target.value)}
                className="px-2.5 py-1.5 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                title="Pilih sisi yang dicetak di lembar A4"
              >
                <option value="pairs">Depan & Belakang Berdampingan (Siap Lipat)</option>
                <option value="front">Hanya Sisi Depan (Grid)</option>
                <option value="back">Hanya Sisi Belakang (QR Grid)</option>
              </select>
            </div>
          )}

          {/* 4. Sakelar Garis Potong (Cut Guide Marks) */}
          {viewMode === "a4" && (
            <button
              type="button"
              onClick={() => setShowCutMarks((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showCutMarks
                  ? "bg-amber-50 border-amber-400 text-amber-900 font-black"
                  : "bg-gray-50 border-gray-300 text-gray-500"
              }`}
              title="Garis panduan potong gunting / cutter"
            >
              <span className="material-symbols-outlined text-sm">content_cut</span>
              <span>{showCutMarks ? "Garis Potong: ON" : "Garis Potong: OFF"}</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-gray-100 border border-gray-300 rounded-xl px-2 py-1 gap-1 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
              className="p-1 hover:bg-gray-200 rounded text-gray-700 font-bold cursor-pointer"
              title="Perkecil"
            >
              -
            </button>
            <span className="font-mono text-[11px] font-bold px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
              className="p-1 hover:bg-gray-200 rounded text-gray-700 font-bold cursor-pointer"
              title="Perbesar"
            >
              +
            </button>
            <button
              onClick={() => setZoom(viewMode === "a4" ? 0.8 : 1.0)}
              className="ml-1 text-[10px] text-blue-600 hover:underline cursor-pointer font-bold"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          {/* Tombol Unduh PNG/ZIP */}
          <button
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="py-1.5 sm:py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Unduh format gambar PNG"
          >
            <span className="material-symbols-outlined text-base">
              {isDownloading ? "hourglass_empty" : "folder_zip"}
            </span>
            <span>{students.length > 1 ? "Unduh ZIP" : "Unduh PNG"}</span>
          </button>

          {/* Tombol Unduh PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="py-1.5 sm:py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={viewMode === "a4" ? "Unduh file PDF Lembar A4 siap cetak" : "Unduh file PDF ukuran kartu satuan"}
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>{viewMode === "a4" ? "Unduh PDF (A4)" : "Unduh PDF"}</span>
          </button>

          {/* Tombol Cetak Langsung */}
          <button
            onClick={handlePrint}
            disabled={isDownloading}
            className="py-1.5 sm:py-2 px-3.5 bg-primary-green hover:bg-lime-400 text-gray-900 text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Buka dialog cetak printer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>{viewMode === "a4" ? "Cetak Kertas A4" : "Cetak Kartu"}</span>
          </button>

          {/* Tombol Tutup */}
          <button
            onClick={onClose}
            className="py-1.5 sm:py-2 px-3 font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors text-xs border border-gray-300 cursor-pointer flex items-center justify-center gap-1"
            title="Tutup (Esc)"
          >
            <span className="material-symbols-outlined text-base">close</span>
            <span className="hidden sm:inline">Tutup</span>
          </button>
        </div>
      </div>

      {/* Bar Info Ringkasan Ukuran & Lembar A4 */}
      {viewMode === "a4" && (
        <div className="bg-slate-800 text-slate-200 px-4 py-1.5 border-b border-slate-700 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <span className="material-symbols-outlined text-sm">straighten</span>
              <span>Ukuran: {currentSize.name} ({currentSize.dims})</span>
            </span>
            <span>&bull;</span>
            <span className="text-slate-300">{a4LayoutConfig.label}</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            Total: {a4Pages.length} Lembar A4 ({students.length} Siswa)
          </div>
        </div>
      )}

      {/* Progress Notification Banner */}
      {isDownloading && (
        <div className="bg-amber-100 border-b-2 border-amber-400 px-4 py-2 flex items-center justify-center gap-2 text-xs font-black text-amber-900 animate-pulse shrink-0">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          <span>{downloadProgress || "Sedang memproses unduhan kartu..."}</span>
        </div>
      )}

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 md:p-8 bg-slate-900 flex flex-col items-center justify-start min-h-0">
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
            margin-bottom: 20px;
            page-break-inside: avoid;
            flex-shrink: 0;
            position: relative;
          }
          .id-card-wrapper.paired-fold {
            gap: 0px !important;
            border-radius: 8px;
            overflow: hidden;
          }
          .id-card-wrapper.paired-fold .id-card:first-child {
            border-top-right-radius: 0px !important;
            border-bottom-right-radius: 0px !important;
            border-right: 1.5px dashed #475569 !important;
          }
          .id-card-wrapper.paired-fold .id-card:last-child {
            border-top-left-radius: 0px !important;
            border-bottom-left-radius: 0px !important;
            border-left: none !important;
          }

          /* Tampilan Lembar Kertas A4 */
          .a4-sheet {
            background: #ffffff;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .a4-landscape {
            width: 1188px;
            height: 840px;
            min-width: 1188px;
            min-height: 840px;
          }

          .a4-portrait {
            width: 840px;
            height: 1188px;
            min-width: 840px;
            min-height: 1188px;
          }

          /* Garis Potong (Cut Guide Marks) */
          .cut-guide-box {
            position: relative;
            padding: 4px;
            border: 1.2px dashed #94a3b8;
            border-radius: 10px;
            background: #f8fafc;
          }

          /* ID Card Base */
          .id-card {
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
            border: 1.5px solid #cbd5e1;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            box-sizing: border-box;
          }

          .id-card-horizontal {
            border-radius: 8px;
          }

          /* Header Zone */
          .card-header-nct {
            background: #064e3b;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #022c22;
          }
          .card-header-nct .logo-emblem {
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
            font-weight: 700;
            color: #a7f3d0;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .card-header-nct .title-main {
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.2;
            font-family: Georgia, serif, 'Times New Roman';
          }
          .card-header-nct .title-location {
            font-weight: 600;
            color: #6ee7b7;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            line-height: 1.1;
          }

          /* Middle Zone */
          .card-middle-nct {
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            gap: 10px;
            flex: 1;
          }
          .vertical-ribbon {
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

          /* Bottom Zone: Data Diri */
          .card-info-nct {
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
            font-weight: 600;
            color: #000000;
            text-align: right;
            word-break: break-word;
            line-height: 1.25;
          }
          .value-text.value-name {
            font-weight: 800;
            letter-spacing: 0.2px;
            text-transform: uppercase;
            color: #000000;
          }
          .value-text.value-class {
            font-weight: 800;
            color: #000000;
          }
          .value-text.value-address {
            font-weight: 600;
            line-height: 1.25;
            color: #111827;
            letter-spacing: 0.1px;
          }

          /* Back Side */
          .back-header-nct {
            background: #064e3b;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: Georgia, serif, 'Times New Roman';
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
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
          }
          .back-qr-box {
            background: #ffffff;
            border: 2px solid #064e3b;
            border-radius: 10px;
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
            font-family: 'Courier New', Courier, monospace;
            font-weight: 800;
            color: #064e3b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .back-rules-nct {
            background: #f8fafc;
            border-top: 1px dashed #94a3b8;
            line-height: 1.4;
            color: #334155;
            box-sizing: border-box;
          }
          .rules-header {
            font-family: 'Courier New', Courier, monospace;
            font-weight: 900;
            color: #064e3b;
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
        `}</style>

        <div
          ref={cardRef}
          className="flex flex-col items-center justify-start w-full transition-all pb-16"
          style={{
            zoom: zoom,
          }}
        >
          {viewMode === "a4" ? (
            // ==================== MODE A4 (BERJAJAR RAPI DI LEMBAR A4) ====================
            a4Pages.map((pageStudents, pageIdx) => {
              const isLandscape = a4LayoutConfig.orientation === "landscape";
              return (
                <div key={pageIdx} className="a4-sheet-wrapper mb-10 flex flex-col items-center">
                  {/* Badge Header Lembar A4 */}
                  <div className="a4-page-badge mb-2 flex items-center justify-between w-full max-w-[1188px] text-xs font-bold text-slate-300 px-2">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-400">description</span>
                      <span>Lembar A4 #{pageIdx + 1} dari {a4Pages.length}</span>
                    </span>
                    <span className="bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-300">
                      {pageStudents.length} Siswa ({currentSize.code} • {a4SideMode === "pairs" ? "Depan-Belakang" : a4SideMode === "front" ? "Depan" : "Belakang"})
                    </span>
                  </div>

                  {/* Lembar Fisik A4 */}
                  <div
                    className={`a4-sheet ${isLandscape ? "a4-landscape" : "a4-portrait"}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${a4LayoutConfig.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${a4LayoutConfig.rows}, 1fr)`,
                      gap: "18px",
                      padding: isLandscape ? "24px 36px" : "32px 24px",
                      justifyItems: "center",
                      alignItems: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    {pageStudents.map((person) => {
                      if (a4SideMode === "pairs") {
                        // Pasang Sisi Depan + Sisi Belakang Berdampingan
                        return (
                          <div
                            key={person.id}
                            className={`id-card-wrapper paired-fold ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {renderFrontCard(person)}
                            {renderBackCard(person)}
                          </div>
                        );
                      } else if (a4SideMode === "front") {
                        // Sisi Depan Saja
                        return (
                          <div
                            key={person.id}
                            className={`id-card-wrapper ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {renderFrontCard(person)}
                          </div>
                        );
                      } else {
                        // Sisi Belakang Saja (QR Presensi)
                        return (
                          <div
                            key={person.id}
                            className={`id-card-wrapper ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {renderBackCard(person)}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            // ==================== MODE KARTU SATUAN (SINGLE / LEPAS) ====================
            <div className="flex flex-wrap justify-center items-start gap-6 sm:gap-8 p-4 w-full max-w-full">
              {students.map((person) => (
                <div
                  key={person.id}
                  data-id={person.id}
                  data-uuid={person.uuid}
                  className="student-card-print id-card-wrapper"
                >
                  {renderFrontCard(person)}
                  {renderBackCard(person)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
