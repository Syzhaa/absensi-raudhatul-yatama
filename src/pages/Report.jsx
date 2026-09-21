import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TableRowSkeleton } from "../components/Skeleton";
import { useKelasFormat } from "../hooks/useKelasFormat";
import { useAttendanceSettings } from "../hooks/useAttendanceSettings";
import { OFFICIAL_LOGO_BASE64 } from "../assets/logoBase64";

const formatTgl = (val) => {
  if (!val) return "-";
  try {
    const s = String(val);
    const cleanDate = s.includes("T") ? s.split("T")[0] : s.split(" ")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const mIdx = parseInt(m, 10) - 1;
      return `${d} ${months[mIdx] || m} ${y}`;
    }
    return cleanDate;
  } catch {
    return String(val);
  }
};

const formatTglLengkap = (val) => {
  if (!val) return "-";
  try {
    const dateObj = new Date(val);
    if (isNaN(dateObj.getTime())) return formatTgl(val);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const dayName = days[dateObj.getDay()];
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = months[dateObj.getMonth()];
    const y = dateObj.getFullYear();
    return `${dayName}, ${d} ${m} ${y}`;
  } catch {
    return formatTgl(val);
  }
};

let dynamicKontakList = [];

const fetchDynamicKontak = async () => {
  if (dynamicKontakList.length > 0) return dynamicKontakList;
  try {
    const res = await api.get("/kontak");
    if (Array.isArray(res.data?.data)) {
      dynamicKontakList = res.data.data;
      return dynamicKontakList;
    }
  } catch {}
  return [];
};

// Helper Alamat Resmi Per Lembaga (Dinamis dari Backend API dengan Fallback)
const getLembagaAddress = (lembagaCode) => {
  const norm = (lembagaCode || "").toLowerCase();
  const targetLembaga = norm === "mts" ? "mts" : (norm === "ma" ? "ma" : "yayasan");
  const found = dynamicKontakList.find(
    (k) => k.lembaga === targetLembaga && k.key?.toLowerCase() === "alamat"
  );
  if (found?.value) return found.value;

  if (targetLembaga === "mts") {
    return "Jl. Handil Jambu, Kertak Hanyar, Kab. Banjar, Kalimantan Selatan";
  }
  return "Jl. A. Yani KM 10,700 Gang H. Antung, Kertak Hanyar, Kab. Banjar, Kalsel";
};

// Helper Email Resmi Per Lembaga (Dinamis dari Backend API dengan Fallback)
const getLembagaEmail = (lembagaCode) => {
  const norm = (lembagaCode || "").toLowerCase();
  const targetLembaga = norm === "mts" ? "mts" : (norm === "ma" ? "ma" : null);
  if (targetLembaga) {
    const found = dynamicKontakList.find(
      (k) => k.lembaga === targetLembaga && k.key?.toLowerCase() === "email"
    );
    if (found?.value) return found.value;
  }

  if (norm === "mts") {
    return "mts@raudhatulyatama.sch.id";
  }
  if (norm === "ma") {
    return "ma@raudhatulyatama.sch.id";
  }
  return "ma@raudhatulyatama.sch.id • mts@raudhatulyatama.sch.id";
};

const STATUS_LABELS = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Alpha",
  libur: "Libur",
};

const STATUS_COLORS = {
  hadir: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  terlambat: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  izin: "bg-blue-100 text-blue-800 border-blue-300 font-bold",
  sakit: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
  alpha: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
  libur: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
};

// Helper: Ambil logo resmi dari API / public untuk Kop PDF (fallback ke logo resmi base64 bawaan)
const getLogoBase64 = async () => {
  try {
    const res = await api.get("/logo");
    if (res.data?.data?.url) {
      const dataUri = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 200;
            canvas.height = img.naturalHeight || 200;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = res.data.data.url;
      });
      if (dataUri) return dataUri;
    }
  } catch {}

  return OFFICIAL_LOGO_BASE64;
};

export default function Report() {
  const userRole = useAppStore((state) => state.userRole);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const { formatKelas } = useKelasFormat();
  const { enableTeacherAttendance } = useAttendanceSettings();
  const { effectiveLembaga } = useEffectiveLembaga();

  const isSuperAdmin = userRole === "super_admin";

  const today = format(new Date(), "yyyy-MM-dd");
  const firstDayThisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // Category: "siswa" | "guru"
  const [category, setCategory] = useState("siswa");

  const [dateFrom, setDateFrom] = useState("2026-08-01");
  const [dateTo, setDateTo] = useState("2026-09-17");
  const [statusFilter, setStatusFilter] = useState("");
  const [lembagaFilter, setLembagaFilter] = useState("");
  const [kelasFilterLocal, setKelasFilterLocal] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const isSingleDay = dateFrom === dateTo;
  const activeKelas = kelasFilterLocal || selectedKelas || "";

  // Otomatis: 1 hari = list detail log (masuk, pulang, status, ket), rentang hari = rekap angka murni
  const isDetailView = isSingleDay;

  const currentInstitutionCode = (isSuperAdmin && lembagaFilter ? lembagaFilter : effectiveLembaga || "MA").toUpperCase();
  const currentInstitutionFull = currentInstitutionCode === "MTS" ? "MADRASAH TSANAWIYAH" : "MADRASAH ALIYAH";
  const currentLembagaEmail = getLembagaEmail(currentInstitutionCode);
  const currentInstitutionAddress = getLembagaAddress(currentInstitutionCode);

  const reportKelasOptions = useMemo(() => {
    if (currentInstitutionCode === "MTS") {
      return ["VII", "VIII", "IX"];
    }
    if (currentInstitutionCode === "MA") {
      return ["X", "XI", "XII"];
    }
    return ["VII", "VIII", "IX", "X", "XI", "XII"];
  }, [currentInstitutionCode]);

  const baseParams = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    ...(statusFilter && { status: statusFilter }),
    ...(isSuperAdmin && lembagaFilter && { lembaga: lembagaFilter }),
    ...(!isSuperAdmin && effectiveLembaga && { lembaga: effectiveLembaga }),
  }), [dateFrom, dateTo, statusFilter, isSuperAdmin, lembagaFilter, effectiveLembaga]);

  // Quick Preset Handlers
  const handlePresetToday = () => {
    setDateFrom(today);
    setDateTo(today);
    setPage(1);
  };

  const handlePresetThisMonth = () => {
    setDateFrom(firstDayThisMonth);
    setDateTo(today);
    setPage(1);
  };

  const handlePresetLastMonth = () => {
    setDateFrom("2026-08-01");
    setDateTo("2026-08-31");
    setPage(1);
  };

  const handlePresetAllDummy = () => {
    setDateFrom("2026-08-01");
    setDateTo("2026-09-17");
    setPage(1);
  };

  // Queries:
  // 1. Detailed log query (students)
  const { data: siswaData, isLoading: isSiswaLoading } = useQuery({
    queryKey: ["report-siswa-detail", dateFrom, dateTo, activeKelas, statusFilter, lembagaFilter, page, perPage],
    queryFn: async () => {
      const res = await api.get("/attendance/report/students", {
        params: { ...baseParams, page, per_page: perPage, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data;
    },
    enabled: category === "siswa",
  });

  // 2. Detailed log query (teachers)
  const { data: guruData, isLoading: isGuruLoading } = useQuery({
    queryKey: ["report-guru-detail", dateFrom, dateTo, statusFilter, lembagaFilter, page, perPage],
    queryFn: async () => {
      const res = await api.get("/attendance/report/teachers", {
        params: { ...baseParams, page, per_page: perPage },
      });
      return res.data;
    },
    enabled: category === "guru",
  });

  // 3. Rekap jumlah query (students summary)
  const { data: rekapSiswaData, isLoading: isRekapSiswaLoading } = useQuery({
    queryKey: ["report-siswa-summary", dateFrom, dateTo, activeKelas, lembagaFilter],
    queryFn: async () => {
      const res = await api.get("/attendance/report/student-matrix", {
        params: { ...baseParams, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data;
    },
    enabled: category === "siswa" && !isSingleDay,
  });

  // 4. Rekap jumlah query (teachers summary)
  const { data: rekapGuruData, isLoading: isRekapGuruLoading } = useQuery({
    queryKey: ["report-guru-summary", dateFrom, dateTo, lembagaFilter],
    queryFn: async () => {
      const res = await api.get("/attendance/report/teacher-summary", {
        params: baseParams,
      });
      return res.data;
    },
    enabled: category === "guru" && !isSingleDay,
  });

  const isLoading = isSiswaLoading || isGuruLoading || isRekapSiswaLoading || isRekapGuruLoading;

  // Pagination meta for detailed log
  const paginationMeta = useMemo(() => {
    if (category === "siswa") {
      return siswaData?.data?.data || null;
    }
    return guruData?.data?.data || null;
  }, [category, siswaData, guruData]);

  // Rows for Detailed view (1 Hari)
  const detailRows = useMemo(() => {
    const rawData = paginationMeta?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const personName = (r.student?.nama || r.teacher?.nama || "").toLowerCase();
      const personId = (r.student?.nisn || r.teacher?.nip || "").toLowerCase();
      const personClass = (r.student?.kelas || "").toLowerCase();
      return personName.includes(q) || personId.includes(q) || personClass.includes(q);
    });
  }, [paginationMeta, search]);

  // Rows for Rekap Jumlah view (Rentang Hari)
  const rekapRows = useMemo(() => {
    let rawData = [];
    if (category === "siswa") {
      rawData = rekapSiswaData?.data?.data || [];
    } else {
      rawData = rekapGuruData?.data?.data || [];
    }
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const personName = (r.nama || "").toLowerCase();
      const personId = (r.nisn || r.nip || r.nis || "").toLowerCase();
      const personClass = (r.kelas || "").toLowerCase();
      return personName.includes(q) || personId.includes(q) || personClass.includes(q);
    });
  }, [category, rekapSiswaData, rekapGuruData, search]);

  // Summary counts for stats cards
  const summary = category === "siswa" ? siswaData?.data?.summary : guruData?.data?.summary;

  // ==========================================
  // HELPER DATA FETCHING FOR COMPLETE EXPORTS
  // ==========================================
  const fetchAllDetailedLogs = async () => {
    if (category === "siswa") {
      const res = await api.get("/attendance/report/students", {
        params: { ...baseParams, per_page: 5000, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data?.data?.data?.data || [];
    } else {
      const res = await api.get("/attendance/report/teachers", {
        params: { ...baseParams, per_page: 5000 },
      });
      return res.data?.data?.data?.data || [];
    }
  };

  const fetchAllSummaryCounts = async () => {
    if (category === "siswa") {
      const res = await api.get("/attendance/report/student-matrix", {
        params: { ...baseParams, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data?.data?.data || [];
    } else {
      const res = await api.get("/attendance/report/teacher-summary", {
        params: baseParams,
      });
      return res.data?.data?.data || [];
    }
  };

  // ==========================================
  // EXPORT EXCEL RESMI (MULTI-SHEET PER TANGGAL)
  // ==========================================
  const exportExcel = async () => {
    setIsExporting(true);
    setExportProgress("Menyiapkan dokumen Excel...");
    try {
      await fetchDynamicKontak();
      const institutionName = currentInstitutionCode;
      const institutionFull = currentInstitutionFull;
      const email = currentLembagaEmail;
      const targetTitle = category === "siswa" ? "SANTRI / SISWA" : "DEWAN GURU";

      const wb = XLSX.utils.book_new();

      if (isSingleDay) {
        // --- 1 HARI: 1 Sheet List Log Harian Lengkap ---
        const logs = await fetchAllDetailedLogs();
        if (logs.length === 0) {
          alert("Tidak ada data presensi pada tanggal ini.");
          return;
        }

        const wsData = [
          ["YAYASAN RAUDHATUL YATAMA"],
          [`${institutionFull} RAUDHATUL YATAMA`],
          [currentInstitutionAddress],
          [`Website: raudhatulyatama.sch.id, ppdb.raudhatulyatama.sch.id | Email: ${email}`],
          [`LAPORAN PRESENSI HARIAN ${targetTitle}`],
          [`Hari & Tanggal: ${formatTglLengkap(dateFrom)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
          [],
          category === "siswa"
            ? ["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]
            : ["No", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"],
          ...logs.map((r, i) => [
            i + 1,
            category === "siswa" ? (r.student?.nama || "-") : (r.teacher?.nama || "-"),
            category === "siswa" ? (r.student?.nisn || "-") : (r.teacher?.nip || "-"),
            category === "siswa" ? (formatKelas(r.student?.kelas) || "-") : institutionName,
            institutionName,
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, ws, "Presensi_Harian");
      } else {
        // --- RENTANG HARI: Sheet 1 = Ringkasan Jumlah, Sheet 2..N = Sheet per Tanggal ---
        const [summaries, logs] = await Promise.all([
          fetchAllSummaryCounts(),
          fetchAllDetailedLogs(),
        ]);

        if (summaries.length === 0 && logs.length === 0) {
          alert("Tidak ada data presensi pada rentang tanggal ini.");
          return;
        }

        // 1. SHEET DEPAN: RINGKASAN JUMLAH ANGKA
        const sumHeader = [
          ["YAYASAN RAUDHATUL YATAMA"],
          [`${institutionFull} RAUDHATUL YATAMA`],
          [currentInstitutionAddress],
          [`Website: raudhatulyatama.sch.id, ppdb.raudhatulyatama.sch.id | Email: ${email}`],
          [`REKAPITULASI JUMLAH PRESENSI ${targetTitle}`],
          [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
          [],
          category === "siswa"
            ? ["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]
            : ["No", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"],
        ];

        const sumRows = summaries.map((r, i) => {
          const s = r.summary || {};
          const hadir = s.hadir ?? r.hadir ?? 0;
          const telat = s.terlambat ?? r.terlambat ?? 0;
          const izin = s.izin ?? r.izin ?? 0;
          const sakit = s.sakit ?? r.sakit ?? 0;
          const alpha = s.alpha ?? r.alpha ?? 0;
          const libur = s.libur ?? r.libur ?? 0;
          const totalHadir = r.total_hadir ?? (hadir + telat);

          return [
            i + 1,
            r.nama,
            category === "siswa" ? (r.nisn || r.nis || "-") : (r.nip || "-"),
            category === "siswa" ? (formatKelas(r.kelas) || "-") : institutionName,
            institutionName,
            hadir,
            telat,
            izin,
            sakit,
            alpha,
            libur,
            totalHadir,
          ];
        });

        const wsSummary = XLSX.utils.aoa_to_sheet([...sumHeader, ...sumRows]);
        wsSummary["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan_Jumlah");

        // 2. SHEET LAINNYA: PER TANGGAL DI DALAM RENTANG
        const groupedByDate = {};
        logs.forEach((r) => {
          const rawDate = r.attendance_date ? String(r.attendance_date).split("T")[0].split(" ")[0] : "Lainnya";
          if (!groupedByDate[rawDate]) groupedByDate[rawDate] = [];
          groupedByDate[rawDate].push(r);
        });

        const uniqueDates = Object.keys(groupedByDate).sort();

        uniqueDates.forEach((tgl) => {
          const dayRows = groupedByDate[tgl] || [];
          const sheetName = tgl.length >= 10 ? `${tgl.slice(8, 10)}-${tgl.slice(5, 7)}-${tgl.slice(0, 4)}` : tgl;

          const dateWsData = [
            [`PRESENSI TANGGAL: ${formatTglLengkap(tgl)}`],
            [`Lembaga: ${institutionFull} Raudhatul Yatama`],
            [],
            category === "siswa"
              ? ["No", "Nama Siswa", "NISN", "Kelas", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]
              : ["No", "Nama Guru", "NIP / NUPTK / NPK", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"],
            ...dayRows.map((r, i) => [
              i + 1,
              category === "siswa" ? (r.student?.nama || "-") : (r.teacher?.nama || "-"),
              category === "siswa" ? (r.student?.nisn || "-") : (r.teacher?.nip || "-"),
              category === "siswa" ? (formatKelas(r.student?.kelas) || "-") : (STATUS_LABELS[r.status] || r.status),
              STATUS_LABELS[r.status] || r.status,
              r.check_in ? r.check_in.slice(0, 5) : "-",
              r.check_out ? r.check_out.slice(0, 5) : "-",
              r.notes || "-",
            ]),
          ];

          const wsDate = XLSX.utils.aoa_to_sheet(dateWsData);
          wsDate["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
          XLSX.utils.book_append_sheet(wb, wsDate, sheetName.slice(0, 31));
        });
      }

      const filename = `Laporan_Absensi_${category.toUpperCase()}_${institutionName}_${dateFrom}_sd_${dateTo}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Gagal mengekspor data ke Excel: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // ==========================================
  // KOP SURAT, TANDA TANGAN & FOOTER RESMI PDF
  // ==========================================
  const drawKopSurat = (d, institutionFull, title, subtitle, logoData, lembagaCode) => {
    // Logo Resmi di Kiri Kop
    const logoToUse = logoData || OFFICIAL_LOGO_BASE64;
    if (logoToUse) {
      try {
        d.addImage(logoToUse, "PNG", 16, 9.5, 21, 21);
      } catch (e) {}
    }

    const email = getLembagaEmail(lembagaCode);

    // Teks Kop Tengah
    d.setFont("helvetica", "bold");
    d.setFontSize(14);
    d.setTextColor(17, 24, 39);
    d.text("YAYASAN RAUDHATUL YATAMA", 152, 14, { align: "center" });

    d.setFontSize(12);
    d.setTextColor(16, 185, 129); // Primary green
    d.text(`${institutionFull} RAUDHATUL YATAMA`, 152, 20, { align: "center" });

    d.setFont("helvetica", "normal");
    d.setFontSize(8.5);
    d.setTextColor(75, 85, 99);
    const address = getLembagaAddress(lembagaCode);
    d.text(address, 152, 25, { align: "center" });
    // 2 Website Resmi (Tanpa domain absen) & Email sesuai lembaga
    d.text(`Website: raudhatulyatama.sch.id • ppdb.raudhatulyatama.sch.id | Email: ${email}`, 152, 29, { align: "center" });

    // Garis Ganda Pemisah Kop
    d.setDrawColor(17, 24, 39);
    d.setLineWidth(0.8);
    d.line(14, 32, 283, 32);
    d.setLineWidth(0.25);
    d.line(14, 33.2, 283, 33.2);

    // Judul Dokumen
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.setTextColor(17, 24, 39);
    d.text(title, 148.5, 39, { align: "center" });

    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    d.setTextColor(100, 116, 139);
    d.text(subtitle, 148.5, 43.5, { align: "center" });
  };

  const drawSignatures = (d, institutionFull, finalY) => {
    const pageHeight = d.internal.pageSize.height;
    let startY = finalY + 10;

    if (startY + 35 > pageHeight) {
      d.addPage("a4", "landscape");
      startY = 20;
    }

    const dateStr = format(new Date(), "dd MMMM yyyy");

    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    d.setTextColor(30, 41, 59);

    // Kiri: Petugas Presensi
    d.text("Mengetahui,", 30, startY);
    d.text("Petugas Presensi Madrasah,", 30, startY + 5);
    d.text("( .................................................... )", 30, startY + 25);
    d.text("NIP. -", 30, startY + 29);

    // Kanan: Kepala Madrasah
    d.text(`Banjar, ${dateStr}`, 210, startY);
    d.text(`Kepala ${institutionFull},`, 210, startY + 5);
    d.text("( .................................................... )", 210, startY + 25);
    d.text("NIP. -", 210, startY + 29);
  };

  const drawFooterResmi = (d, pageNum, totalPages, lembagaCode) => {
    const email = getLembagaEmail(lembagaCode);

    d.setDrawColor(203, 213, 225);
    d.setLineWidth(0.3);
    d.line(14, 198, 283, 198);

    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    d.setTextColor(100, 116, 139);

    // Kiri: 2 Domain Utama & Email Sesuai Lembaga
    d.text("Website: raudhatulyatama.sch.id  •  ppdb.raudhatulyatama.sch.id", 14, 202);
    d.text(`Email: ${email}`, 14, 205.5);

    // Kanan: Nomor Halaman
    d.text(`Halaman ${pageNum} dari ${totalPages}`, 283, 203.5, { align: "right" });
  };

  // ==========================================
  // EXPORT PDF: REKAP / GABUNGAN
  // ==========================================
  const exportPdf = async (mode = "ringkasan") => {
    setIsExporting(true);
    setExportProgress("Menyiapkan dokumen PDF...");
    try {
      await fetchDynamicKontak();
      const institutionName = currentInstitutionCode;
      const institutionFull = currentInstitutionFull;
      const targetTitle = category === "siswa" ? "SANTRI / SISWA" : "DEWAN GURU";

      setExportProgress("Memuat logo madrasah...");
      const logoData = await getLogoBase64();

      if (mode === "gabungan" && !isSingleDay) {
        // --- MULTI-PAGE PDF: Hal 1 = Ringkasan Jumlah, Hal 2..N = Detail per hari ---
        setExportProgress("Mengambil data rekap & detail...");
        const [summaries, logs] = await Promise.all([
          fetchAllSummaryCounts(),
          fetchAllDetailedLogs(),
        ]);

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        // 1. Halaman 1: Ringkasan Jumlah
        const titleSum = `REKAPITULASI JUMLAH PRESENSI ${targetTitle}`;
        const subtitleSum = `Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Lembaga: ${institutionFull}`;
        drawKopSurat(doc, institutionFull, titleSum, subtitleSum, logoData, institutionName);

        const headSum = category === "siswa"
          ? [["No", "Nama Siswa", "NISN", "Kelas", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]]
          : [["No", "Nama Guru", "NIP / NPK", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];

        const bodySum = summaries.map((r, i) => {
          const s = r.summary || {};
          return [
            i + 1,
            r.nama,
            category === "siswa" ? (r.nisn || r.nis || "-") : (r.nip || "-"),
            category === "siswa" ? (formatKelas(r.kelas) || "-") : (s.hadir ?? r.hadir ?? 0),
            s.hadir ?? r.hadir ?? 0,
            s.terlambat ?? r.terlambat ?? 0,
            s.izin ?? r.izin ?? 0,
            s.sakit ?? r.sakit ?? 0,
            s.alpha ?? r.alpha ?? 0,
            s.libur ?? r.libur ?? 0,
            r.total_hadir ?? 0,
          ];
        });

        autoTable(doc, {
          startY: 47,
          head: headSum,
          body: bodySum,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { halign: "center", cellWidth: 10 } },
        });

        drawSignatures(doc, institutionFull, doc.lastAutoTable.finalY);

        // 2. Halaman 2..N: Log Per Hari
        const groupedByDate = {};
        logs.forEach((r) => {
          const rawDate = r.attendance_date ? String(r.attendance_date).split("T")[0].split(" ")[0] : "Lainnya";
          if (!groupedByDate[rawDate]) groupedByDate[rawDate] = [];
          groupedByDate[rawDate].push(r);
        });

        const uniqueDates = Object.keys(groupedByDate).sort();

        uniqueDates.forEach((tgl) => {
          doc.addPage("a4", "landscape");
          const titleDay = `LAPORAN PRESENSI HARIAN ${targetTitle}`;
          const subtitleDay = `Hari & Tanggal: ${formatTglLengkap(tgl)} | Lembaga: ${institutionFull}`;
          drawKopSurat(doc, institutionFull, titleDay, subtitleDay, logoData, institutionName);

          const dayRows = groupedByDate[tgl] || [];
          const headDay = category === "siswa"
            ? [["No", "Nama Siswa", "NISN", "Kelas", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]]
            : [["No", "Nama Guru", "NIP / NUPTK / NPK", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]];

          const bodyDay = dayRows.map((r, idx) => [
            idx + 1,
            category === "siswa" ? (r.student?.nama || "-") : (r.teacher?.nama || "-"),
            category === "siswa" ? (r.student?.nisn || "-") : (r.teacher?.nip || "-"),
            category === "siswa" ? (formatKelas(r.student?.kelas) || "-") : (STATUS_LABELS[r.status] || r.status),
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]);

          autoTable(doc, {
            startY: 47,
            head: headDay,
            body: bodyDay,
            theme: "grid",
            styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { halign: "center", cellWidth: 10 } },
          });

          drawSignatures(doc, institutionFull, doc.lastAutoTable.finalY);
        });

        // Tulis Footer Resmi di Setiap Halaman
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          drawFooterResmi(doc, i, totalPages, institutionName);
        }

        doc.save(`Laporan_Gabungan_${category.toUpperCase()}_${institutionName}_${dateFrom}_sd_${dateTo}.pdf`);
      } else {
        // --- RINGKASAN PDF (Standar) ---
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        if (isSingleDay) {
          // 1 HARI: Cetak list harian detail
          setExportProgress("Mengambil data harian...");
          const logs = await fetchAllDetailedLogs();
          const title = `LAPORAN PRESENSI HARIAN ${targetTitle}`;
          const subtitle = `Hari & Tanggal: ${formatTglLengkap(dateFrom)} | Lembaga: ${institutionFull}`;
          drawKopSurat(doc, institutionFull, title, subtitle, logoData, institutionName);

          const head = category === "siswa"
            ? [["No", "Nama Siswa", "NISN", "Kelas", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]]
            : [["No", "Nama Guru", "NIP / NUPTK / NPK", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]];

          const body = logs.map((r, i) => [
            i + 1,
            category === "siswa" ? (r.student?.nama || "-") : (r.teacher?.nama || "-"),
            category === "siswa" ? (r.student?.nisn || "-") : (r.teacher?.nip || "-"),
            category === "siswa" ? (formatKelas(r.student?.kelas) || "-") : (STATUS_LABELS[r.status] || r.status),
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]);

          autoTable(doc, {
            startY: 47,
            head,
            body,
            theme: "grid",
            styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { halign: "center", cellWidth: 10 } },
          });

          drawSignatures(doc, institutionFull, doc.lastAutoTable.finalY);

          const totalPages = doc.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawFooterResmi(doc, i, totalPages, institutionName);
          }

          doc.save(`Laporan_Harian_${category.toUpperCase()}_${institutionName}_${dateFrom}.pdf`);
        } else {
          // RENTANG HARI: Cetak tabel rekapitulasi angka per orang
          setExportProgress("Mengambil data rekapitulasi...");
          const summaries = await fetchAllSummaryCounts();
          const title = `REKAPITULASI JUMLAH PRESENSI ${targetTitle}`;
          const subtitle = `Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Lembaga: ${institutionFull}`;
          drawKopSurat(doc, institutionFull, title, subtitle, logoData, institutionName);

          const head = category === "siswa"
            ? [["No", "Nama Siswa", "NISN", "Kelas", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]]
            : [["No", "Nama Guru", "NIP / NPK", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];

          const body = summaries.map((r, i) => {
            const s = r.summary || {};
            return [
              i + 1,
              r.nama,
              category === "siswa" ? (r.nisn || r.nis || "-") : (r.nip || "-"),
              category === "siswa" ? (formatKelas(r.kelas) || "-") : (s.hadir ?? r.hadir ?? 0),
              s.hadir ?? r.hadir ?? 0,
              s.terlambat ?? r.terlambat ?? 0,
              s.izin ?? r.izin ?? 0,
              s.sakit ?? r.sakit ?? 0,
              s.alpha ?? r.alpha ?? 0,
              s.libur ?? r.libur ?? 0,
              r.total_hadir ?? 0,
            ];
          });

          autoTable(doc, {
            startY: 47,
            head,
            body,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { halign: "center", cellWidth: 10 } },
          });

          drawSignatures(doc, institutionFull, doc.lastAutoTable.finalY);

          const totalPages = doc.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawFooterResmi(doc, i, totalPages, institutionName);
          }

          doc.save(`Laporan_Rekap_Angka_${category.toUpperCase()}_${institutionName}_${dateFrom}_sd_${dateTo}.pdf`);
        }
      }
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Gagal mencetak dokumen PDF: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  return (
    <div className="w-full pb-28 md:pb-8 space-y-4 font-sans">
      {/* 1. TOP HEADER & EXPORT ACTION BAR */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-3 sm:p-4 shadow-neo flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Switcher Pill (Siswa vs Guru) */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border-2 border-gray-900 gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setCategory("siswa"); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer select-none ${
              category === "siswa"
                ? "bg-primary-green text-gray-900 border-2 border-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <span className="material-symbols-outlined text-base leading-none">school</span>
            <span>Presensi Siswa</span>
          </button>

          {enableTeacherAttendance && (
            <button
              type="button"
              onClick={() => { setCategory("guru"); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer select-none ${
                category === "guru"
                  ? "bg-primary-green text-gray-900 border-2 border-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              <span className="material-symbols-outlined text-base leading-none">badge</span>
              <span>Presensi Guru</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Export Excel & PDF */}
        <div className="flex items-center gap-2 justify-end flex-wrap flex-shrink-0">
          {/* Tombol Excel (Full Sheet Ringkasan + Sheet per Tanggal) */}
          <button
            onClick={exportExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            title="Download Excel: Sheet Depan Ringkasan + Sheet Lain per Tanggal"
          >
            {isExporting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-base">table_view</span>
            )}
            <span>Excel {isSingleDay ? "" : "(Multi-Sheet)"}</span>
          </button>

          {/* Tombol PDF Rekap */}
          <button
            onClick={() => exportPdf("ringkasan")}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            title={isSingleDay ? "Download PDF Laporan Harian" : "Download PDF Ringkasan Angka Rekapitulasi"}
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>{isSingleDay ? "PDF Harian" : "PDF Rekap"}</span>
          </button>

          {/* Tombol PDF Gabungan (Khusus Rentang Hari) */}
          {!isSingleDay && (
            <button
              onClick={() => exportPdf("gabungan")}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              title="Download 1 File PDF Gabungan (Ringkasan + Semua Halaman Tanggal)"
            >
              <span className="material-symbols-outlined text-base">layers</span>
              <span>PDF Gabungan</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Toast saat mengekspor */}
      {isExporting && exportProgress && (
        <div className="bg-amber-100 border-2 border-gray-900 rounded-2xl p-3 text-xs font-black text-amber-950 flex items-center gap-2 shadow-sm animate-pulse">
          <span className="material-symbols-outlined text-base">sync</span>
          <span>{exportProgress}</span>
        </div>
      )}

      {/* 2. STATISTIC SUMMARY CARDS (Untuk 1 Hari) */}
      {isSingleDay && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 leading-none block mb-1">{summary.hadir || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Hadir Tepat</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none block mb-1">{summary.terlambat || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Terlambat</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-blue-600 leading-none block mb-1">{summary.izin || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Izin</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-purple-600 leading-none block mb-1">{summary.sakit || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Sakit</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-rose-600 leading-none block mb-1">{summary.alpha || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Alpha</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-2.5 shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-black text-slate-600 leading-none block mb-1">{summary.libur || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Libur</span>
          </div>
        </div>
      )}

      {/* 3. PERMANENT & CLEAN FILTER CONTROLS */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-4 sm:p-5 shadow-neo space-y-3.5">
        {/* Quick Presets Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider mr-1">Pilih Cepat:</span>
            <button
              type="button"
              onClick={handlePresetToday}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                dateFrom === today && dateTo === today ? "bg-primary-green border-gray-900 text-gray-900 font-black shadow-xs" : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
              }`}
            >
              Hari Ini (1 Hari)
            </button>
            <button
              type="button"
              onClick={handlePresetThisMonth}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                dateFrom === firstDayThisMonth && dateTo === today ? "bg-primary-green border-gray-900 text-gray-900 font-black shadow-xs" : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
              }`}
            >
              Bulan Ini (September)
            </button>
            <button
              type="button"
              onClick={handlePresetLastMonth}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                dateFrom === "2026-08-01" && dateTo === "2026-08-31" ? "bg-primary-green border-gray-900 text-gray-900 font-black shadow-xs" : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
              }`}
            >
              Bulan Lalu (Agustus)
            </button>
            <button
              type="button"
              onClick={handlePresetAllDummy}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                dateFrom === "2026-08-01" && dateTo === "2026-09-17" ? "bg-primary-green border-gray-900 text-gray-900 font-black shadow-xs" : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
              }`}
            >
              Semua Periode (Agu - Sep)
            </button>
          </div>

          {(dateFrom !== "2026-08-01" || dateTo !== "2026-09-17" || statusFilter || lembagaFilter || kelasFilterLocal || search) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("2026-08-01");
                setDateTo("2026-09-17");
                setStatusFilter("");
                setLembagaFilter("");
                setKelasFilterLocal("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs font-black text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset Filter
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Dari Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-gray-700 uppercase">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-gray-700 uppercase">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden"
            />
          </div>

          {/* Filter Status (Hanya saat mode detail list 1 hari) */}
          {isDetailView && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-gray-700 uppercase">Status Presensi</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Kelas (Siswa Only) */}
          {category === "siswa" && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-gray-700 uppercase">Filter Kelas</label>
              <select
                value={kelasFilterLocal}
                onChange={(e) => { setKelasFilterLocal(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Kelas</option>
                {reportKelasOptions.map((k) => (
                  <option key={k} value={k}>
                    Kelas {formatKelas(k)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lembaga (Super Admin) */}
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-gray-700 uppercase">Lembaga</label>
              <select
                value={lembagaFilter}
                onChange={(e) => {
                  setLembagaFilter(e.target.value);
                  setKelasFilterLocal("");
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Lembaga</option>
                <option value="MA">Madrasah Aliyah (MA)</option>
                <option value="MTS">Madrasah Tsanawiyah (MTs)</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className={`flex flex-col gap-1 ${category === "siswa" && isDetailView ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <label className="text-[11px] font-black text-gray-700 uppercase">Cari Nama / NISN / NIP</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={category === "guru" ? "Ketik nama dewan guru atau NIP..." : "Ketik nama siswa atau NISN..."}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* 4. MAIN DATA TABLE */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl shadow-neo overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800">
                <tr>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">No</th>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">Nama</th>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">Status / Hadir</th>
                  <th className="px-3 py-2.5 text-center font-black text-xs uppercase">Waktu / Total</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton cols={4} />
                <TableRowSkeleton cols={4} />
                <TableRowSkeleton cols={4} />
              </tbody>
            </table>
          </div>
        ) : isDetailView ? (
          /* =========================================================================
             A. TAMPILAN 1 HARI (LIST DETAIL HARIAN):
             List nama, jam masuk, jam keluar, status (hadir/terlambat/izin/sakit/alpha), keterangan
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                <tr>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                  <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">
                    {category === "siswa" ? "Nama Siswa" : "Nama Dewan Guru"}
                  </th>
                  <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">
                    {category === "siswa" ? "NISN" : "NIP / NPK"}
                  </th>
                  {category === "siswa" && <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>}
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Status</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Jam Masuk</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Jam Pulang</th>
                  <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detailRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-400 font-bold">
                      Tidak ada rekaman presensi pada tanggal ini.
                    </td>
                  </tr>
                ) : (
                  detailRows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">
                        {paginationMeta ? (paginationMeta.current_page - 1) * perPage + i + 1 : i + 1}
                      </td>
                      <td className="px-3.5 py-2.5 font-black text-gray-900">
                        {category === "siswa" ? (r.student?.nama || "-") : (r.teacher?.nama || "-")}
                      </td>
                      <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">
                        {category === "siswa" ? (r.student?.nisn || "-") : (r.teacher?.nip || "-")}
                      </td>
                      {category === "siswa" && (
                        <td className="px-3.5 py-2.5 font-bold text-gray-700">{formatKelas(r.student?.kelas) || "-"}</td>
                      )}
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[11px] font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">
                        {r.check_in ? r.check_in.slice(0, 5) : "-"}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">
                        {r.check_out ? r.check_out.slice(0, 5) : "-"}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-gray-600 font-medium truncate max-w-[180px]">
                        {r.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* =========================================================================
             B. TAMPILAN RENTANG HARI (REKAPITULASI ANGKA):
             Header: No, Nama, Hadir (angka), Terlambat (angka), Izin, Sakit, Alpha, Libur, Total Hadir
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                <tr>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                  <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">
                    {category === "siswa" ? "Nama Siswa" : "Nama Dewan Guru"}
                  </th>
                  <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">
                    {category === "siswa" ? "NISN" : "NIP / NPK"}
                  </th>
                  {category === "siswa" && <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>}
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-emerald-700">Hadir</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-amber-700">Telat</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-blue-700">Izin</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-purple-700">Sakit</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-rose-700">Alpha</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-slate-700">Libur</th>
                  <th className="px-3.5 py-3 text-center font-black text-xs uppercase bg-emerald-50 text-emerald-950">Total Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rekapRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-gray-400 font-bold">
                      Tidak ada data rekapitulasi pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  rekapRows.map((r, i) => {
                    const s = r.summary || {};
                    const hadir = s.hadir ?? r.hadir ?? 0;
                    const telat = s.terlambat ?? r.terlambat ?? 0;
                    const izin = s.izin ?? r.izin ?? 0;
                    const sakit = s.sakit ?? r.sakit ?? 0;
                    const alpha = s.alpha ?? r.alpha ?? 0;
                    const libur = s.libur ?? r.libur ?? 0;
                    const totalHadir = r.total_hadir ?? (hadir + telat);

                    return (
                      <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">{i + 1}</td>
                        <td className="px-3.5 py-2.5 font-black text-gray-900">{r.nama}</td>
                        <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">
                          {category === "siswa" ? (r.nisn || r.nis || "-") : (r.nip || "-")}
                        </td>
                        {category === "siswa" && (
                          <td className="px-3.5 py-2.5 font-bold text-gray-700">{formatKelas(r.kelas) || "-"}</td>
                        )}
                        <td className="px-3.5 py-2.5 text-center font-black text-emerald-600">{hadir}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-amber-600">{telat}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-blue-600">{izin}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-purple-600">{sakit}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-rose-600">{alpha}</td>
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">{libur}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-emerald-800 bg-emerald-50/70">
                          {totalHadir}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. ROBUST PAGINATION BAR (Khusus 1 Hari saat list panjang) */}
        {isDetailView && paginationMeta && paginationMeta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t-2 border-gray-900 bg-gray-50 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                Menampilkan {(paginationMeta.current_page - 1) * perPage + 1} - {Math.min(paginationMeta.current_page * perPage, paginationMeta.total)} dari {paginationMeta.total} data
              </span>
              <span className="text-gray-400">•</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
              >
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            </div>

            {paginationMeta.last_page > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-black border-2 border-gray-900 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="px-2 text-xs font-black text-gray-800 font-mono">
                  {paginationMeta.current_page} / {paginationMeta.last_page}
                </span>
                <button
                  disabled={page >= paginationMeta.last_page}
                  onClick={() => setPage((p) => Math.min(paginationMeta.last_page, p + 1))}
                  className="px-3 py-1.5 text-xs font-black border-2 border-gray-900 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
