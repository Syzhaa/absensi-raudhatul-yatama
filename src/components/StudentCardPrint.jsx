import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

// Preset Ukuran ID Card
export const CARD_SIZE_PRESETS = {
  cr80: {
    id: "cr80",
    name: "Standar CR80 (54 × 85.6 mm)",
    shortName: "CR80 (54x85.6mm)",
    desc: "Standar ISO KTP / ATM / Kartu Pelajar PVC",
    widthMm: 54,
    heightMm: 85.6,
    widthPx: 216,
    heightPx: 342,
  },
  b2: {
    id: "b2",
    name: "Holder Mika B2 (54 × 90 mm)",
    shortName: "Holder B2 (54x90mm)",
    desc: "Lebih tinggi, pas untuk casing mika tali B2",
    widthMm: 54,
    heightMm: 90,
    widthPx: 216,
    heightPx: 360,
  },
  medium: {
    id: "medium",
    name: "Ukuran Sedang (60 × 90 mm)",
    shortName: "Sedang (60x90mm)",
    desc: "Lebih lebar, tulisan nama & NISN lebih besar",
    widthMm: 60,
    heightMm: 90,
    widthPx: 240,
    heightPx: 360,
  },
};

// Preset Susunan di Kertas A4
export const A4_LAYOUT_PRESETS = {
  landscape_pairs: {
    id: "landscape_pairs",
    name: "A4 Landscape: 4 Pasang (8 Kartu / Hal)",
    desc: "Depan & Belakang berdampingan, mudah dilipat",
    orientation: "landscape",
    cardsPerStudent: 2,
    studentsPerPage: 4,
    cardsPerPage: 8,
  },
  portrait_pairs: {
    id: "portrait_pairs",
    name: "A4 Portrait: 3 Pasang (6 Kartu / Hal)",
    desc: "Depan & Belakang berdampingan vertikal",
    orientation: "portrait",
    cardsPerStudent: 2,
    studentsPerPage: 3,
    cardsPerPage: 6,
  },
  grid_front: {
    id: "grid_front",
    name: "A4 Portrait: 9 Kartu (Depan Saja)",
    desc: "Grid 3 × 3 sisi depan untuk 9 siswa",
    orientation: "portrait",
    cardsPerStudent: 1,
    studentsPerPage: 9,
    cardsPerPage: 9,
    side: "front",
  },
  grid_back: {
    id: "grid_back",
    name: "A4 Portrait: 9 Kartu (Belakang Saja)",
    desc: "Grid 3 × 3 sisi belakang QR untuk 9 siswa",
    orientation: "portrait",
    cardsPerStudent: 1,
    studentsPerPage: 9,
    cardsPerPage: 9,
    side: "back",
  },
};

export default function StudentCardPrint({ students = [], onClose, type = "student" }) {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  // Pengaturan Cetak & Kertas
  const [paperType, setPaperType] = useState("a4"); // "a4" | "cr80"
  const [cardSizeKey, setCardSizeKey] = useState("cr80"); // "cr80" | "b2" | "medium"
  const [a4LayoutKey, setA4LayoutKey] = useState("landscape_pairs"); // "landscape_pairs" | "portrait_pairs" | "grid_front" | "grid_back"
  const [showCutMarks, setShowCutMarks] = useState(true);

  const currentCardSize = CARD_SIZE_PRESETS[cardSizeKey] || CARD_SIZE_PRESETS.cr80;
  const currentA4Layout = A4_LAYOUT_PRESETS[a4LayoutKey] || A4_LAYOUT_PRESETS.landscape_pairs;

  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1280 ? 0.9 : window.innerWidth >= 1024 ? 0.8 : 0.7;
    }
    return 0.85;
  });

  // Esc key shortcut
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

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Fetch logo madrasah
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

  // Generate QR Code untuk setiap orang
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

  // Chunking data siswa per lembar A4
  const a4Pages = useMemo(() => {
    if (paperType !== "a4") return [];
    const perPage = currentA4Layout.studentsPerPage || 4;
    const pages = [];
    for (let i = 0; i < students.length; i += perPage) {
      pages.push(students.slice(i, i + perPage));
    }
    return pages;
  }, [students, paperType, currentA4Layout]);

  // Handler: Download PNG / ZIP
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
          setDownloadProgress(`Merender kartu ${i + 1}/${wrappers.length}: ${student?.nama || "Siswa"}...`);
          const dataUrl = await captureWrapper(wrappers[i]);
          const imgData = dataUrl.split("base64,")[1];
          const safeName = (student?.nama || `siswa-${i + 1}`).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
          zip.file(`kartu-${safeName}-${student?.nisn || student?.id || i}.png`, imgData, { base64: true });
        }

        setDownloadProgress(`Mengompresi ${wrappers.length} kartu ke file ZIP...`);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `kartu_identitas_${students.length}_${type}.zip`);
      }
    } catch (error) {
      console.error("Gagal mendownload PNG/ZIP:", error);
      alert("Gagal mendownload kartu. Pastikan aset gambar termuat sempurna.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  // Handler: Download PDF (A4 Sheet atau CR80 Card)
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      if (paperType === "a4") {
        const isLandscape = currentA4Layout.orientation === "landscape";
        setDownloadProgress("Menyiapkan dokumen PDF Lembar A4...");
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

        setDownloadProgress("Menyimpan dokumen PDF A4...");
        const filename = `kartu_${type}_a4_${students.length}_data.pdf`;
        pdf.save(filename);
      } else {
        // Mode Kartu Satuan CR80
        setDownloadProgress("Menyiapkan file PDF ukuran kartu (CR80: 54x85.6mm)...");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [currentCardSize.widthMm, currentCardSize.heightMm],
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
            if (pageCount > 0) pdf.addPage([currentCardSize.widthMm, currentCardSize.heightMm], "portrait");
            pdf.addImage(frontDataUrl, "PNG", 0, 0, currentCardSize.widthMm, currentCardSize.heightMm);
            pageCount++;

            // Sisi Belakang
            await waitForImages(cards[1]);
            const backDataUrl = await toPng(cards[1], {
              pixelRatio: 2.5,
              backgroundColor: "#ffffff",
              skipFonts: false,
              cacheBust: false,
            });
            pdf.addPage([currentCardSize.widthMm, currentCardSize.heightMm], "portrait");
            pdf.addImage(backDataUrl, "PNG", 0, 0, currentCardSize.widthMm, currentCardSize.heightMm);
            pageCount++;
          }
        }

        setDownloadProgress("Menyimpan dokumen PDF...");
        const filename = `kartu_${type}_cr80_${students.length}_data.pdf`;
        pdf.save(filename);
      }
    } catch (error) {
      console.error("Gagal membuat PDF kartu:", error);
      alert("Gagal membuat PDF kartu. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  // Handler: Dialog Cetak Printer
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const cardHTML = cardRef.current.innerHTML;
    const styles = document.getElementById("id-card-styles").innerHTML;
    const isA4 = paperType === "a4";
    const isLandscape = isA4 && currentA4Layout.orientation === "landscape";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu - ${students.length} Data (${isA4 ? "Kertas A4" : "Kartu Satuan"})</title>
          <style>
            ${styles}
            @media print {
              @page {
                size: ${isA4 ? (isLandscape ? "A4 landscape" : "A4 portrait") : `${currentCardSize.widthMm}mm ${currentCardSize.heightMm}mm`};
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

  // Render Sisi Depan Kartu
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

    return (
      <div
        className="id-card"
        style={{
          width: `${currentCardSize.widthPx}px`,
          height: `${currentCardSize.heightPx}px`,
        }}
      >
        {/* 1. Header Zone */}
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

        {/* 2. Middle Zone */}
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

        {/* 3. Bottom Zone: Data Diri */}
        <div className="card-info-nct">
          <div className="info-dashed-row">
            <span className="label-typewriter">NAMA</span>
            <span className="value-text value-name">{person.nama || "-"}</span>
          </div>

          {isTeacher ? (
            <>
              <div className="info-dashed-row">
                <span className="label-typewriter">NPK / NIP</span>
                <span className="value-text font-mono font-bold">{person.nip || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">MAPEL</span>
                <span className="value-text font-semibold">{person.mata_pelajaran || "Umum"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="info-dashed-row">
                <span className="label-typewriter">NISN</span>
                <span className="value-text font-mono font-bold">{person.nisn || person.nis || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">KELAS</span>
                <span className="value-text value-class">{cleanKelas}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">TTL</span>
                <span className="value-text">{ttl || "-"}</span>
              </div>
              <div className="info-dashed-row">
                <span className="label-typewriter">ALAMAT</span>
                <span className="value-text value-address">{cleanAlamat}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Sisi Belakang Kartu
  const renderBackCard = (person) => {
    const isTeacher = type === "teacher" || person.nip !== undefined;
    return (
      <div
        className="id-card"
        style={{
          width: `${currentCardSize.widthPx}px`,
          height: `${currentCardSize.heightPx}px`,
        }}
      >
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
              {students.length} Data • {paperType === "a4" ? `Kertas A4 (${a4Pages.length} Lembar)` : "Kartu Satuan CR80"}
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

        {/* Toolbar Pengaturan Kertas & Ukuran Kartu */}
        <div className="flex items-center gap-2 justify-start lg:justify-end flex-wrap">
          {/* 1. Pemilih Kertas: A4 vs CR80 */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-300 text-xs font-bold">
            <button
              onClick={() => setPaperType("a4")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                paperType === "a4"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-gray-700 hover:text-gray-900"
              }`}
              title="Cetak bersusun rapi di lembar kertas A4"
            >
              <span className="material-symbols-outlined text-sm">article</span>
              <span>Kertas A4</span>
            </button>
            <button
              onClick={() => setPaperType("cr80")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                paperType === "cr80"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-gray-700 hover:text-gray-900"
              }`}
              title="Cetak ukuran kartu satuan untuk printer PVC"
            >
              <span className="material-symbols-outlined text-sm">credit_card</span>
              <span>Kartu Satuan</span>
            </button>
          </div>

          {/* 2. Pemilih Ukuran ID Card */}
          <div className="flex items-center gap-1">
            <select
              value={cardSizeKey}
              onChange={(e) => setCardSizeKey(e.target.value)}
              className="px-2.5 py-1.5 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:border-gray-900 focus:outline-none cursor-pointer"
              title="Pilih standar ukuran kartu"
            >
              {Object.values(CARD_SIZE_PRESETS).map((sz) => (
                <option key={sz.id} value={sz.id}>
                  {sz.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pemilih Susunan A4 (hanya muncul saat mode A4) */}
          {paperType === "a4" && (
            <div className="flex items-center gap-1">
              <select
                value={a4LayoutKey}
                onChange={(e) => setA4LayoutKey(e.target.value)}
                className="px-2.5 py-1.5 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:border-gray-900 focus:outline-none cursor-pointer"
                title="Pilih susunan kartu di kertas A4"
              >
                {Object.values(A4_LAYOUT_PRESETS).map((lay) => (
                  <option key={lay.id} value={lay.id}>
                    {lay.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Sakelar Garis Potong (Cut Marks) */}
          {paperType === "a4" && (
            <button
              type="button"
              onClick={() => setShowCutMarks((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showCutMarks
                  ? "bg-amber-50 border-amber-400 text-amber-900"
                  : "bg-gray-50 border-gray-300 text-gray-500"
              }`}
              title="Tampilkan garis putus-putus panduan memotong kartu"
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
              onClick={() => setZoom(paperType === "a4" ? 0.85 : 1.0)}
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
            title="Unduh format gambar PNG (satuan atau arsip ZIP)"
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
            title={paperType === "a4" ? "Unduh dokumen PDF ukuran kertas A4 siap print" : "Unduh PDF ukuran kartu ID CR80"}
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>{paperType === "a4" ? "Unduh PDF (A4)" : "Unduh PDF (CR80)"}</span>
          </button>

          {/* Tombol Cetak Langsung */}
          <button
            onClick={handlePrint}
            disabled={isDownloading}
            className="py-1.5 sm:py-2 px-3.5 bg-primary-green hover:bg-lime-400 text-gray-900 text-xs font-black rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Buka dialog cetak printer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>{paperType === "a4" ? "Cetak Kertas A4" : "Cetak Kartu"}</span>
          </button>

          {/* Tombol Tutup */}
          <button
            onClick={onClose}
            className="py-1.5 sm:py-2 px-3 font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors text-xs border border-gray-300 cursor-pointer flex items-center justify-center gap-1"
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
          <span>{downloadProgress || "Sedang memproses unduhan..."}</span>
        </div>
      )}

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 md:p-8 bg-slate-800/90 flex flex-col items-center justify-start min-h-0">
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
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* A4 Landscape: 297mm x 210mm (Ratio 1.414) */
          .a4-landscape {
            width: 1188px;
            height: 840px;
            min-width: 1188px;
            min-height: 840px;
          }

          /* A4 Portrait: 210mm x 297mm */
          .a4-portrait {
            width: 840px;
            height: 1188px;
            min-width: 840px;
            min-height: 1188px;
          }

          /* Grid Container Dalam A4 */
          .a4-grid-landscape-pairs {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 20px;
            padding: 30px 40px;
            width: 100%;
            height: 100%;
            justify-items: center;
            align-items: center;
            box-sizing: border-box;
          }

          .a4-grid-portrait-pairs {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
            gap: 16px;
            padding: 30px 20px;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
          }

          .a4-grid-9 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 16px;
            padding: 30px 30px;
            width: 100%;
            height: 100%;
            justify-items: center;
            align-items: center;
            box-sizing: border-box;
          }

          /* Garis Potong (Cut Guide Marks) */
          .cut-guide-box {
            position: relative;
            padding: 4px;
            border: 1px dashed #94a3b8;
            border-radius: 8px;
            background: #fafafa;
          }

          /* ID Card Container */
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

          /* Header Zone */
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

          /* Middle Zone: Foto & Pita Vertikal */
          .card-middle-nct {
            padding: 8px 12px 4px 12px;
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

          /* Bottom Zone: Data Diri */
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

          /* Back Side */
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
            padding: 8px;
          }
          .back-qr-box {
            width: 114px;
            height: 114px;
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
            margin-top: 5px;
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
        `}</style>

        <div
          ref={cardRef}
          className="flex flex-col items-center justify-start w-full transition-all pb-16"
          style={{
            zoom: zoom,
          }}
        >
          {paperType === "a4" ? (
            // ==================== MODE A4: SUSUNAN RAPI PER LEMBAR A4 ====================
            a4Pages.map((pageStudents, pageIdx) => {
              const isLandscape = currentA4Layout.orientation === "landscape";
              return (
                <div key={pageIdx} className="a4-sheet-wrapper mb-10 flex flex-col items-center">
                  {/* Badge Header Lembar A4 */}
                  <div className="a4-page-badge mb-2 flex items-center justify-between w-full max-w-[1188px] text-xs font-bold text-slate-300 px-2">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-400">description</span>
                      <span>Lembar A4 #{pageIdx + 1} dari {a4Pages.length}</span>
                    </span>
                    <span className="bg-slate-700/80 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                      {pageStudents.length} Siswa ({currentA4Layout.name})
                    </span>
                  </div>

                  {/* Kertas A4 Fisik */}
                  <div
                    className={`a4-sheet ${isLandscape ? "a4-landscape" : "a4-portrait"}`}
                  >
                    {currentA4Layout.id === "landscape_pairs" ? (
                      // Layout 1: A4 Landscape - 4 Pasang Berdampingan (8 Kartu)
                      <div className="a4-grid-landscape-pairs">
                        {pageStudents.map((person) => (
                          <div
                            key={person.id}
                            className={`id-card-wrapper paired-fold ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {renderFrontCard(person)}
                            {renderBackCard(person)}
                          </div>
                        ))}
                      </div>
                    ) : currentA4Layout.id === "portrait_pairs" ? (
                      // Layout 2: A4 Portrait - 3 Pasang Berdampingan (6 Kartu)
                      <div className="a4-grid-portrait-pairs">
                        {pageStudents.map((person) => (
                          <div
                            key={person.id}
                            className={`id-card-wrapper paired-fold ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {renderFrontCard(person)}
                            {renderBackCard(person)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Layout 3 & 4: A4 Portrait Grid 3x3 (9 Kartu Depan Saja / Belakang Saja)
                      <div className="a4-grid-9">
                        {pageStudents.map((person) => (
                          <div
                            key={person.id}
                            className={`id-card-wrapper ${showCutMarks ? "cut-guide-box" : ""}`}
                          >
                            {currentA4Layout.side === "back" ? renderBackCard(person) : renderFrontCard(person)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // ==================== MODE SATUAN: CR80 INDIVIDUAL ====================
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
