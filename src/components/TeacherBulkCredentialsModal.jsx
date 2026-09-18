import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { OFFICIAL_LOGO_BASE64 } from "../assets/logoBase64";
import { useNoticeStore } from "../store/useNoticeStore";

export default function TeacherBulkCredentialsModal({
  isOpen,
  onClose,
  effectiveLembaga,
}) {
  const [search, setSearch] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [waSendMode, setWaSendMode] = useState("group"); // 'group' | 'individual'
  const [showWaConfirm, setShowWaConfirm] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);

  // Helper copy to clipboard with temporary feedback
  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
      useNoticeStore.getState().showSuccess(`${label} berhasil disalin.`);
    });
  };

  // Fetch & Auto-ensure all teachers credentials
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["teachers-credentials", effectiveLembaga],
    queryFn: async () => {
      const res = await api.get("/attendance/teachers-credentials", {
        params: effectiveLembaga ? { lembaga: effectiveLembaga } : {},
      });
      return res.data;
    },
    enabled: isOpen,
  });

  const teachersList = useMemo(() => {
    return responseData?.data?.teachers || [];
  }, [responseData]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachersList;
    const q = search.toLowerCase();
    return teachersList.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.nip && t.nip.includes(q)) ||
        (t.nomor_hp && t.nomor_hp.includes(q))
    );
  }, [teachersList, search]);

  // Mutation to send WhatsApp
  const sendWaMutation = useMutation({
    mutationFn: async ({ mode, teacherId }) => {
      const payload = { mode };
      if (effectiveLembaga) payload.lembaga = effectiveLembaga;
      if (teacherId) payload.teacher_id = teacherId;
      const res = await api.post("/attendance/teachers-credentials/send-whatsapp", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setShowWaConfirm(false);
      useNoticeStore
        .getState()
        .showSuccess(data?.message || "Kredensial login guru berhasil dikirimkan via WhatsApp.");
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        "Gagal mengirim WhatsApp. Pastikan API Key aktif di Pengaturan WhatsApp.";
      useNoticeStore.getState().showWarning(msg);
    },
  });

  if (!isOpen) return null;

  // ==========================================
  // GENERATOR DOKUMEN PDF RESMI KREDENSIAL GURU
  // ==========================================
  const handleExportPdf = async () => {
    if (teachersList.length === 0) {
      useNoticeStore.getState().showWarning("Tidak ada data guru untuk dicetak.");
      return;
    }

    setIsExportingPdf(true);
    try {
      let logoData = OFFICIAL_LOGO_BASE64;
      let dynamicAddress =
        "Jl. A. Yani KM 10,700 Gang H. Antung / Jl. Handil Jambu, Kertak Hanyar, Kab. Banjar, Kalsel";
      let dynamicEmail = "ma@raudhatulyatama.sch.id";

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.raudhatulyatama.sch.id/api/v1";
        const [kontakRes] = await Promise.allSettled([
          fetch(`${apiBase}/kontak`, { headers: { Accept: "application/json" } }).then((r) => r.json()),
        ]);

        if (kontakRes.status === "fulfilled" && kontakRes.value?.data) {
          const k = kontakRes.value.data;
          const targetLembaga = (effectiveLembaga || "").toLowerCase();
          if (targetLembaga === "mts" && k.alamat_mts) {
            dynamicAddress = k.alamat_mts;
            dynamicEmail = k.email_mts || "mts@raudhatulyatama.sch.id";
          } else if (k.alamat_ma) {
            dynamicAddress = k.alamat_ma;
            dynamicEmail = k.email_ma || "ma@raudhatulyatama.sch.id";
          }
        }
      } catch (e) {
        // Fallback default
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const institutionFull =
        effectiveLembaga?.toLowerCase() === "mts"
          ? "MADRASAH TSANAWIYAH"
          : effectiveLembaga?.toLowerCase() === "ma"
          ? "MADRASAH ALIYAH"
          : "MADRASAH ALIYAH & TSANAWIYAH";

      // 1. Gambar Kop Surat
      if (logoData) {
        try {
          doc.addImage(logoData, "PNG", 16, 9.5, 21, 21);
        } catch (e) {}
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text("YAYASAN RAUDHATUL YATAMA", 152, 14, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // Primary green
      doc.text(`${institutionFull} RAUDHATUL YATAMA`, 152, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text(dynamicAddress, 152, 25, { align: "center" });
      doc.text(
        `Website: raudhatulyatama.sch.id • ppdb.raudhatulyatama.sch.id | Email: ${dynamicEmail}`,
        152,
        29,
        { align: "center" }
      );

      // Double Line Divider
      doc.setDrawColor(17, 24, 39);
      doc.setLineWidth(0.8);
      doc.line(14, 32, 283, 32);
      doc.setLineWidth(0.25);
      doc.line(14, 33.2, 283, 33.2);

      // Judul Dokumen Kredensial
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text("DAFTAR KREDENSIAL RESMI AKUN LOGIN PERTAMA DEWAN GURU", 148.5, 39, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Sistem Akses Terpadu (Single Sign-On): Portal Madrasah, Presensi Digital & Webmail Madrasah",
        148.5,
        43.5,
        { align: "center" }
      );

      // 2. Data Tabel Kredensial
      const head = [
        [
          "No",
          "Nama Dewan Guru",
          "NIP / NUPTK",
          "Lembaga",
          "Email Login Resmi",
          "Password Default",
          "No. WhatsApp",
          "Status SSO",
        ],
      ];

      const body = teachersList.map((t, index) => [
        index + 1,
        t.nama,
        t.nip || "-",
        t.lembaga || "MA",
        t.email,
        t.default_password || "Yatama10",
        t.nomor_hp || "-",
        "SSO Aktif",
      ]);

      autoTable(doc, {
        startY: 47,
        head: head,
        body: body,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          textColor: [17, 24, 39],
          lineColor: [209, 213, 219],
          lineWidth: 0.15,
          cellPadding: 2.2,
          valign: "middle",
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: "bold",
          lineColor: [17, 24, 39],
          lineWidth: 0.3,
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { fontStyle: "bold", cellWidth: 55 },
          2: { halign: "center", cellWidth: 32 },
          3: { halign: "center", cellWidth: 20 },
          4: { fontStyle: "bold", textColor: [29, 78, 216], cellWidth: 62 },
          5: { fontStyle: "bold", halign: "center", textColor: [180, 83, 9], cellWidth: 30 },
          6: { halign: "center", cellWidth: 35 },
          7: { halign: "center", fontStyle: "bold", textColor: [5, 150, 105], cellWidth: 25 },
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(
            "Dokumen Resmi Madrasah Raudhatul Yatama • Bersifat Rahasia untuk Dewan Guru & Tenaga Kependidikan",
            14,
            202
          );
          doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, 283, 202, {
            align: "right",
          });
        },
      });

      // 3. Catatan Keamanan & Blok Tanda Tangan
      let finalY = doc.lastAutoTable.finalY + 8;
      if (finalY + 45 > 200) {
        doc.addPage("a4", "landscape");
        finalY = 20;
      }

      // Kotak Catatan
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(14, finalY, 155, 26, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text("PETUNJUK AKSES SATU AKUN (SINGLE SIGN-ON / SSO):", 18, finalY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text(
        "1. Akses Layanan: Presensi (absen.raudhatulyatama.sch.id) | Portal (raudhatulyatama.sch.id/login)",
        18,
        finalY + 10
      );
      doc.text(
        "2. Akses Email Resmi: Webmail Madrasah (https://mail.raudhatulyatama.sch.id)",
        18,
        finalY + 14.5
      );
      doc.text(
        "3. Password awal adalah 'Yatama10'. Dewan Guru wajib mengganti password setelah berhasil masuk.",
        18,
        finalY + 19
      );

      // Tanda Tangan Kanan
      const dateStr = format(new Date(), "dd MMMM yyyy", { locale: localeId });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`Kertak Hanyar, ${dateStr}`, 215, finalY + 4);
      doc.text("Kepala Madrasah / Bagian Kepegawaian,", 215, finalY + 9);
      doc.text("( .................................................... )", 215, finalY + 24);
      doc.text("NIP. -", 215, finalY + 28);

      const fileName = `Kredensial_Login_Guru_Yatama_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      useNoticeStore.getState().showSuccess("Dokumen PDF kredensial resmi guru berhasil diunduh.");
    } catch (err) {
      useNoticeStore.getState().showWarning("Gagal mencetak dokumen PDF: " + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ==========================================
  // SALIN FORMAT TEKS UNTUK WHATSAPP
  // ==========================================
  const handleCopyFormattedWa = () => {
    let text = `*DAFTAR KREDENSIAL RESMI DEWAN GURU*\n`;
    text += `*MADRASAH RAUDHATUL YATAMA*\n\n`;
    text += `Assalamu'alaikum Wr. Wb.\n`;
    text += `Bapak/Ibu Dewan Guru, berikut informasi akun resmi Single Sign-On (SSO) Anda:\n\n`;
    text += `🌐 *Portal Madrasah :* https://raudhatulyatama.sch.id/login\n`;
    text += `📱 *Presensi Digital :* https://absen.raudhatulyatama.sch.id\n`;
    text += `📧 *Webmail Resmi :* https://mail.raudhatulyatama.sch.id\n\n`;
    text += `🔑 *Password Awal :* *Yatama10*\n\n`;
    text += `📋 *Daftar Akun Guru:*\n`;

    teachersList.forEach((t, i) => {
      text += `${i + 1}. *${t.nama}*\n   📧 \`${t.email}\`\n`;
    });

    text += `\n⚠️ *Penting:* Satu akun otomatis tersinkronisasi ke Portal, Absensi, dan Webmail. Silakan login dan segera ganti kata sandi default Anda demi keamanan.\n\nWassalamu'alaikum Wr. Wb.`;

    handleCopyText(text, "Format teks WhatsApp");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose} />

      <div className="relative bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo-xl max-w-2xl md:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 animate-slide-up overflow-hidden">
        {/* Header Modal */}
        <div className="bg-purple-50 border-b-2 sm:border-b-3 border-gray-900 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 text-white rounded-xl border-2 border-gray-900 flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-lg sm:text-xl">key</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-xs sm:text-base text-gray-900 leading-tight truncate">
                Kredensial Login Dewan Guru
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] sm:text-[10px] text-purple-900 font-black bg-purple-100/80 px-1.5 py-0.5 rounded border border-purple-200">
                  SSO: Portal, Absen & Webmail
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-semibold hidden xs:inline">
                  • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA & MTS"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-xl border-2 border-gray-900 hover:bg-gray-100 transition-colors text-gray-700 shrink-0 ml-2 cursor-pointer"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">close</span>
          </button>
        </div>

        {/* Action Toolbar & Info Banner */}
        <div className="p-2.5 sm:p-3 border-b border-gray-200 bg-gray-50/70 space-y-2 shrink-0">
          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-1.5">
            {/* Tombol Cetak PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || isLoading}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black border-2 border-gray-900 rounded-xl shadow-xs hover:shadow-neo transition-all text-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              <span>{isExportingPdf ? "Membuat PDF..." : "Cetak PDF"}</span>
            </button>

            {/* Tombol Kirim WA */}
            <button
              onClick={() => setShowWaConfirm(!showWaConfirm)}
              disabled={isLoading || sendWaMutation.isPending}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black border-2 border-gray-900 rounded-xl shadow-xs hover:shadow-neo transition-all text-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>Kirim ke WA</span>
            </button>

            {/* Tombol Salin Format WA */}
            <button
              onClick={handleCopyFormattedWa}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-900 font-bold border-2 border-gray-900 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
              title="Salin seluruh format rekap untuk WhatsApp"
            >
              <span className="material-symbols-outlined text-base text-gray-600">
                {copiedItem === "Format teks WhatsApp" ? "check" : "content_copy"}
              </span>
              <span>{copiedItem === "Format teks WhatsApp" ? "Tersalin!" : "Salin Format WA"}</span>
            </button>
          </div>

          {/* Quick Notice Password Awal */}
          <div className="flex items-center justify-between p-2 sm:p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl text-[11px] sm:text-xs text-amber-950 font-medium gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-sm text-amber-700 shrink-0">info</span>
              <span className="truncate">
                Password Default: <strong className="font-mono font-black text-amber-900">Yatama10</strong>
              </span>
            </div>
            <button
              onClick={() => handleCopyText("Yatama10", "Password Default")}
              className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-white border border-amber-400 rounded-md hover:bg-amber-100 text-amber-900 shrink-0 cursor-pointer"
            >
              {copiedItem === "Password Default" ? "Tersalin!" : "Salin Password"}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama guru, email, atau NIP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 sm:py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg">
              search
            </span>
          </div>
        </div>

        {/* Panel Konfirmasi Kirim WhatsApp Gateway */}
        {showWaConfirm && (
          <div className="p-3 sm:p-4 bg-emerald-50 border-b-2 border-emerald-300 space-y-2.5 animate-slide-down shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-base">chat</span>
                Kirimkan Kredensial via WhatsApp Gateway:
              </h4>
              <button
                onClick={() => setShowWaConfirm(false)}
                className="text-[11px] font-bold text-gray-500 hover:text-gray-900"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-2.5 sm:p-3 border-2 rounded-xl cursor-pointer flex items-start gap-2 transition-all ${
                  waSendMode === "group"
                    ? "bg-white border-gray-900 shadow-neo"
                    : "bg-emerald-100/40 border-emerald-300 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="waMode"
                  value="group"
                  checked={waSendMode === "group"}
                  onChange={() => setWaSendMode("group")}
                  className="mt-0.5 text-emerald-600 focus:ring-0"
                />
                <div>
                  <strong className="block text-xs font-black text-gray-900 leading-tight">
                    Grup WA Dewan Guru
                  </strong>
                  <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5 leading-snug">
                    Broadcast rekap seluruh email dan instruksi login langsung ke grup dewan guru.
                  </p>
                </div>
              </label>

              <label
                className={`p-2.5 sm:p-3 border-2 rounded-xl cursor-pointer flex items-start gap-2 transition-all ${
                  waSendMode === "individual"
                    ? "bg-white border-gray-900 shadow-neo"
                    : "bg-emerald-100/40 border-emerald-300 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="waMode"
                  value="individual"
                  checked={waSendMode === "individual"}
                  onChange={() => setWaSendMode("individual")}
                  className="mt-0.5 text-emerald-600 focus:ring-0"
                />
                <div>
                  <strong className="block text-xs font-black text-gray-900 leading-tight">
                    Japri Nomor Setiap Guru
                  </strong>
                  <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5 leading-snug">
                    Kirim pesan pribadi kredensial ke nomor WhatsApp masing-masing guru.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-0.5">
              <button
                onClick={() => setShowWaConfirm(false)}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700"
              >
                Batal
              </button>
              <button
                onClick={() => sendWaMutation.mutate({ mode: waSendMode })}
                disabled={sendWaMutation.isPending}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-gray-900 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>
                  {sendWaMutation.isPending ? "Mengirim ke WA..." : "Kirim Sekarang"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Konten Kredensial Guru (Mobile Card View + Desktop Table View) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4.5 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500 font-bold text-xs sm:text-sm">
              <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full mx-auto mb-3" />
              Menyiapkan akun & kredensial dewan guru...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium text-xs sm:text-sm">
              Tidak ada data guru yang cocok dengan pencarian.
            </div>
          ) : (
            <>
              {/* TAMPILAN 1: MOBILE CARD VIEW (< 640px) */}
              <div className="sm:hidden space-y-2.5">
                {filteredTeachers.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white border-2 border-gray-900 rounded-xl shadow-xs space-y-2 hover:border-purple-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-xs text-gray-900 leading-tight">{t.nama}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          NIP: {t.nip}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gray-100 border border-gray-300">
                          {t.lembaga}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
                          SSO Aktif
                        </span>
                      </div>
                    </div>

                    {/* Email row with copy button */}
                    <div className="p-1.5 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] text-blue-900 font-bold uppercase block">Email Login</span>
                        <span className="font-mono text-[11px] font-bold text-blue-800 truncate block">
                          {t.email}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyText(t.email, `Email ${t.nama}`)}
                        className="p-1 text-blue-700 hover:bg-blue-100 rounded shrink-0 cursor-pointer"
                        title="Salin Email"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedItem === `Email ${t.nama}` ? "done" : "content_copy"}
                        </span>
                      </button>
                    </div>

                    {/* Password & WhatsApp row */}
                    <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 font-bold">Password:</span>
                        <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 text-[10px]">
                          {t.default_password}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            sendWaMutation.mutate({ mode: "individual", teacherId: t.id })
                          }
                          disabled={!t.nomor_hp || t.nomor_hp === "-" || sendWaMutation.isPending}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">send</span>
                          <span>Japri WA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TAMPILAN 2: DESKTOP TABLE VIEW (>= 640px) */}
              <div className="hidden sm:block border-2 border-gray-900 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-900 text-gray-900 font-black">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Nama Lengkap & NIP</th>
                      <th className="py-2.5 px-3 text-center">Lembaga</th>
                      <th className="py-2.5 px-3">Email Login Resmi</th>
                      <th className="py-2.5 px-3 text-center">Password Awal</th>
                      <th className="py-2.5 px-3">No. WhatsApp</th>
                      <th className="py-2.5 px-3 text-center">Aksi Japri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
                    {filteredTeachers.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900 text-xs sm:text-sm">{t.nama}</div>
                          <div className="text-[10px] text-gray-500 font-mono">NIP: {t.nip}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 border border-gray-300">
                            {t.lembaga}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 select-all">
                              {t.email}
                            </span>
                            <button
                              onClick={() => handleCopyText(t.email, `Email ${t.nama}`)}
                              className="text-gray-400 hover:text-blue-700 p-0.5 cursor-pointer"
                              title="Salin Email"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {copiedItem === `Email ${t.nama}` ? "check" : "content_copy"}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 select-all">
                            {t.default_password}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">
                          {t.nomor_hp || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() =>
                              sendWaMutation.mutate({ mode: "individual", teacherId: t.id })
                            }
                            disabled={!t.nomor_hp || t.nomor_hp === "-" || sendWaMutation.isPending}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-600 rounded-lg text-[11px] font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                            title={`Kirim WA personal ke ${t.nama}`}
                          >
                            Kirim WA
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer Modal - Responsif Mobile */}
        <div className="bg-gray-50 border-t-2 border-gray-900 p-2.5 sm:p-3.5 flex items-center justify-between text-xs text-gray-600 shrink-0">
          <span className="font-bold text-[11px] sm:text-xs">
            Total {filteredTeachers.length} Akun Guru SSO
          </span>
          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
