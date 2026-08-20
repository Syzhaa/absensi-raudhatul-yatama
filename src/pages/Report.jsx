import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import api from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function SummaryCard({ label, value, color }) {
  return (
    <div className={`bg-white border-2 border-gray-900 rounded-xl p-3 shadow-neo-sm flex flex-col items-center gap-1`}>
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function Report() {
  const userRole = useAppStore((s) => s.userRole);
  const { effectiveLembaga } = useEffectiveLembaga();

  const today = format(new Date(), "yyyy-MM-dd");
  const firstDay = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [tab, setTab] = useState("siswa"); // siswa | guru | rekap
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [kelasFilter, setKelasFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lembagaFilter, setLembagaFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const isGuru = userRole === "guru";
  const isSuperAdmin = userRole === "super_admin";

  // Params builder
  const buildParams = () => ({
    date_from: dateFrom,
    date_to: dateTo,
    per_page: perPage,
    page,
    ...(kelasFilter && { kelas: kelasFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...((isSuperAdmin && lembagaFilter) && { lembaga: lembagaFilter }),
    ...(!isSuperAdmin && effectiveLembaga && { lembaga: effectiveLembaga }),
  });

  // Fetch laporan siswa
  const { data: siswaData, isLoading: siswaLoading } = useQuery({
    queryKey: ["report-siswa", tab, dateFrom, dateTo, kelasFilter, statusFilter, lembagaFilter, page],
    queryFn: () => api.get("/attendance/report/students", { params: buildParams() }).then(r => r.data.data),
    enabled: tab === "siswa",
  });

  // Fetch laporan guru
  const { data: guruData, isLoading: guruLoading } = useQuery({
    queryKey: ["report-guru", tab, dateFrom, dateTo, statusFilter, lembagaFilter, page],
    queryFn: () => api.get("/attendance/report/teachers", { params: {
      date_from: dateFrom,
      date_to: dateTo,
      per_page: perPage,
      page,
      ...(statusFilter && { status: statusFilter }),
      ...((isSuperAdmin && lembagaFilter) && { lembaga: lembagaFilter }),
      ...(!isSuperAdmin && effectiveLembaga && { lembaga: effectiveLembaga }),
    }}).then(r => r.data.data),
    enabled: tab === "guru",
  });

  // Fetch rekap per siswa
  const { data: rekapData, isLoading: rekapLoading } = useQuery({
    queryKey: ["report-rekap", tab, dateFrom, dateTo, kelasFilter, lembagaFilter],
    queryFn: () => api.get("/attendance/report/student-summary", { params: {
      date_from: dateFrom,
      date_to: dateTo,
      ...(kelasFilter && { kelas: kelasFilter }),
      ...((isSuperAdmin && lembagaFilter) && { lembaga: lembagaFilter }),
      ...(!isSuperAdmin && effectiveLembaga && { lembaga: effectiveLembaga }),
    }}).then(r => r.data.data),
    enabled: tab === "rekap",
  });

  const isLoading = siswaLoading || guruLoading || rekapLoading;

  // Filter search client-side
  const siswaRows = useMemo(() => {
    const rows = siswaData?.data?.data || [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.student?.nama?.toLowerCase().includes(q) ||
      r.student?.nis?.toLowerCase().includes(q) ||
      r.student?.kelas?.toLowerCase().includes(q)
    );
  }, [siswaData, search]);

  const guruRows = useMemo(() => {
    const rows = guruData?.data?.data || [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.teacher?.nama?.toLowerCase().includes(q) ||
      r.teacher?.nip?.toLowerCase().includes(q)
    );
  }, [guruData, search]);

  const rekapRows = useMemo(() => {
    const rows = rekapData?.data || [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.nama?.toLowerCase().includes(q) ||
      r.nis?.toLowerCase().includes(q) ||
      r.kelas?.toLowerCase().includes(q)
    );
  }, [rekapData, search]);

  const summary = tab === "siswa" ? siswaData?.summary : guruData?.summary;

  // Export Excel
  const exportExcel = () => {
    let wsData = [];
    let filename = "";

    if (tab === "siswa") {
      filename = `laporan-siswa-${dateFrom}-${dateTo}.xlsx`;
      wsData = [
        ["Tanggal", "Nama", "NIS", "Kelas", "Lembaga", "Status", "Check In", "Check Out"],
        ...siswaRows.map(r => [
          r.attendance_date,
          r.student?.nama || "-",
          r.student?.nis || "-",
          r.student?.kelas || "-",
          r.lembaga,
          STATUS_LABELS[r.status] || r.status,
          r.check_in || "-",
          r.check_out || "-",
        ]),
      ];
    } else if (tab === "guru") {
      filename = `laporan-guru-${dateFrom}-${dateTo}.xlsx`;
      wsData = [
        ["Tanggal", "Nama", "NIP", "Lembaga", "Status", "Check In", "Check Out"],
        ...guruRows.map(r => [
          r.attendance_date,
          r.teacher?.nama || "-",
          r.teacher?.nip || "-",
          r.lembaga,
          STATUS_LABELS[r.status] || r.status,
          r.check_in || "-",
          r.check_out || "-",
        ]),
      ];
    } else {
      filename = `rekap-siswa-${dateFrom}-${dateTo}.xlsx`;
      wsData = [
        ["Nama", "NIS", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total Hadir"],
        ...rekapRows.map(r => [
          r.nama, r.nis, r.kelas, r.lembaga,
          r.hadir, r.terlambat, r.izin, r.sakit, r.alpha, r.libur, r.total_hadir,
        ]),
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, filename);
  };

  // Export PDF
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const title = tab === "siswa"
      ? `Laporan Absensi Siswa (${dateFrom} s/d ${dateTo})`
      : tab === "guru"
      ? `Laporan Absensi Guru (${dateFrom} s/d ${dateTo})`
      : `Rekap Absensi Siswa (${dateFrom} s/d ${dateTo})`;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 23);

    let head = [];
    let body = [];

    if (tab === "siswa") {
      head = [["No", "Tanggal", "Nama", "NIS", "Kelas", "Lembaga", "Status", "Masuk", "Pulang"]];
      body = siswaRows.map((r, i) => [
        i + 1,
        r.attendance_date,
        r.student?.nama || "-",
        r.student?.nis || "-",
        r.student?.kelas || "-",
        r.lembaga,
        STATUS_LABELS[r.status] || r.status,
        r.check_in?.slice(0, 5) || "-",
        r.check_out?.slice(0, 5) || "-",
      ]);
    } else if (tab === "guru") {
      head = [["No", "Tanggal", "Nama", "NIP", "Lembaga", "Status", "Masuk", "Pulang"]];
      body = guruRows.map((r, i) => [
        i + 1,
        r.attendance_date,
        r.teacher?.nama || "-",
        r.teacher?.nip || "-",
        r.lembaga,
        STATUS_LABELS[r.status] || r.status,
        r.check_in?.slice(0, 5) || "-",
        r.check_out?.slice(0, 5) || "-",
      ]);
    } else {
      head = [["No", "Nama", "NIS", "Kelas", "Lembaga", "Hadir", "Terlambat", "Izin", "Sakit", "Alpha", "Libur", "Total"]];
      body = rekapRows.map((r, i) => [
        i + 1, r.nama, r.nis, r.kelas, r.lembaga,
        r.hadir, r.terlambat, r.izin, r.sakit, r.alpha, r.libur, r.total_hadir,
      ]);
    }

    autoTable(doc, {
      startY: 28,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`laporan-${tab}-${dateFrom}-${dateTo}.pdf`);
  };

  const paginationMeta = tab === "siswa"
    ? siswaData?.data
    : tab === "guru"
    ? guruData?.data
    : null;

  return (
    <div className="w-full pb-28 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Laporan Absensi</h1>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">Filter, lihat, dan export data kehadiran</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs border-2 border-gray-900 rounded-xl shadow-neo-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">table_view</span>
            Excel
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs border-2 border-gray-900 rounded-xl shadow-neo-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            PDF
          </button>
        </div>
      </div>

      {/* Tab */}
      {!isGuru && (
        <div className="flex gap-2 bg-gray-100 border-2 border-gray-900 rounded-xl p-1 w-fit">
          {["siswa", "guru", "rekap"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); setSearch(""); }}
              className={`px-4 py-2 rounded-lg font-black text-sm capitalize transition-all ${
                tab === t
                  ? "bg-[#9bd47a] text-gray-900 border-2 border-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              {t === "rekap" ? "Rekap Siswa" : `Log ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-neo-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="input text-sm py-2"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="input text-sm py-2"
            />
          </div>

          {/* Status */}
          {tab !== "rekap" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input text-sm py-2"
              >
                <option value="">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Kelas (siswa only) */}
          {(tab === "siswa" || tab === "rekap") && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Kelas</label>
              <input
                type="text"
                placeholder="X, XI, XII..."
                value={kelasFilter}
                onChange={(e) => { setKelasFilter(e.target.value); setPage(1); }}
                className="input text-sm py-2"
              />
            </div>
          )}

          {/* Lembaga (super admin only) */}
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Lembaga</label>
              <select
                value={lembagaFilter}
                onChange={(e) => { setLembagaFilter(e.target.value); setPage(1); }}
                className="input text-sm py-2"
              >
                <option value="">Semua</option>
                <option value="MA">MA</option>
                <option value="MTs">MTs</option>
              </select>
            </div>
          )}

          {/* Search */}
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Cari</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
              <input
                type="text"
                placeholder="Nama / NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input text-sm py-2 pl-8 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && tab !== "rekap" && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <SummaryCard label="Hadir" value={summary.hadir} color="text-green-600" />
          <SummaryCard label="Terlambat" value={summary.terlambat} color="text-amber-600" />
          <SummaryCard label="Izin" value={summary.izin} color="text-blue-600" />
          <SummaryCard label="Sakit" value={summary.sakit} color="text-orange-600" />
          <SummaryCard label="Alpha" value={summary.alpha} color="text-red-600" />
          <SummaryCard label="Libur" value={summary.libur} color="text-gray-600" />
        </div>
      )}

      {/* Table */}
      <div className="bg-white border-2 border-gray-900 rounded-xl shadow-neo overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-[#9bd47a] border-t-gray-900 rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Siswa Log Table */}
            {tab === "siswa" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Nama</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">NIS</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
                      {isSuperAdmin && <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaRows.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-12 text-gray-400 font-bold">Tidak ada data</td></tr>
                    ) : siswaRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.attendance_date}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{r.student?.nama || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{r.student?.nis || "-"}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-700">{r.student?.kelas || "-"}</td>
                        {isSuperAdmin && <td className="px-4 py-2.5 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg border text-xs font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.check_in?.slice(0, 5) || "-"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.check_out?.slice(0, 5) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Guru Log Table */}
            {tab === "guru" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Tanggal</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Nama</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">NIP</th>
                      {isSuperAdmin && <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Masuk</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guruRows.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-12 text-gray-400 font-bold">Tidak ada data</td></tr>
                    ) : guruRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.attendance_date}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{r.teacher?.nama || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{r.teacher?.nip || "-"}</td>
                        {isSuperAdmin && <td className="px-4 py-2.5 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg border text-xs font-black ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.check_in?.slice(0, 5) || "-"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.check_out?.slice(0, 5) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rekap Siswa Table */}
            {tab === "rekap" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Nama</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">NIS</th>
                      <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Kelas</th>
                      {isSuperAdmin && <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-wide">Lembaga</th>}
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-green-300">Hadir</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-amber-300">Telat</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-blue-300">Izin</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-orange-300">Sakit</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-red-300">Alpha</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide text-gray-300">Libur</th>
                      <th className="px-4 py-3 text-center font-black text-xs uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapRows.length === 0 ? (
                      <tr><td colSpan="11" className="text-center py-12 text-gray-400 font-bold">Tidak ada data</td></tr>
                    ) : rekapRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{r.nama}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{r.nis || "-"}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-700">{r.kelas || "-"}</td>
                        {isSuperAdmin && <td className="px-4 py-2.5 text-gray-600 text-xs">{r.lembaga}</td>}
                        <td className="px-4 py-2.5 text-center font-black text-green-600">{r.hadir}</td>
                        <td className="px-4 py-2.5 text-center font-black text-amber-600">{r.terlambat}</td>
                        <td className="px-4 py-2.5 text-center font-black text-blue-600">{r.izin}</td>
                        <td className="px-4 py-2.5 text-center font-black text-orange-600">{r.sakit}</td>
                        <td className="px-4 py-2.5 text-center font-black text-red-600">{r.alpha}</td>
                        <td className="px-4 py-2.5 text-center font-black text-gray-500">{r.libur}</td>
                        <td className="px-4 py-2.5 text-center font-black text-gray-900">{r.total_hadir}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {paginationMeta && paginationMeta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-100">
                <p className="text-xs font-bold text-gray-500">
                  Hal <span className="text-gray-900">{paginationMeta.current_page}</span> dari <span className="text-gray-900">{paginationMeta.last_page}</span> — {paginationMeta.total} data
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center shadow-neo-sm"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(paginationMeta.last_page, p + 1))}
                    disabled={page === paginationMeta.last_page}
                    className="w-8 h-8 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center shadow-neo-sm"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
