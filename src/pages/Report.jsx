import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TableRowSkeleton } from "../components/Skeleton";
import { useKelasFormat } from "../hooks/useKelasFormat";
import { useAttendanceSettings } from "../hooks/useAttendanceSettings";

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

export default function Report() {
  const userRole = useAppStore((state) => state.userRole);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const { formatKelas } = useKelasFormat();
  const { enableTeacherAttendance } = useAttendanceSettings();
  const { effectiveLembaga } = useEffectiveLembaga();

  const isSuperAdmin = userRole === "super_admin";

  const today = format(new Date(), "yyyy-MM-dd");
  const firstDayThisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [tab, setTab] = useState("siswa"); // siswa | guru | rekap_siswa | rekap_guru
  const [dateFrom, setDateFrom] = useState("2026-08-01");
  const [dateTo, setDateTo] = useState("2026-09-17");
  const [statusFilter, setStatusFilter] = useState("");
  const [lembagaFilter, setLembagaFilter] = useState("");
  const [kelasFilterLocal, setKelasFilterLocal] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

  const activeKelas = kelasFilterLocal || selectedKelas || "";

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
    const lastMonth = subMonths(new Date(), 1);
    setDateFrom("2026-08-01");
    setDateTo("2026-08-31");
    setPage(1);
  };

  const handlePresetAllDummy = () => {
    setDateFrom("2026-08-01");
    setDateTo("2026-09-17");
    setPage(1);
  };

  // Queries
  const { data: siswaData, isLoading: isSiswaLoading } = useQuery({
    queryKey: ["report-siswa", tab, dateFrom, dateTo, activeKelas, statusFilter, lembagaFilter, page, perPage],
    queryFn: async () => {
      const res = await api.get("/attendance/report/students", {
        params: { ...baseParams, page, per_page: perPage, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data;
    },
    enabled: tab === "siswa",
  });

  const { data: guruData, isLoading: isGuruLoading } = useQuery({
    queryKey: ["report-guru", tab, dateFrom, dateTo, statusFilter, lembagaFilter, page, perPage],
    queryFn: async () => {
      const res = await api.get("/attendance/report/teachers", {
        params: { ...baseParams, page, per_page: perPage },
      });
      return res.data;
    },
    enabled: tab === "guru",
  });

  const { data: rekapData, isLoading: isRekapLoading } = useQuery({
    queryKey: ["report-rekap-siswa", tab, dateFrom, dateTo, activeKelas, lembagaFilter],
    queryFn: async () => {
      const res = await api.get("/attendance/report/student-matrix", {
        params: { ...baseParams, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data;
    },
    enabled: tab === "rekap" || tab === "rekap_siswa",
  });

  const { data: rekapGuruData, isLoading: isRekapGuruLoading } = useQuery({
    queryKey: ["report-rekap-guru", tab, dateFrom, dateTo, lembagaFilter],
    queryFn: async () => {
      const res = await api.get("/attendance/report/teacher-summary", {
        params: baseParams,
      });
      return res.data;
    },
    enabled: tab === "rekap_guru",
  });

  const isSingleDay = dateFrom === dateTo;
  const isLoading = isSiswaLoading || isGuruLoading || isRekapLoading || isRekapGuruLoading;

  // Extract pagination meta safely from LengthAwarePaginator
  const paginationMeta = useMemo(() => {
    if (tab === "siswa") {
      return siswaData?.data?.data || null;
    }
    if (tab === "guru") {
      return guruData?.data?.data || null;
    }
    return null;
  }, [tab, siswaData, guruData]);

  // Filter rows for current page display
  const siswaRows = useMemo(() => {
    const rawData = paginationMeta?.data || siswaData?.data?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.student?.nama?.toLowerCase().includes(q) ||
      r.student?.nisn?.toLowerCase().includes(q) ||
      r.student?.kelas?.toLowerCase().includes(q)
    );
  }, [paginationMeta, siswaData, search]);

  const guruRows = useMemo(() => {
    const rawData = paginationMeta?.data || guruData?.data?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.teacher?.nama?.toLowerCase().includes(q) ||
      r.teacher?.nip?.toLowerCase().includes(q)
    );
  }, [paginationMeta, guruData, search]);

  const rekapRows = useMemo(() => {
    const rawData = rekapData?.data?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.nama?.toLowerCase().includes(q) ||
      r.nisn?.toLowerCase().includes(q) ||
      r.kelas?.toLowerCase().includes(q)
    );
  }, [rekapData, search]);

  const rekapGuruRows = useMemo(() => {
    const rawData = rekapGuruData?.data?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.nama?.toLowerCase().includes(q) ||
      r.nip?.toLowerCase().includes(q)
    );
  }, [rekapGuruData, search]);

  const summary =
    tab === "siswa"
      ? siswaData?.data?.summary
      : tab === "guru"
      ? guruData?.data?.summary
      : null;

  // Helper to fetch ALL data for complete exports
  const fetchAllExportData = async () => {
    if (tab === "siswa") {
      const res = await api.get("/attendance/report/students", {
        params: { ...baseParams, per_page: 5000, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data?.data?.data?.data || [];
    }
    if (tab === "guru") {
      const res = await api.get("/attendance/report/teachers", {
        params: { ...baseParams, per_page: 5000 },
      });
      return res.data?.data?.data?.data || [];
    }
    if (tab === "rekap_siswa" || tab === "rekap") {
      const res = await api.get("/attendance/report/student-matrix", {
        params: { ...baseParams, ...(activeKelas && { kelas: activeKelas }) },
      });
      return res.data?.data?.data || [];
    }
    if (tab === "rekap_guru") {
      const res = await api.get("/attendance/report/teacher-summary", {
        params: baseParams,
      });
      return res.data?.data?.data || [];
    }
    return [];
  };

  // EXPORT EXCEL RESMI & RAPI
  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const allRows = await fetchAllExportData();
      if (!allRows || allRows.length === 0) {
        alert("Tidak ada data untuk diekspor pada rentang tanggal ini.");
        return;
      }

      const institutionName = (isSuperAdmin && lembagaFilter ? lembagaFilter : effectiveLembaga || "MA").toUpperCase();
      let wsData = [];
      let filename = "";
      let colWidths = [];

      const kopHeader = [
        ["YAYASAN RAUDHATUL YATAMA"],
        [`MADRASAH ${institutionName === "MTS" ? "TSANAWIYAH" : "ALIYAH"} RAUDHATUL YATAMA`],
        [tab === "siswa" ? "LAPORAN PRESENSI SANTRI / SISWA" : tab === "guru" ? "LAPORAN PRESENSI DEWAN GURU" : "REKAPITULASI KEHADIRAN"],
        [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
      ];

      if (tab === "siswa") {
        filename = `Laporan_Presensi_Siswa_${institutionName}_${dateFrom}_sd_${dateTo}.xlsx`;
        wsData = [
          ...kopHeader,
          ["No", "Tanggal", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"],
          ...allRows.map((r, i) => [
            i + 1,
            formatTgl(r.attendance_date),
            r.student?.nama || "-",
            r.student?.nisn || "-",
            formatKelas(r.student?.kelas) || "-",
            (r.lembaga || institutionName).toUpperCase(),
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]),
        ];
        colWidths = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
      } else if (tab === "guru") {
        filename = `Laporan_Presensi_Guru_${institutionName}_${dateFrom}_sd_${dateTo}.xlsx`;
        wsData = [
          ...kopHeader,
          ["No", "Tanggal", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"],
          ...allRows.map((r, i) => [
            i + 1,
            formatTgl(r.attendance_date),
            r.teacher?.nama || "-",
            r.teacher?.nip || "-",
            (r.lembaga || institutionName).toUpperCase(),
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]),
        ];
        colWidths = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
      } else if (tab === "rekap_guru") {
        filename = `Rekapitulasi_Guru_${institutionName}_${dateFrom}_sd_${dateTo}.xlsx`;
        wsData = [
          ...kopHeader,
          ["No", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir", "Total Hari"],
          ...allRows.map((r, i) => [
            i + 1,
            r.nama,
            r.nip || "-",
            (r.lembaga || institutionName).toUpperCase(),
            Number(r.hadir) || 0,
            Number(r.terlambat) || 0,
            Number(r.izin) || 0,
            Number(r.sakit) || 0,
            Number(r.alpha) || 0,
            Number(r.libur) || 0,
            Number(r.total_hadir) || 0,
            Number(r.total_days) || 0,
          ]),
        ];
        colWidths = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
      } else {
        filename = `Rekapitulasi_Matriks_Siswa_${institutionName}_${dateFrom}_sd_${dateTo}.xlsx`;
        wsData = [
          ...kopHeader,
          ["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"],
          ...allRows.map((r, i) => {
            const s = r.summary || {};
            return [
              i + 1,
              r.nama,
              r.nisn || "-",
              formatKelas(r.kelas) || "-",
              (r.lembaga || institutionName).toUpperCase(),
              s.hadir ?? 0,
              s.terlambat ?? 0,
              s.izin ?? 0,
              s.sakit ?? 0,
              s.alpha ?? 0,
              s.libur ?? 0,
              r.total_hadir ?? 0,
            ];
          }),
        ];
        colWidths = [{ wch: 6 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Gagal mengekspor data ke Excel: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  // EXPORT PDF FORMAL & RESMI (KOP SURAT + TTD PENGESAHAN)
  const exportPdf = async (mode = "ringkasan") => {
    setIsExporting(true);
    try {
      const allRows = await fetchAllExportData();
      if (!allRows || allRows.length === 0) {
        alert("Tidak ada data untuk dicetak.");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const institutionName = (isSuperAdmin && lembagaFilter ? lembagaFilter : effectiveLembaga || "MA").toUpperCase();
      const institutionFull = institutionName === "MTS" ? "MADRASAH TSANAWIYAH" : "MADRASAH ALIYAH";

      const drawKopSurat = (d, title, subtitle) => {
        // Kop Surat Header
        d.setFont("helvetica", "bold");
        d.setFontSize(14);
        d.setTextColor(17, 24, 39);
        d.text("YAYASAN RAUDHATUL YATAMA", 148.5, 14, { align: "center" });

        d.setFontSize(12);
        d.setTextColor(16, 185, 129); // Primary green
        d.text(`${institutionFull} RAUDHATUL YATAMA`, 148.5, 20, { align: "center" });

        d.setFont("helvetica", "normal");
        d.setFontSize(8.5);
        d.setTextColor(75, 85, 99);
        d.text("Jl. Trans Kalimantan Km. 21, Desa Sungai Bakung, Kec. Sungai Tabuk, Kab. Banjar, Kalsel", 148.5, 25, { align: "center" });
        d.text("Website: www.raudhatulyatama.sch.id | Email: madrasah@raudhatulyatama.sch.id", 148.5, 29, { align: "center" });

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

      const drawSignatures = (d, finalY) => {
        const pageHeight = d.internal.pageSize.height;
        let startY = finalY + 12;

        // Jika ruang tanda tangan mepet ke bawah, buat halaman baru
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
        d.text("( .................................................... )", 30, startY + 26);
        d.text("NIP. -", 30, startY + 30);

        // Kanan: Kepala Madrasah
        d.text(`Banjar, ${dateStr}`, 210, startY);
        d.text(`Kepala ${institutionFull},`, 210, startY + 5);
        d.text("( .................................................... )", 210, startY + 26);
        d.text("NIP. -", 210, startY + 30);
      };

      if (mode === "harian" && (tab === "siswa" || tab === "guru")) {
        // Mode Per-Hari (1 Hari = 1 Halaman)
        const groupedByDate = {};
        allRows.forEach((r) => {
          const rawDate = r.attendance_date ? String(r.attendance_date).split("T")[0].split(" ")[0] : "Lainnya";
          if (!groupedByDate[rawDate]) groupedByDate[rawDate] = [];
          groupedByDate[rawDate].push(r);
        });

        const uniqueDates = Object.keys(groupedByDate).sort();

        uniqueDates.forEach((tgl, pageIdx) => {
          if (pageIdx > 0) doc.addPage("a4", "landscape");

          const title = tab === "siswa" ? "LAPORAN PRESENSI HARIAN SANTRI" : "LAPORAN PRESENSI HARIAN DEWAN GURU";
          const subtitle = `Hari & Tanggal: ${formatTglLengkap(tgl)} | Lembaga: ${institutionFull}`;
          drawKopSurat(doc, title, subtitle);

          const currentRows = groupedByDate[tgl] || [];
          const head = tab === "siswa"
            ? [["No", "Nama Siswa", "NISN", "Kelas", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]]
            : [["No", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Status", "Jam Masuk", "Jam Pulang", "Keterangan"]];

          const body = tab === "siswa"
            ? currentRows.map((r, i) => [
                i + 1,
                r.student?.nama || "-",
                r.student?.nisn || "-",
                formatKelas(r.student?.kelas) || "-",
                STATUS_LABELS[r.status] || r.status,
                r.check_in ? r.check_in.slice(0, 5) : "-",
                r.check_out ? r.check_out.slice(0, 5) : "-",
                r.notes || "-",
              ])
            : currentRows.map((r, i) => [
                i + 1,
                r.teacher?.nama || "-",
                r.teacher?.nip || "-",
                r.lembaga || "-",
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
            columnStyles: {
              0: { halign: "center", cellWidth: 10 },
              4: { halign: "center", fontStyle: "bold" },
              5: { halign: "center" },
              6: { halign: "center" },
            },
          });

          drawSignatures(doc, doc.lastAutoTable.finalY);

          // Footer
          const pageNum = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Dokumen Resmi Yayasan Raudhatul Yatama  •  Tanggal: ${formatTgl(tgl)}`, 14, 202);
        });

        doc.save(`Laporan_Harian_${tab}_${institutionName}_${dateFrom}_sd_${dateTo}.pdf`);
      } else {
        // Mode Ringkasan / Rekapitulasi Menyeluruh
        const title = tab === "siswa"
          ? "REKAPITULASI PRESENSI SISWA"
          : tab === "guru"
          ? "REKAPITULASI PRESENSI DEWAN GURU"
          : tab === "rekap_guru"
          ? "REKAPITULASI KEHADIRAN DEWAN GURU"
          : "REKAPITULASI MATRIKS KEHADIRAN SISWA";

        const subtitle = `Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Lembaga: ${institutionFull}`;
        drawKopSurat(doc, title, subtitle);

        let head = [];
        let body = [];

        if (tab === "siswa") {
          head = [["No", "Tanggal", "Nama Siswa", "NISN", "Kelas", "Status", "Masuk", "Pulang", "Keterangan"]];
          body = allRows.map((r, i) => [
            i + 1,
            formatTgl(r.attendance_date),
            r.student?.nama || "-",
            r.student?.nisn || "-",
            formatKelas(r.student?.kelas) || "-",
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]);
        } else if (tab === "guru") {
          head = [["No", "Tanggal", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Status", "Masuk", "Pulang", "Keterangan"]];
          body = allRows.map((r, i) => [
            i + 1,
            formatTgl(r.attendance_date),
            r.teacher?.nama || "-",
            r.teacher?.nip || "-",
            r.lembaga || "-",
            STATUS_LABELS[r.status] || r.status,
            r.check_in ? r.check_in.slice(0, 5) : "-",
            r.check_out ? r.check_out.slice(0, 5) : "-",
            r.notes || "-",
          ]);
        } else if (tab === "rekap_guru") {
          head = [["No", "Nama Guru", "NIP / NUPTK / NPK", "Lembaga", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];
          body = allRows.map((r, i) => [
            i + 1,
            r.nama,
            r.nip || "-",
            r.lembaga || "-",
            r.hadir,
            r.terlambat,
            r.izin,
            r.sakit,
            r.alpha,
            r.libur,
            r.total_hadir,
          ]);
        } else {
          head = [["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Hadir", "Telat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];
          body = allRows.map((r, i) => {
            const s = r.summary || {};
            return [
              i + 1,
              r.nama,
              r.nisn || "-",
              formatKelas(r.kelas) || "-",
              r.lembaga || "-",
              s.hadir ?? 0,
              s.terlambat ?? 0,
              s.izin ?? 0,
              s.sakit ?? 0,
              s.alpha ?? 0,
              s.libur ?? 0,
              r.total_hadir ?? 0,
            ];
          });
        }

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

        drawSignatures(doc, doc.lastAutoTable.finalY);

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Halaman ${i} dari ${totalPages}  •  Sistem Absensi Terpadu Yayasan Raudhatul Yatama`, 14, 202);
        }

        doc.save(`Laporan_Rekap_${tab}_${institutionName}_${dateFrom}_sd_${dateTo}.pdf`);
      }
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Gagal mencetak dokumen PDF: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full pb-28 md:pb-8 space-y-4 font-sans">
      {/* 1. TOP HEADER & TAB BAR */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-3 sm:p-4 shadow-neo flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border-2 border-gray-900 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {(enableTeacherAttendance
            ? [
                { id: "siswa", label: "Log Siswa", icon: "school" },
                { id: "guru", label: "Log Guru", icon: "badge" },
                { id: "rekap_siswa", label: "Matriks Siswa", icon: "table_chart" },
                { id: "rekap_guru", label: "Rekap Guru", icon: "analytics" },
              ]
            : [
                { id: "siswa", label: "Log Siswa", icon: "school" },
                { id: "rekap_siswa", label: "Matriks Siswa", icon: "table_chart" },
              ]
          ).map((t) => {
            const isTabActive = tab === t.id || (t.id === "rekap_siswa" && tab === "rekap");
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer select-none ${
                  isTabActive
                    ? "bg-primary-green text-gray-900 border-2 border-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                }`}
              >
                <span className="material-symbols-outlined text-base leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Export Excel & PDF */}
        <div className="flex items-center gap-2 justify-end flex-wrap flex-shrink-0">
          <button
            onClick={exportExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-2xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            title="Download Format Excel Lengkap"
          >
            {isExporting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-base">table_view</span>
            )}
            <span>Excel</span>
          </button>

          <button
            onClick={() => exportPdf("ringkasan")}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-2xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            title="Download PDF Rekapitulasi Resmi"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>PDF Rekap</span>
          </button>

          {!isSingleDay && (tab === "siswa" || tab === "guru") && (
            <button
              onClick={() => exportPdf("harian")}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-2xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              title="Download PDF Lengkap Harian (1 Hari = 1 Halaman)"
            >
              <span className="material-symbols-outlined text-base">layers</span>
              <span>PDF Harian</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STATISTIC SUMMARY CARDS */}
      {summary && (tab === "siswa" || tab === "guru") && (
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

      {/* 3. PERMANENT & ORGANIZED FILTER BAR */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-4 sm:p-5 shadow-neo space-y-3.5">
        {/* Quick Date Presets */}
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
              Hari Ini
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

        {/* Filter Controls Grid */}
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

          {/* Filter Status (Log Siswa / Guru) */}
          {(tab === "siswa" || tab === "guru") && (
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
          {(tab === "siswa" || tab === "rekap_siswa") && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-gray-700 uppercase">Filter Kelas</label>
              <select
                value={kelasFilterLocal}
                onChange={(e) => { setKelasFilterLocal(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Kelas</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
                <option value="IX">Kelas IX</option>
              </select>
            </div>
          )}

          {/* Lembaga (Super Admin) */}
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-black text-gray-700 uppercase">Lembaga</label>
              <select
                value={lembagaFilter}
                onChange={(e) => { setLembagaFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Lembaga</option>
                <option value="MA">Madrasah Aliyah (MA)</option>
                <option value="MTS">Madrasah Tsanawiyah (MTs)</option>
              </select>
            </div>
          )}

          {/* Search Input Box */}
          <div className={`flex flex-col gap-1 ${tab === "siswa" || tab === "rekap_siswa" ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <label className="text-[11px] font-black text-gray-700 uppercase">Cari Nama / NISN / NIP</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "guru" || tab === "rekap_guru" ? "Ketik nama guru atau NIP..." : "Ketik nama siswa atau NISN..."}
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

      {/* 4. DATA TABLE VIEW */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl shadow-neo overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800">
                <tr>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">No</th>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">Nama</th>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">Status</th>
                  <th className="px-3 py-2.5 text-center font-black text-xs uppercase">Waktu</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton cols={4} />
                <TableRowSkeleton cols={4} />
                <TableRowSkeleton cols={4} />
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {/* A. LOG SISWA TABLE */}
            {tab === "siswa" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                    <tr>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Nama Siswa</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">NISN</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Pulang</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {siswaRows.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-12 text-gray-400 font-bold">
                          Tidak ada rekaman presensi siswa pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      siswaRows.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">
                            {paginationMeta ? (paginationMeta.current_page - 1) * perPage + i + 1 : i + 1}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-xs text-gray-800 whitespace-nowrap">
                            {formatTgl(r.attendance_date)}
                          </td>
                          <td className="px-3.5 py-2.5 font-black text-gray-900">{r.student?.nama || "-"}</td>
                          <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">{r.student?.nisn || "-"}</td>
                          <td className="px-3.5 py-2.5 font-bold text-gray-700">{formatKelas(r.student?.kelas) || "-"}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[11px] font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">{r.check_in?.slice(0, 5) || "-"}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">{r.check_out?.slice(0, 5) || "-"}</td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-600 font-medium truncate max-w-[180px]">{r.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* B. LOG GURU TABLE */}
            {tab === "guru" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                    <tr>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Nama Dewan Guru</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">NIP / NPK</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide">Pulang</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {guruRows.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-gray-400 font-bold">
                          Tidak ada rekaman presensi guru pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      guruRows.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">
                            {paginationMeta ? (paginationMeta.current_page - 1) * perPage + i + 1 : i + 1}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-xs text-gray-800 whitespace-nowrap">
                            {formatTgl(r.attendance_date)}
                          </td>
                          <td className="px-3.5 py-2.5 font-black text-gray-900">{r.teacher?.nama || "-"}</td>
                          <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">{r.teacher?.nip || "-"}</td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[11px] font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">{r.check_in?.slice(0, 5) || "-"}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs text-gray-800 text-center font-bold">{r.check_out?.slice(0, 5) || "-"}</td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-600 font-medium truncate max-w-[180px]">{r.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* C. MATRIKS SISWA TABLE */}
            {(tab === "rekap" || tab === "rekap_siswa") && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                    <tr>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Nama Siswa</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">NISN</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
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
                          Tidak ada data matriks siswa.
                        </td>
                      </tr>
                    ) : (
                      rekapRows.map((r, i) => {
                        const s = r.summary || {};
                        return (
                          <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">{i + 1}</td>
                            <td className="px-3.5 py-2.5 font-black text-gray-900">{r.nama}</td>
                            <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">{r.nisn || "-"}</td>
                            <td className="px-3.5 py-2.5 font-bold text-gray-700">{formatKelas(r.kelas) || "-"}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-emerald-600">{s.hadir ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-amber-600">{s.terlambat ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-blue-600">{s.izin ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-purple-600">{s.sakit ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-rose-600">{s.alpha ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">{s.libur ?? 0}</td>
                            <td className="px-3.5 py-2.5 text-center font-black text-emerald-800 bg-emerald-50/70">
                              {r.total_hadir ?? 0}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* D. REKAP GURU TABLE */}
            {tab === "rekap_guru" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                    <tr>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase tracking-wide w-12">No</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">Nama Dewan Guru</th>
                      <th className="px-3.5 py-3 text-left font-black text-xs uppercase tracking-wide">NIP / NPK</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-emerald-700">Hadir</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-amber-700">Telat</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-blue-700">Izin</th>
                      <th className="px-3.5 py-3 text-center font-black text-purple-700">Sakit</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-rose-700">Alpha</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase text-slate-700">Libur</th>
                      <th className="px-3.5 py-3 text-center font-black text-xs uppercase bg-emerald-50 text-emerald-950">Total Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rekapGuruRows.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-12 text-gray-400 font-bold">
                          Tidak ada data rekapitulasi guru.
                        </td>
                      </tr>
                    ) : (
                      rekapGuruRows.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3.5 py-2.5 text-center font-bold text-xs text-gray-500">{i + 1}</td>
                          <td className="px-3.5 py-2.5 font-black text-gray-900">{r.nama}</td>
                          <td className="px-3.5 py-2.5 text-gray-600 font-mono text-xs">{r.nip || "-"}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-emerald-600">{r.hadir}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-amber-600">{r.terlambat}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-blue-600">{r.izin}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-purple-600">{r.sakit}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-rose-600">{r.alpha}</td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">{r.libur}</td>
                          <td className="px-3.5 py-2.5 text-center font-black text-emerald-800 bg-emerald-50/70">
                            {r.total_hadir}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* 5. ROBUST PAGINATION BAR (Dukungan Halaman Penuh) */}
        {(tab === "siswa" || tab === "guru") && paginationMeta && paginationMeta.total > 0 && (
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
