import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

// Preset Ukuran ID Card Lengkap Sesuai Standar Plastik/Mika Maxipro & CR80
export const CARD_SIZES = [
  {
    id: "cr80",
    name: "Standar CR80 (54 × 85.6 mm)",
    code: "CR80",
    group: "Standar PVC",
    dims: "54 × 85.6 mm",
    desc: "Standar KTP, ATM, Kartu Pelajar PVC",
    outerDims: "-",
    innerDims: "54 × 85.6 mm",
    widthMm: 54,
    heightMm: 85.6,
    widthPx: 216,
    heightPx: 342,
    isLandscape: false,
  },
  // Seri B (Portrait / Tegak)
  {
    id: "b1",
    name: "Holder B1 Portrait (55 × 85 mm)",
    code: "B1",
    group: "Seri B (Portrait / Tegak)",
    dims: "55 × 85 mm",
    desc: "Mika Tegak B1 (Luar 102×65 mm, Dalam 85×55 mm)",
    outerDims: "102 × 65 mm",
    innerDims: "85 × 55 mm",
    widthMm: 55,
    heightMm: 85,
    widthPx: 220,
    heightPx: 340,
    isLandscape: false,
  },
  {
    id: "b2",
    name: "Holder B2 Portrait (65 × 105 mm)",
    code: "B2",
    group: "Seri B (Portrait / Tegak)",
    dims: "65 × 105 mm",
    desc: "Mika Tegak B2 (Luar 126×79 mm, Dalam 105×65 mm)",
    outerDims: "126 × 79 mm",
    innerDims: "105 × 65 mm",
    widthMm: 65,
    heightMm: 105,
    widthPx: 260,
    heightPx: 420,
    isLandscape: false,
  },
  {
    id: "b3",
    name: "Holder B3 Portrait (80 × 105 mm)",
    code: "B3",
    group: "Seri B (Portrait / Tegak)",
    dims: "80 × 105 mm",
    desc: "Mika Tegak B3 (Luar 126×95 mm, Dalam 105×80 mm)",
    outerDims: "126 × 95 mm",
    innerDims: "105 × 80 mm",
    widthMm: 80,
    heightMm: 105,
    widthPx: 320,
    heightPx: 420,
    isLandscape: false,
  },
  {
    id: "b4",
    name: "Holder B4 Portrait (90 × 130 mm)",
    code: "B4",
    group: "Seri B (Portrait / Tegak)",
    dims: "90 × 130 mm",
    desc: "Mika Tegak B4 (Luar 155×106 mm, Dalam 130×90 mm)",
    outerDims: "155 × 106 mm",
    innerDims: "130 × 90 mm",
    widthMm: 90,
    heightMm: 130,
    widthPx: 360,
    heightPx: 520,
    isLandscape: false,
  },
  // Seri A (Landscape / Mendatar)
  {
    id: "a1",
    name: "Holder A1 Landscape (90 × 55 mm)",
    code: "A1",
    group: "Seri A (Landscape / Mendatar)",
    dims: "90 × 55 mm",
    desc: "Mika Mendatar A1 (Luar 68×99 mm, Dalam 55×90 mm)",
    outerDims: "68 × 99 mm",
    innerDims: "55 × 90 mm",
    widthMm: 90,
    heightMm: 55,
    widthPx: 360,
    heightPx: 220,
    isLandscape: true,
  },
  {
    id: "a2",
    name: "Holder A2 Landscape (95 × 65 mm)",
    code: "A2",
    group: "Seri A (Landscape / Mendatar)",
    dims: "95 × 65 mm",
    desc: "Mika Mendatar A2 (Luar 82×106 mm, Dalam 65×95 mm)",
    outerDims: "82 × 106 mm",
    innerDims: "65 × 95 mm",
    widthMm: 95,
    heightMm: 65,
    widthPx: 380,
    heightPx: 260,
    isLandscape: true,
  },
  {
    id: "a3",
    name: "Holder A3 Landscape (100 × 80 mm)",
    code: "A3",
    group: "Seri A (Landscape / Mendatar)",
    dims: "100 × 80 mm",
    desc: "Mika Mendatar A3 (Luar 92×115 mm, Dalam 80×100 mm)",
    outerDims: "92 × 115 mm",
    innerDims: "80 × 100 mm",
    widthMm: 100,
    heightMm: 80,
    widthPx: 400,
    heightPx: 320,
    isLandscape: true,
  },
];

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  // State Pengaturan Cetak (Minimalis)
  const [viewMode, setViewMode] = useState("a4"); // "a4" | "single"
  const [cardSizeId, setCardSizeId] = useState("cr80"); // "cr80", "a1", "a2", "a3", "b1", "b2", "b3", "b4"
  const [a4SideMode, setA4SideMode] = useState("pairs"); // "pairs" | "front" | "back"
  const [pairGapMode, setPairGapMode] = useState("gap"); // "gap" | "fold"
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Nilai gabungan untuk dropdown format agar header rapi minimalis
  const combinedLayoutValue = useMemo(() => {
    if (viewMode === "single") return "single";
    if (a4SideMode === "pairs") {
      return pairGapMode === "fold" ? "a4_pairs_fold" : "a4_pairs_gap";
    }
    return a4SideMode === "front" ? "a4_front" : "a4_back";
  }, [viewMode, a4SideMode, pairGapMode]);

  const handleCombinedLayoutChange = (val) => {
    if (val === "single") {
      setViewMode("single");
    } else if (val === "a4_pairs_gap") {
      setViewMode("a4");
      setA4SideMode("pairs");
      setPairGapMode("gap");
    } else if (val === "a4_pairs_fold") {
      setViewMode("a4");
      setA4SideMode("pairs");
      setPairGapMode("fold");
    } else if (val === "a4_front") {
      setViewMode("a4");
      setA4SideMode("front");
    } else if (val === "a4_back") {
      setViewMode("a4");
      setA4SideMode("back");
    }
  };

  const currentSize = useMemo(() => {
    return CARD_SIZES.find((s) => s.id === cardSizeId) || CARD_SIZES[0];
  }, [cardSizeId]);

  // Skala ukuran font & elemen di dalam kartu
  const cardScale = useMemo(() => {
    if (currentSize.isLandscape) {
      return Math.max(1.0, Math.min(1.35, currentSize.heightMm / 55));
    }
    return Math.max(1.0, Math.min(1.4, currentSize.widthMm / 54));
  }, [currentSize]);

  // Perhitungan layout grid A4 presisi: Memperhitungkan margin aman (10mm) dan jarak gap (4mm)
  // Menjamin TIDAK ADA kartu yang terpotong di tepi kanan maupun bawah!
  const a4LayoutConfig = useMemo(() => {
    const isPairs = a4SideMode === "pairs";
    const gapMm = 4;
    const safeW_P = 190;
    const safeH_P = 277;
    const safeW_L = 277;
    const safeH_L = 190;

    const w = currentSize.widthMm;
    const h = currentSize.heightMm;

    if (isPairs) {
      const innerGapMm = pairGapMode === "gap" ? 3 : 0;
      const pairW = (w * 2) + innerGapMm;
      const pairH = h;

      const colsL = Math.floor((safeW_L + gapMm) / (pairW + gapMm));
      const rowsL = Math.floor((safeH_L + gapMm) / (pairH + gapMm));
      const capL = colsL * rowsL;

      const colsP = Math.floor((safeW_P + gapMm) / (pairW + gapMm));
      const rowsP = Math.floor((safeH_P + gapMm) / (pairH + gapMm));
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
      // Mode Grid Satuan (Hanya Depan / Hanya Belakang)
      const colsP = Math.floor((safeW_P + gapMm) / (w + gapMm));
      const rowsP = Math.floor((safeH_P + gapMm) / (h + gapMm));
      const capP = colsP * rowsP;

      const colsL = Math.floor((safeW_L + gapMm) / (w + gapMm));
      const rowsL = Math.floor((safeH_L + gapMm) / (h + gapMm));
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
  }, [currentSize, a4SideMode, pairGapMode]);

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

  // Responsive zoom
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

  // Render Kartu Sisi Depan
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
      // Layout Format B1 Landscape (85 × 54 mm)
      return (
        <div
          className="id-card id-card-horizontal"
          style={{
            width: `${currentSize.widthPx}px`,
            height: `${currentSize.heightPx}px`,
          }}
        >
          {/* Header Bar Mendatar */}
          <div className="card-header-nct" style={{ minHeight: "38px", padding: "4px 8px" }}>
            <div className="logo-emblem" style={{ width: "28px", height: "28px" }}>
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
              <div className="title-institution" style={{ fontSize: "7.5px" }}>{getLembagaName(person.lembaga)}</div>
              <div className="title-main" style={{ fontSize: "9px" }}>RAUDHATUL YATAMA</div>
            </div>
            <span className="text-[7.5px] font-mono font-black text-emerald-300 uppercase tracking-wider bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/50">
              {isTeacher ? "GURU" : "SANTRI"}
            </span>
          </div>

          {/* Body Mendatar */}
          <div className="flex items-center gap-2.5 p-2 flex-1 min-h-0 bg-white overflow-hidden">
            <div className="photo-box-nct shrink-0" style={{ width: "72px", height: "92px", borderRadius: "6px" }}>
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

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: "6.5px" }}>NAMA</span>
                <span className="value-text value-name truncate" style={{ fontSize: "7.5px" }}>{person.nama || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: "6.5px" }}>{isTeacher ? "NPK/NIP" : "NISN"}</span>
                <span className="value-text font-mono font-bold" style={{ fontSize: "7px" }}>{isTeacher ? person.nip : (person.nisn || person.nis || "-")}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: "6.5px" }}>{isTeacher ? "MAPEL" : "KELAS"}</span>
                <span className="value-text value-class" style={{ fontSize: "7px" }}>{isTeacher ? (person.mata_pelajaran || "Umum") : cleanKelas}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter" style={{ fontSize: "6.5px" }}>ALAMAT</span>
                <span className="value-text value-address truncate" style={{ fontSize: "6.2px" }}>{cleanAlamat}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Layout Standar Format Portrait (CR80, A1, A2, A3, B2, B3, B4)
    const photoWidth = Math.round(96 * cardScale);
    const photoHeight = Math.round(118 * cardScale);

    return (
      <div
        className="id-card"
        style={{
          width: `${currentSize.widthPx}px`,
          height: `${currentSize.heightPx}px`,
          maxHeight: `${currentSize.heightPx}px`,
        }}
      >
        {/* 1. Header Zone */}
        <div className="card-header-nct" style={{ minHeight: `${Math.round(48 * cardScale)}px`, padding: `${Math.round(6 * cardScale)}px ${Math.round(9 * cardScale)}px` }}>
          <div className="logo-emblem" style={{ width: `${Math.round(34 * cardScale)}px`, height: `${Math.round(34 * cardScale)}px` }}>
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
            <div className="title-institution" style={{ fontSize: `${7.8 * cardScale}px` }}>
              {getLembagaName(person.lembaga)}
            </div>
            <div className="title-main" style={{ fontSize: `${10 * cardScale}px` }}>
              RAUDHATUL YATAMA
            </div>
            <div className="title-location" style={{ fontSize: `${6.2 * cardScale}px` }}>
              KABUPATEN BANJAR
            </div>
          </div>
        </div>

        {/* 2. Middle Zone */}
        <div className="card-middle-nct" style={{ padding: `${Math.round(6 * cardScale)}px ${Math.round(10 * cardScale)}px` }}>
          <div className="vertical-ribbon" style={{ width: `${Math.round(20 * cardScale)}px` }}>
            <div className="vertical-text" style={{ fontSize: `${7.2 * cardScale}px` }}>
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
        <div className="card-info-nct" style={{ padding: `0 ${Math.round(12 * cardScale)}px ${Math.round(7 * cardScale)}px` }}>
          <div className="info-dashed-row">
            <span className="label-typewriter" style={{ fontSize: `${6.8 * cardScale}px` }}>NAMA</span>
            <span className="value-text value-name" style={{ fontSize: `${7.6 * cardScale}px` }}>{person.nama || "-"}</span>
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

  // Render Kartu Sisi Belakang: QR Presensi Digital + NAMA SISWA/GURU di bawah QR
  const renderBackCard = (person) => {
    const isTeacher = type === "teacher" || person.nip !== undefined;
    const qrSize = currentSize.isLandscape ? 86 : Math.round(110 * cardScale);

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
          <div className="back-header-nct" style={{ minHeight: "34px", padding: "4px 8px", fontSize: "8px" }}>
            KARTU PRESENSI DIGITAL • {isTeacher ? "DEWAN GURU" : "SANTRI"}
          </div>
          <div className="flex items-center gap-2.5 p-2 flex-1 min-h-0 bg-white">
            <div className="flex flex-col items-center shrink-0">
              <div className="back-qr-box" style={{ width: `${qrSize}px`, height: `${qrSize}px`, padding: "3px" }}>
                {qrCodes[person.id] ? (
                  <img src={qrCodes[person.id]} alt="QR Presensi" />
                ) : (
                  <div className="text-[8px] text-gray-400 font-mono">Membuat QR...</div>
                )}
              </div>
              {/* Nama Pemilik Kartu di Bawah QR */}
              <div
                className="back-name-title"
                style={{
                  fontSize: "7.2px",
                  fontWeight: 900,
                  color: "#064e3b",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  textAlign: "center",
                  marginTop: "3px",
                  maxWidth: "96px",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                  fontFamily: "Arial, -apple-system, sans-serif",
                }}
              >
                {person.nama || "-"}
              </div>
            </div>

            <div className="flex-1 text-[6.8px] text-slate-700 space-y-0.5">
              <div className="font-bold text-emerald-950 uppercase border-b border-emerald-200 pb-0.5">Ketentuan Kartu:</div>
              <div>1. Kartu resmi Yayasan Raudhatul Yatama.</div>
              <div>2. Wajib dibawa untuk presensi kehadiran digital.</div>
              <div>3. Jika hilang lapor ke bagian administrasi.</div>
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
          maxHeight: `${currentSize.heightPx}px`,
        }}
      >
        <div className="back-header-nct" style={{ minHeight: `${Math.round(40 * cardScale)}px`, fontSize: `${8.8 * cardScale}px` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <div>KARTU PRESENSI DIGITAL</div>
            <div style={{ fontSize: `${7.8 * cardScale}px`, fontWeight: 800, letterSpacing: "1.2px", opacity: 0.95, marginTop: "1px" }}>
              {isTeacher ? "DEWAN GURU" : "SANTRI"}
            </div>
          </div>
        </div>

        <div className="back-body-nct" style={{ padding: `${Math.round(6 * cardScale)}px` }}>
          <div className="back-qr-box" style={{ width: `${qrSize}px`, height: `${qrSize}px` }}>
            {qrCodes[person.id] ? (
              <img src={qrCodes[person.id]} alt="QR Presensi" />
            ) : (
              <div className="text-[10px] text-gray-400 font-mono">Membuat QR...</div>
            )}
          </div>
          {/* Nama Pemilik Kartu di Bawah QR (Menggantikan 'SCAN UNTUK PRESENSI') */}
          <div
            className="back-name-title"
            style={{
              fontSize: `${Math.max(7.5, Math.min(10.5, 8.5 * cardScale))}px`,
              fontWeight: 900,
              color: "#064e3b",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              textAlign: "center",
              marginTop: "5px",
              maxWidth: "95%",
              lineHeight: 1.25,
              wordBreak: "break-word",
              fontFamily: "Arial, -apple-system, sans-serif",
            }}
          >
            {person.nama || "-"}
          </div>
        </div>

        <div className="back-rules-nct" style={{ padding: `${Math.round(6 * cardScale)}px ${Math.round(10 * cardScale)}px`, fontSize: `${6.4 * cardScale}px` }}>
          <div className="rules-header" style={{ fontSize: `${6.8 * cardScale}px` }}>KETENTUAN KARTU</div>
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
      {/* Top Action Header (Minimalis & Rapi Desktop/Mobile) */}
      <div className="bg-white border-b-2 border-gray-900 shadow-sm px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5 z-20 shrink-0">
        {/* Left: Brand & Status Ringkas */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-400 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-lg font-bold">badge</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate">
                Cetak Kartu {type === "teacher" ? "Guru" : "Siswa"} ({students.length} Data)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                {viewMode === "a4" ? `Kertas A4 (${a4Pages.length} Hal) • ${currentSize.code}` : `Satuan: ${currentSize.code}`}
              </p>
            </div>
          </div>

          {/* Tombol Tutup Mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
            title="Tutup (Esc)"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Right: Minimalist Controls dengan Dropdown */}
        <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap sm:flex-nowrap">
          {/* Dropdown 1: Ukuran ID Card */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={cardSizeId}
              onChange={(e) => setCardSizeId(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-gray-50 hover:bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none cursor-pointer transition-colors shadow-xs"
              title="Pilih ukuran kartu ID Card sesuai standar mika / PVC"
            >
              <optgroup label="Standar PVC / KTP">
                <option value="cr80">CR80 (54 × 85.6 mm)</option>
              </optgroup>
              <optgroup label="Seri B (Portrait / Tegak)">
                <option value="b1">B1 (55 × 85 mm) • Luar 102×65mm</option>
                <option value="b2">B2 (65 × 105 mm) • Luar 126×79mm</option>
                <option value="b3">B3 (80 × 105 mm) • Luar 126×95mm</option>
                <option value="b4">B4 (90 × 130 mm) • Luar 155×106mm</option>
              </optgroup>
              <optgroup label="Seri A (Landscape / Mendatar)">
                <option value="a1">A1 (90 × 55 mm) • Luar 68×99mm</option>
                <option value="a2">A2 (95 × 65 mm) • Luar 82×106mm</option>
                <option value="a3">A3 (100 × 80 mm) • Luar 92×115mm</option>
              </optgroup>
            </select>
          </div>

          {/* Dropdown 2: Format Kertas & Layout (Menggabungkan Mode Cetak + Sisi + Gap) */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={combinedLayoutValue}
              onChange={(e) => handleCombinedLayoutChange(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-gray-50 hover:bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-800 focus:outline-none cursor-pointer transition-colors shadow-xs"
              title="Pilih format cetak & susunan kartu"
            >
              <optgroup label="Cetak Kertas A4 (Grid Berjajar)">
                <option value="a4_pairs_gap">A4: Depan & Belakang (Ada Celah)</option>
                <option value="a4_pairs_fold">A4: Depan & Belakang (Rapat / Lipat)</option>
                <option value="a4_front">A4: Hanya Sisi Depan (Grid)</option>
                <option value="a4_back">A4: Hanya Sisi Belakang (QR Grid)</option>
              </optgroup>
              <optgroup label="Cetak Kartu Satuan">
                <option value="single">Kartu Satuan (Printer PVC / Lepas)</option>
              </optgroup>
            </select>
          </div>

          {/* Toggle Garis Potong */}
          {viewMode === "a4" && (
            <button
              type="button"
              onClick={() => setShowCutMarks((v) => !v)}
              className={`px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                showCutMarks
                  ? "bg-amber-50 border-amber-400 text-amber-900"
                  : "bg-gray-50 border-gray-300 text-gray-500"
              }`}
              title="Garis panduan potong gunting / cutter"
            >
              <span className="material-symbols-outlined text-sm">content_cut</span>
              <span className="hidden lg:inline">{showCutMarks ? "Garis Potong" : "Tanpa Garis"}</span>
            </button>
          )}

          {/* Zoom Controls Ringkas */}
          <div className="hidden xl:flex items-center bg-gray-100 border border-gray-300 rounded-xl px-1.5 py-1 gap-1 text-xs shrink-0">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded font-bold cursor-pointer"
              title="Perkecil"
            >
              -
            </button>
            <span className="font-mono text-[11px] font-bold px-1 min-w-[32px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded font-bold cursor-pointer"
              title="Perbesar"
            >
              +
            </button>
          </div>

          {/* Action Buttons: PDF, ZIP, Cetak */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl border border-rose-800 shadow-xs active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={viewMode === "a4" ? "Unduh file PDF ukuran kertas A4" : "Unduh PDF ukuran kartu"}
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              <span>PDF</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl border border-blue-800 shadow-xs active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Unduh file gambar PNG / ZIP"
            >
              <span className="material-symbols-outlined text-sm">image</span>
              <span>{students.length > 1 ? "ZIP" : "PNG"}</span>
            </button>

            {/* Primary Print Button */}
            <button
              onClick={handlePrint}
              disabled={isDownloading}
              className="py-1.5 px-3.5 bg-primary-green hover:bg-emerald-400 text-gray-900 text-xs font-black rounded-xl border-2 border-gray-900 shadow-neo active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Buka dialog cetak printer"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Cetak</span>
            </button>

            {/* Desktop Close Button */}
            <button
              onClick={onClose}
              className="hidden md:flex p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-300 cursor-pointer items-center justify-center ml-1"
              title="Tutup (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bar Info Ringkasan Ukuran & Lembar A4 */}
      {viewMode === "a4" && (
        <div className="bg-slate-800 text-slate-200 px-4 py-1.5 border-b border-slate-700 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <span className="material-symbols-outlined text-sm">straighten</span>
              <span>Ukuran: {currentSize.name}</span>
            </span>
            <span>&bull;</span>
            <span className="text-slate-300">{a4LayoutConfig.label}</span>
            {a4SideMode === "pairs" && (
              <>
                <span>&bull;</span>
                <span className="text-amber-300 text-[11px] font-mono">
                  {pairGapMode === "gap" ? "Model: Ada Celah (Terpisah)" : "Model: Rapat (Siap Lipat)"}
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
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

          /* Wrapper Kartu Pasangan */
          .id-card-pair-wrapper {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            position: relative;
            box-sizing: border-box;
          }

          .pair-has-gap {
            gap: 12px !important;
          }

          .pair-no-gap {
            gap: 0px !important;
            border-radius: 8px;
            overflow: hidden;
          }
          .pair-no-gap .id-card:first-child {
            border-top-right-radius: 0px !important;
            border-bottom-right-radius: 0px !important;
            border-right: 1.5px dashed #475569 !important;
          }
          .pair-no-gap .id-card:last-child {
            border-top-left-radius: 0px !important;
            border-bottom-left-radius: 0px !important;
            border-left: none !important;
          }

          /* Pembatas Celah Antar Kartu */
          .pair-gap-divider {
            width: 1px;
            height: 80%;
            border-right: 1px dashed #94a3b8;
          }

          /* Kotak Garis Potong (Cut Guide Frame) */
          .cut-guide-pair {
            position: relative;
            padding: 5px;
            border: 1.2px dashed #94a3b8;
            border-radius: 12px;
            background: #f8fafc;
          }

          .cut-guide-single {
            position: relative;
            padding: 4px;
            border: 1.2px dashed #94a3b8;
            border-radius: 10px;
            background: #f8fafc;
          }

          /* Lembar Kertas A4 */
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
            flex-shrink: 0;
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
            padding: 1.5px 0;
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
            line-height: 1.2;
            padding-top: 0.5px;
          }
          .value-text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-weight: 600;
            color: #000000;
            text-align: right;
            word-break: break-word;
            line-height: 1.2;
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
            line-height: 1.2;
            color: #111827;
            letter-spacing: 0.1px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
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
          .back-rules-nct {
            background: #f8fafc;
            border-top: 1px dashed #94a3b8;
            line-height: 1.35;
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
                      {pageStudents.length} Siswa ({currentSize.code} • {a4SideMode === "pairs" ? (pairGapMode === "gap" ? "Pasang (Ada Celah)" : "Pasang (Rapat)") : a4SideMode === "front" ? "Depan" : "Belakang"})
                    </span>
                  </div>

                  {/* Lembar Fisik A4 */}
                  <div
                    className={`a4-sheet ${isLandscape ? "a4-landscape" : "a4-portrait"}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${a4LayoutConfig.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${a4LayoutConfig.rows}, 1fr)`,
                      gap: "16px",
                      padding: isLandscape ? "28px 40px" : "36px 30px",
                      justifyItems: "center",
                      alignItems: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    {pageStudents.map((person) => {
                      if (a4SideMode === "pairs") {
                        // Pasang Sisi Depan + Sisi Belakang
                        return (
                          <div
                            key={person.id}
                            className={`id-card-pair-wrapper ${pairGapMode === "gap" ? "pair-has-gap" : "pair-no-gap"} ${showCutMarks ? "cut-guide-pair" : ""}`}
                          >
                            {renderFrontCard(person)}
                            {pairGapMode === "gap" && showCutMarks && <div className="pair-gap-divider"></div>}
                            {renderBackCard(person)}
                          </div>
                        );
                      } else if (a4SideMode === "front") {
                        // Sisi Depan Saja
                        return (
                          <div
                            key={person.id}
                            className={`id-card-wrapper ${showCutMarks ? "cut-guide-single" : ""}`}
                          >
                            {renderFrontCard(person)}
                          </div>
                        );
                      } else {
                        // Sisi Belakang Saja (QR Presensi)
                        return (
                          <div
                            key={person.id}
                            className={`id-card-wrapper ${showCutMarks ? "cut-guide-single" : ""}`}
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
                  className="student-card-print id-card-pair-wrapper pair-has-gap"
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
