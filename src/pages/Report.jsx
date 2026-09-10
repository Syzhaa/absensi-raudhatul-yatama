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

const STATUS_LABELS = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Alpha",
  libur: "Libur",
};

const STATUS_COLORS = {
  hadir: "bg-green-100 text-green-800 border-green-300",
  terlambat: "bg-amber-100 text-amber-800 border-amber-300",
  izin: "bg-blue-100 text-blue-800 border-blue-300",
  sakit: "bg-orange-100 text-orange-800 border-orange-300",
  alpha: "bg-red-100 text-red-800 border-red-300",
  libur: "bg-gray-100 text-gray-800 border-gray-300",
};

export default function Report() {
  const userRole = useAppStore((state) => state.userRole);
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const { formatKelas } = useKelasFormat();
  const { enableTeacherAttendance } = useAttendanceSettings();
  const { effectiveLembaga } = useEffectiveLembaga();

  const isSuperAdmin = userRole === "super_admin";

  const today = format(new Date(), "yyyy-MM-dd");

  const [tab, setTab] = useState("siswa"); // siswa | guru | rekap_siswa | rekap_guru
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");
  const [lembagaFilter, setLembagaFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilterCollapse, setShowFilterCollapse] = useState(false);

  const baseParams = {
    date_from: dateFrom,
    date_to: dateTo,
    ...(statusFilter && { status: statusFilter }),
    ...(isSuperAdmin && lembagaFilter && { lembaga: lembagaFilter }),
    ...(!isSuperAdmin && effectiveLembaga && { lembaga: effectiveLembaga }),
  };

  // Queries
  const { data: siswaData, isLoading: isSiswaLoading } = useQuery({
    queryKey: ["report-siswa", tab, dateFrom, dateTo, selectedKelas, statusFilter, lembagaFilter, page],
    queryFn: async () => {
      const res = await api.get("/attendance/report/students", {
        params: { ...baseParams, page, per_page: 25, ...(selectedKelas && { kelas: selectedKelas }) },
      });
      return res.data;
    },
    enabled: tab === "siswa",
  });

  const { data: guruData, isLoading: isGuruLoading } = useQuery({
    queryKey: ["report-guru", tab, dateFrom, dateTo, statusFilter, lembagaFilter, page],
    queryFn: async () => {
      const res = await api.get("/attendance/report/teachers", {
        params: { ...baseParams, page, per_page: 25 },
      });
      return res.data;
    },
    enabled: tab === "guru",
  });

  const { data: rekapData, isLoading: isRekapLoading } = useQuery({
    queryKey: ["report-rekap-siswa", tab, dateFrom, dateTo, selectedKelas, lembagaFilter],
    queryFn: async () => {
      const res = await api.get("/attendance/report/student-matrix", {
        params: { ...baseParams, ...(selectedKelas && { kelas: selectedKelas }) },
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

  // Filter rows by search term
  const siswaRows = useMemo(() => {
    const rawData = siswaData?.data?.data || siswaData?.data || [];
    const rows = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.student?.nama?.toLowerCase().includes(q) ||
      r.student?.nisn?.toLowerCase().includes(q) ||
      r.student?.kelas?.toLowerCase().includes(q)
    );
  }, [siswaData, search]);

  const guruRows = useMemo(() => {
    const rawData = guruData?.data?.data || guruData?.data || [];
    const rows = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.teacher?.nama?.toLowerCase().includes(q) ||
      r.teacher?.nip?.toLowerCase().includes(q)
    );
  }, [guruData, search]);

  const rekapRows = useMemo(() => {
    const rawData = rekapData?.data?.data || rekapData?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.nama?.toLowerCase().includes(q) ||
      r.nisn?.toLowerCase().includes(q) ||
      r.kelas?.toLowerCase().includes(q)
    );
  }, [rekapData, search]);

  const rekapGuruRows = useMemo(() => {
    const rawData = rekapGuruData?.data?.data || rekapGuruData?.data || [];
    const rows = Array.isArray(rawData) ? rawData : [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.nama?.toLowerCase().includes(q) ||
      r.nip?.toLowerCase().includes(q)
    );
  }, [rekapGuruData, search]);

  const summary =
    tab === "siswa"
      ? (siswaData?.data?.summary || siswaData?.summary)
      : tab === "guru"
      ? (guruData?.data?.summary || guruData?.summary)
      : null;

  // Modern Export Excel (Clean styling with auto-width)
  const exportExcel = () => {
    let wsData = [];
    let filename = "";
    let colWidths = [];

    const institutionName = (isSuperAdmin && lembagaFilter ? lembagaFilter : effectiveLembaga || "YATAMA").toUpperCase();
    const headerTitle = tab === "siswa" 
      ? `LAPORAN ABSENSI SISWA - ${institutionName}`
      : tab === "guru"
      ? `LAPORAN ABSENSI GURU - ${institutionName}`
      : tab === "rekap_guru"
      ? `REKAPITULASI ABSENSI GURU - ${institutionName}`
      : `REKAPITULASI ABSENSI SISWA - ${institutionName}`;

    if (tab === "siswa") {
      filename = `Laporan_Absensi_Siswa_${dateFrom}_sd_${dateTo}.xlsx`;
      wsData = [
        [headerTitle],
        [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
        ["No", "Tanggal", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Status", "Jam Masuk", "Jam Pulang"],
        ...siswaRows.map((r, i) => [
          i + 1,
          formatTgl(r.attendance_date),
          r.student?.nama || "-",
          r.student?.nisn || "-",
          formatKelas(r.student?.kelas) || "-",
          r.lembaga || "-",
          STATUS_LABELS[r.status] || r.status,
          r.check_in ? r.check_in.slice(0, 5) : "-",
          r.check_out ? r.check_out.slice(0, 5) : "-",
        ]),
      ];
      colWidths = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    } else if (tab === "guru") {
      filename = `Laporan_Absensi_Guru_${dateFrom}_sd_${dateTo}.xlsx`;
      wsData = [
        [headerTitle],
        [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
        ["No", "Tanggal", "Nama Guru", "NIP", "Lembaga", "Status", "Jam Masuk", "Jam Pulang"],
        ...guruRows.map((r, i) => [
          i + 1,
          formatTgl(r.attendance_date),
          r.teacher?.nama || "-",
          r.teacher?.nip || "-",
          r.lembaga || "-",
          STATUS_LABELS[r.status] || r.status,
          r.check_in ? r.check_in.slice(0, 5) : "-",
          r.check_out ? r.check_out.slice(0, 5) : "-",
        ]),
      ];
      colWidths = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    } else if (tab === "rekap_guru") {
      filename = `Rekap_Absensi_Guru_${dateFrom}_sd_${dateTo}.xlsx`;
      wsData = [
        [headerTitle],
        [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
        ["No", "Nama Guru", "NIP", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"],
        ...rekapGuruRows.map((r, i) => [
          i + 1,
          r.nama,
          r.nip || "-",
          r.lembaga || "-",
          Number(r.hadir) || 0,
          Number(r.terlambat) || 0,
          Number(r.izin) || 0,
          Number(r.sakit) || 0,
          Number(r.alpha) || 0,
          Number(r.libur) || 0,
          Number(r.total_hadir) || 0,
        ]),
      ];
      colWidths = [{ wch: 6 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    } else {
      filename = `Rekap_Absensi_Siswa_${dateFrom}_sd_${dateTo}.xlsx`;
      wsData = [
        [headerTitle],
        [`Periode: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)} | Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
        [],
        ["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"],
        ...rekapRows.map((r, i) => {
          const s = r.summary || {};
          return [
            i + 1,
            r.nama,
            r.nisn || r.nis || "-",
            formatKelas(r.kelas) || "-",
            r.lembaga || "-",
            Number(s.hadir ?? r.hadir) || 0,
            Number(s.terlambat ?? r.terlambat) || 0,
            Number(s.izin ?? r.izin) || 0,
            Number(s.sakit ?? r.sakit) || 0,
            Number(s.alpha ?? r.alpha) || 0,
            Number(s.libur ?? r.libur) || 0,
            Number(r.total_hadir) || 0,
          ];
        }),
      ];
      colWidths = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");
    XLSX.writeFile(wb, filename);
  };

  // Modern Export PDF:
  // - Mode "ringkasan": tabel rekap seperti Excel / tampilan layar
  // - Mode "harian": loop per-tanggal (contoh rentang 10 hari = 10 halaman terpisah per hari)
  const exportPdf = (mode = "ringkasan") => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const institution = (isSuperAdmin && lembagaFilter ? lembagaFilter : effectiveLembaga || "YATAMA").toUpperCase();

    if (mode === "harian" && (tab === "siswa" || tab === "guru")) {
      // Kelompokkan data per tanggal unik
      const rows = tab === "siswa" ? siswaRows : guruRows;
      const groupedByDate = {};
      rows.forEach((r) => {
        const rawDate = r.attendance_date ? String(r.attendance_date).split("T")[0].split(" ")[0] : "Lainnya";
        if (!groupedByDate[rawDate]) groupedByDate[rawDate] = [];
        groupedByDate[rawDate].push(r);
      });

      const uniqueDates = Object.keys(groupedByDate).sort();

      if (uniqueDates.length === 0) {
        alert("Tidak ada data untuk dicetak.");
        return;
      }

      uniqueDates.forEach((tgl, pageIdx) => {
        if (pageIdx > 0) doc.addPage("a4", "landscape");

        // Header per halaman
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text(`YAYASAN RAUDHATUL YATAMA - LEMBAGA ${institution}`, 14, 15);

        doc.setFontSize(11);
        doc.text(tab === "siswa" ? `LAPORAN HARIAN SISWA - TANGGAL: ${formatTgl(tgl)}` : `LAPORAN HARIAN GURU - TANGGAL: ${formatTgl(tgl)}`, 14, 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, 14, 26);

        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.6);
        doc.line(14, 29, 283, 29);

        const currentRows = groupedByDate[tgl] || [];
        const head = tab === "siswa"
          ? [["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Status", "Masuk", "Pulang"]]
          : [["No", "Nama Guru", "NIP", "Lembaga", "Status", "Masuk", "Pulang"]];

        const body = tab === "siswa"
          ? currentRows.map((r, i) => [
              i + 1,
              r.student?.nama || "-",
              r.student?.nisn || "-",
              formatKelas(r.student?.kelas) || "-",
              r.lembaga || "-",
              STATUS_LABELS[r.status] || r.status,
              r.check_in ? r.check_in.slice(0, 5) : "-",
              r.check_out ? r.check_out.slice(0, 5) : "-",
            ])
          : currentRows.map((r, i) => [
              i + 1,
              r.teacher?.nama || "-",
              r.teacher?.nip || "-",
              r.lembaga || "-",
              STATUS_LABELS[r.status] || r.status,
              r.check_in ? r.check_in.slice(0, 5) : "-",
              r.check_out ? r.check_out.slice(0, 5) : "-",
            ]);

        autoTable(doc, {
          startY: 33,
          head,
          body,
          theme: "grid",
          styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Halaman ${pageIdx + 1} dari ${uniqueDates.length}  —  Laporan Absensi Raudhatul Yatama (${formatTgl(tgl)})`, 14, 202);
      });

      doc.save(`Laporan_${tab}_Per_Hari_${dateFrom}_sd_${dateTo}.pdf`);
      return;
    }

    // Default mode: Ringkasan / Rekapitulasi
    const titleText = tab === "siswa"
      ? (isSingleDay ? `LAPORAN HARIAN SISWA (${formatTgl(dateFrom)})` : `REKAPITULASI KEHADIRAN SISWA (${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)})`)
      : tab === "guru"
      ? (isSingleDay ? `LAPORAN HARIAN GURU (${formatTgl(dateFrom)})` : `REKAPITULASI KEHADIRAN GURU (${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)})`)
      : tab === "rekap_guru"
      ? `REKAPITULASI KEHADIRAN GURU (${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)})`
      : `REKAPITULASI KEHADIRAN SISWA (${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)})`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`YAYASAN RAUDHATUL YATAMA - LEMBAGA ${institution}`, 14, 15);

    doc.setFontSize(11);
    doc.text(titleText, 14, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Rentang Tanggal: ${formatTgl(dateFrom)} s/d ${formatTgl(dateTo)}   |   Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, 14, 26);

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.line(14, 29, 283, 29);

    let head = [];
    let body = [];

    if (isSingleDay && tab === "siswa") {
      head = [["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Status", "Masuk", "Pulang"]];
      body = siswaRows.map((r, i) => [
        i + 1,
        r.student?.nama || "-",
        r.student?.nisn || "-",
        formatKelas(r.student?.kelas) || "-",
        r.lembaga || "-",
        STATUS_LABELS[r.status] || r.status,
        r.check_in ? r.check_in.slice(0, 5) : "-",
        r.check_out ? r.check_out.slice(0, 5) : "-",
      ]);
    } else if (isSingleDay && tab === "guru") {
      head = [["No", "Nama Guru", "NIP", "Lembaga", "Status", "Masuk", "Pulang"]];
      body = guruRows.map((r, i) => [
        i + 1,
        r.teacher?.nama || "-",
        r.teacher?.nip || "-",
        r.lembaga || "-",
        STATUS_LABELS[r.status] || r.status,
        r.check_in ? r.check_in.slice(0, 5) : "-",
        r.check_out ? r.check_out.slice(0, 5) : "-",
      ]);
    } else if (tab === "rekap_guru" || (!isSingleDay && tab === "guru")) {
      head = [["No", "Nama Guru", "NIP", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];
      body = rekapGuruRows.map((r, i) => [
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
      head = [["No", "Nama Siswa", "NISN", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"]];
      body = rekapRows.map((r, i) => {
        const s = r.summary || {};
        return [
          i + 1,
          r.nama,
          r.nisn || r.nis || "-",
          formatKelas(r.kelas) || "-",
          r.lembaga || "-",
          s.hadir ?? r.hadir ?? 0,
          s.terlambat ?? r.terlambat ?? 0,
          s.izin ?? r.izin ?? 0,
          s.sakit ?? r.sakit ?? 0,
          s.alpha ?? r.alpha ?? 0,
          s.libur ?? r.libur ?? 0,
          r.total_hadir ?? 0,
        ];
      });
    }

    autoTable(doc, {
      startY: 33,
      head,
      body,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", lineWidth: 0.3, lineColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { halign: "center", cellWidth: 10 } },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${i} dari ${pageCount}  —  Sistem Absensi Terpadu Raudhatul Yatama`, 14, 202);
    }

    doc.save(`Laporan_${tab}_${dateFrom}_sd_${dateTo}.pdf`);
  };

  const paginationMeta = tab === "siswa"
    ? (siswaData?.data?.data ? siswaData?.data : null)
    : tab === "guru"
    ? (guruData?.data?.data ? guruData?.data : null)
    : null;

  return (
    <div className="w-full pb-28 md:pb-8 space-y-3.5">
      {/* 1. TOP BAR: Modern Tab Navigation & Export Actions */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-2.5 sm:p-3 shadow-neo flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Tab Buttons Pill */}
        <div className="flex bg-gray-100 p-1 rounded-xl border-2 border-gray-300 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {(enableTeacherAttendance
            ? [
                { id: "siswa", label: "Log Siswa", icon: "school" },
                { id: "guru", label: "Log Guru", icon: "badge" },
                { id: "rekap_siswa", label: "Rekap Siswa", icon: "table_chart" },
                { id: "rekap_guru", label: "Rekap Guru", icon: "analytics" },
              ]
            : [
                { id: "siswa", label: "Log Siswa", icon: "school" },
                { id: "rekap_siswa", label: "Rekap Siswa", icon: "table_chart" },
              ]
          ).map((t) => {
            const isTabActive = tab === t.id || (t.id === "rekap_siswa" && tab === "rekap");
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
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

        {/* Quick Action: Export Excel & PDF */}
        <div className="flex items-center gap-1.5 justify-end flex-shrink-0">
          <button
            onClick={exportExcel}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer"
            title="Download Format Excel"
          >
            <span className="material-symbols-outlined text-base">table_view</span>
            <span>Excel</span>
          </button>

          {/* PDF Rekapitulasi */}
          <button
            onClick={() => exportPdf("ringkasan")}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer"
            title="Download Dokumen PDF (Rekap / Ringkasan)"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>PDF Rekap</span>
          </button>

          {/* PDF Per-Tanggal (Hanya saat rentang tanggal lebih dari 1 hari) */}
          {!isSingleDay && (tab === "siswa" || tab === "guru") && (
            <button
              onClick={() => exportPdf("harian")}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm border-2 border-gray-900 rounded-xl shadow-sm hover:shadow-neo active:translate-y-0.5 transition-all cursor-pointer"
              title="Download PDF Detail Harian (1 Hari = 1 Halaman Lengkap)"
            >
              <span className="material-symbols-outlined text-base">layers</span>
              <span>PDF Harian</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. COMPACT SEARCH & SMART FILTER BAR */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3 sm:p-3.5 shadow-neo space-y-2.5">
        {/* Row 1: Search Box Utama + Tombol Toggle Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "guru" || tab === "rekap_guru"
                  ? "Cari nama guru atau NIP..."
                  : "Cari nama siswa, NISN, atau kelas..."
              }
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs md:text-sm text-gray-900 focus:outline-none transition-all shadow-inner"
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

          <button
            type="button"
            onClick={() => setShowFilterCollapse(!showFilterCollapse)}
            className={`flex items-center gap-1.5 px-3 py-2 border-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
              showFilterCollapse || dateFrom !== firstDay || dateTo !== today || statusFilter || lembagaFilter
                ? "bg-amber-100 border-gray-900 text-gray-900 shadow-sm"
                : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span className="hidden sm:inline">Filter Tanggal</span>
            {(dateFrom !== firstDay || dateTo !== today || statusFilter || lembagaFilter) && (
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
            )}
            <span className="material-symbols-outlined text-sm">
              {showFilterCollapse ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

        {/* Row 2: Collapsible Filter Menu (Compact Grid tanpa perlu scroll jauh ke atas) */}
        {(showFilterCollapse || !search) && (
          <div className="pt-2 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 animate-fade-in">
            {/* Dari Tanggal */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-600 uppercase">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-none"
              />
            </div>

            {/* Sampai Tanggal */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-600 uppercase">Sampai Tanggal</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-none"
              />
            </div>

            {/* Status Dropdown (Hanya di log harian) */}
            {tab !== "rekap" && tab !== "rekap_siswa" && tab !== "rekap_guru" && (
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-gray-600 uppercase">Filter Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lembaga (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-gray-600 uppercase">Lembaga</label>
                <select
                  value={lembagaFilter}
                  onChange={(e) => { setLembagaFilter(e.target.value); setPage(1); }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Lembaga</option>
                  <option value="MA">MA</option>
                  <option value="MTs">MTs</option>
                </select>
              </div>
            )}

            {/* Reset Filter Button */}
            {(dateFrom !== firstDay || dateTo !== today || statusFilter || lembagaFilter) && (
              <div className="flex items-end col-span-2 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom(firstDay);
                    setDateTo(today);
                    setStatusFilter("");
                    setLembagaFilter("");
                    setPage(1);
                  }}
                  className="w-full py-1.5 px-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs border border-gray-400 flex items-center justify-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. COMPACT SUMMARY CARDS (Hemat Tempat di Layar Mobile) */}
      {summary && (tab === "siswa" || tab === "guru") && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-green-600 leading-tight block">{summary.hadir || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Hadir</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-amber-600 leading-tight block">{summary.terlambat || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Terlambat</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-blue-600 leading-tight block">{summary.izin || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Izin</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-orange-600 leading-tight block">{summary.sakit || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Sakit</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-red-600 leading-tight block">{summary.alpha || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Alpha</span>
          </div>
          <div className="bg-white border-2 border-gray-900 rounded-xl p-2 shadow-sm text-center">
            <span className="text-lg sm:text-xl font-black text-gray-600 leading-tight block">{summary.libur || 0}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Libur</span>
          </div>
        </div>
      )}

      {/* 4. DATA TABLE */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800">
                <tr>
                  <th className="px-3 py-2.5 text-left font-black text-xs uppercase">Data</th>
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
                      {!isSingleDay && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>}
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Nama Siswa</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">NISN</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
                      {isSuperAdmin && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase tracking-wide">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaRows.length === 0 ? (
                      <tr><td colSpan={isSingleDay ? "7" : "8"} className="text-center py-10 text-gray-400 font-bold">Tidak ada data siswa ditemukan</td></tr>
                    ) : siswaRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                        {!isSingleDay && <td className="px-3.5 py-2 font-bold text-xs text-gray-800 whitespace-nowrap">{formatTgl(r.attendance_date)}</td>}
                        <td className="px-3.5 py-2 font-bold text-gray-900">{r.student?.nama || "-"}</td>
                        <td className="px-3.5 py-2 text-gray-600 font-mono text-xs">{r.student?.nisn || "-"}</td>
                        <td className="px-3.5 py-2 font-bold text-gray-700">{formatKelas(r.student?.kelas) || "-"}</td>
                        {isSuperAdmin && <td className="px-3.5 py-2 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-3.5 py-2">
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 font-mono text-xs text-gray-700 text-center">{r.check_in?.slice(0, 5) || "-"}</td>
                        <td className="px-3.5 py-2 font-mono text-xs text-gray-700 text-center">{r.check_out?.slice(0, 5) || "-"}</td>
                      </tr>
                    ))}
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
                      {!isSingleDay && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>}
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Nama Guru</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">NIP</th>
                      {isSuperAdmin && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase tracking-wide">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guruRows.length === 0 ? (
                      <tr><td colSpan={isSingleDay ? "6" : "7"} className="text-center py-10 text-gray-400 font-bold">Tidak ada data guru ditemukan</td></tr>
                    ) : guruRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                        {!isSingleDay && <td className="px-3.5 py-2 font-bold text-xs text-gray-800 whitespace-nowrap">{formatTgl(r.attendance_date)}</td>}
                        <td className="px-3.5 py-2 font-bold text-gray-900">{r.teacher?.nama || "-"}</td>
                        <td className="px-3.5 py-2 text-gray-600 font-mono text-xs">{r.teacher?.nip || "-"}</td>
                        {isSuperAdmin && <td className="px-3.5 py-2 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-3.5 py-2">
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 font-mono text-xs text-gray-700 text-center">{r.check_in?.slice(0, 5) || "-"}</td>
                        <td className="px-3.5 py-2 font-mono text-xs text-gray-700 text-center">{r.check_out?.slice(0, 5) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* C. REKAP SISWA TABLE */}
            {(tab === "rekap" || tab === "rekap_siswa") && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 select-none">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Nama Siswa</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">NISN</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
                      {isSuperAdmin && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-green-700">Hadir</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-amber-700">Telat</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-blue-700">Izin</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-orange-700">Sakit</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-red-700">Alpha</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-gray-700">Libur</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapRows.length === 0 ? (
                      <tr><td colSpan="11" className="text-center py-10 text-gray-400 font-bold">Tidak ada data rekap</td></tr>
                    ) : rekapRows.map((r, i) => {
                      const s = r.summary || {};
                      return (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                          <td className="px-3.5 py-2 font-bold text-gray-900">{r.nama}</td>
                          <td className="px-3.5 py-2 text-gray-600 font-mono text-xs">{r.nisn || r.nis || "-"}</td>
                          <td className="px-3.5 py-2 font-bold text-gray-700">{formatKelas(r.kelas) || "-"}</td>
                          {isSuperAdmin && <td className="px-3.5 py-2 text-gray-600 text-xs">{r.lembaga}</td>}
                          <td className="px-3.5 py-2 text-center font-black text-green-600">{s.hadir ?? r.hadir ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-amber-600">{s.terlambat ?? r.terlambat ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-blue-600">{s.izin ?? r.izin ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-orange-600">{s.sakit ?? r.sakit ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-red-600">{s.alpha ?? r.alpha ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-gray-500">{s.libur ?? r.libur ?? 0}</td>
                          <td className="px-3.5 py-2 text-center font-black text-gray-900">{r.total_hadir ?? 0}</td>
                        </tr>
                      );
                    })}
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
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Nama Guru</th>
                      <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">NIP</th>
                      {isSuperAdmin && <th className="px-3.5 py-2.5 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-green-700">Hadir</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-amber-700">Telat</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-blue-700">Izin</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-orange-700">Sakit</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-red-700">Alpha</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase text-gray-700">Libur</th>
                      <th className="px-3.5 py-2.5 text-center font-black text-xs uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapGuruRows.length === 0 ? (
                      <tr><td colSpan={isSuperAdmin ? "10" : "9"} className="text-center py-10 text-gray-400 font-bold">Tidak ada data rekap guru</td></tr>
                    ) : rekapGuruRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                        <td className="px-3.5 py-2 font-bold text-gray-900">{r.nama}</td>
                        <td className="px-3.5 py-2 text-gray-600 font-mono text-xs">{r.nip || "-"}</td>
                        {isSuperAdmin && <td className="px-3.5 py-2 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-3.5 py-2 text-center font-black text-green-600">{r.hadir}</td>
                        <td className="px-3.5 py-2 text-center font-black text-amber-600">{r.terlambat}</td>
                        <td className="px-3.5 py-2 text-center font-black text-blue-600">{r.izin}</td>
                        <td className="px-3.5 py-2 text-center font-black text-orange-600">{r.sakit}</td>
                        <td className="px-3.5 py-2 text-center font-black text-red-600">{r.alpha}</td>
                        <td className="px-3.5 py-2 text-center font-black text-gray-500">{r.libur}</td>
                        <td className="px-3.5 py-2 text-center font-black text-gray-900">{r.total_hadir}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Pagination Bar */}
        {(tab === "siswa" || tab === "guru") && paginationMeta && paginationMeta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-900 bg-gray-50">
            <span className="text-xs font-bold text-gray-600">
              Halaman {paginationMeta.current_page} dari {paginationMeta.last_page} ({paginationMeta.total} data)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-xs font-bold border-2 border-gray-900 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-100 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= paginationMeta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 text-xs font-bold border-2 border-gray-900 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-100 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
