import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Guide() {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: 1,
      number: "01",
      title: "Konfigurasi Jam & Modul Guru",
      menu: "Menu Setting (/settings)",
      icon: "settings",
      color: "bg-blue-500",
      description: "Langkah pertama sebelum memulai presensi sekolah.",
      details: [
        {
          heading: "Tab 1: Jam Operasional",
          points: [
            "Atur Jam Buka Absen (misal: 06:00:00).",
            "Atur Batas Masuk & Lewat Batas / Terlambat (misal: 07:30:00). Siswa scan setelah jam ini otomatis berstatus Terlambat.",
            "Atur Jam Tutup Absen (misal: 08:00:00).",
          ],
        },
        {
          heading: "Tab 2: Format & Jam Pulang",
          points: [
            "Atur Jam Pulang (misal: 14:00:00) dan Jam Batas Pulang.",
            "Pilih Format Kelas (Romawi misal X, XI, XII atau Angka misal 10, 11, 12).",
          ],
        },
        {
          heading: "Tab 3: Jam Sistem & Modul Guru",
          points: [
            "Atur Jam Auto-Alpha (default: 12:00:00). Sebelum jam ini, siswa belum absen tidak divonis Alpha di dashboard.",
            "Aktifkan/Nonaktifkan Saklar Modul Guru. Jika sekolah hanya ingin sistem untuk siswa, matikan saklar ini.",
          ],
        },
      ],
      link: "/settings",
      linkText: "Buka Menu Setting",
    },
    {
      id: 2,
      number: "02",
      title: "Integrasi WhatsApp Notifier",
      menu: "Menu WA Notifier (/whatsapp-api)",
      icon: "forum",
      color: "bg-emerald-500",
      description: "Menghubungkan notifikasi otomatis ke nomor orang tua/wali murid.",
      details: [
        {
          heading: "Tab 1: Pengaturan Gateway",
          points: [
            "Dapatkan API Key di wa.tappdigital.id.",
            "Masukkan API Key ke form dan aktifkan saklar 'Notifikasi WhatsApp Otomatis'.",
            "Gunakan fitur 'Tes Ping Koneksi Gateway' untuk memastikan nomor bot WA terhubung.",
          ],
        },
        {
          heading: "Tab 2: Simulator & Tes WA",
          points: [
            "Lakukan simulasi pengiriman pesan untuk status Hadir, Terlambat, Izin, Sakit, Alpha, atau Pulang.",
            "Nomor tester bisa disimpan ke database lembaga (misal nomor Kepala Sekolah atau Guru Piket).",
            "Bisa memasukkan nomor berawalan 08... atau 8... — sistem otomatis menstandarkan nomor.",
          ],
        },
      ],
      link: "/whatsapp-api",
      linkText: "Buka WA Notifier",
    },
    {
      id: 3,
      number: "03",
      title: "Input Data Siswa & Guru",
      menu: "Menu Siswa & Guru (/students, /teachers)",
      icon: "group",
      color: "bg-purple-500",
      description: "Memasukkan data peserta presensi dan nomor kontak wali.",
      details: [
        {
          heading: "Data Siswa",
          points: [
            "Tambah siswa manual atau import file Excel/CSV.",
            "Pastikan NISN dan Kelas terisi dengan benar.",
            "Isi Nomor WhatsApp Orang Tua agar notifikasi scan masuk & pulang bisa otomatis terkirim.",
          ],
        },
        {
          heading: "Cetak Kartu QR Siswa",
          points: [
            "Masuk ke data siswa lalu gunakan fitur cetak ID Card barcode/QR.",
            "QR code ini nantinya di-scan siswa di gerbang sekolah.",
          ],
        },
      ],
      link: "/students",
      linkText: "Buka Data Siswa",
    },
    {
      id: 4,
      number: "04",
      title: "Jadwal Kalender & Hari Libur",
      menu: "Menu Libur (/holidays)",
      icon: "event",
      color: "bg-amber-500",
      description: "Mencegah siswa/guru dianggap Alpha saat tanggal merah.",
      details: [
        {
          heading: "Tandai Tanggal Libur",
          points: [
            "Klik tanggal di kalender atau tombol 'Tambah Hari Libur'.",
            "Tentukan nama libur (misal: Libur Semester, Idul Fitri, Hari Kemerdekaan).",
            "Tentukan target: berlaku untuk Semua, Siswa Saja, atau Guru Saja.",
            "Pada tanggal libur yang tercatat di kalender, sistem auto-alpha otomatis tidak akan memvonis Alpha.",
          ],
        },
      ],
      link: "/holidays",
      linkText: "Buka Kalender Libur",
    },
    {
      id: 5,
      number: "05",
      title: "Operasional Scan Masuk & Pulang",
      menu: "Menu Scan (/scan)",
      icon: "qr_code_scanner",
      color: "bg-teal-500",
      description: "Alat pemindai kamera harian saat siswa datang dan pulang.",
      details: [
        {
          heading: "Pelaksanaan Scan Harian",
          points: [
            "Pagi hari: Pilih tab 'MASUK' dan arahkan kamera ke barcode/kartu siswa.",
            "Sore/Siang hari: Pilih tab 'PULANG' saat jam kepulangan.",
            "Jika siswa tidak membawa kartu / izin lewat surat, gunakan tab 'Input Manual' di bagian bawah.",
            "Sistem mendukung offline-scan jika koneksi internet terputus sementara.",
          ],
        },
      ],
      link: "/scan",
      linkText: "Buka Halaman Scan",
    },
    {
      id: 6,
      number: "06",
      title: "Pantau Dashboard & Unduh Laporan",
      menu: "Menu Home & Laporan (/, /report)",
      icon: "assessment",
      color: "bg-rose-500",
      description: "Rekapitulasi kehadiran untuk evaluasi sekolah dan dinas.",
      details: [
        {
          heading: "Dashboard Utama",
          points: [
            "Menampilkan angka kehadiran hari ini (Hadir, Telat, Izin, Sakit, Alpha).",
            "Angka Alpha tidak akan langsung muncul sebelum jam 12:00 siang.",
          ],
        },
        {
          heading: "Pusat Laporan & Ekspor",
          points: [
            "Default filter: Hari Ini (kolom tanggal tersembunyi agar tampilan bersih).",
            "Filter Periode: Buka 'Filter Tanggal' untuk memilih rentang waktu (misal tanggal 1 s/d 10).",
            "Download Excel: Format otomatis dengan lebar kolom presisi.",
            "Download PDF Rekap: Rangkuman tabel ber-kop yayasan resmi.",
            "Download PDF Harian: Mencetak dokumen detail per-tanggal (1 hari = 1 halaman terpisah).",
          ],
        },
      ],
      link: "/report",
      linkText: "Buka Laporan",
    },
  ];

  return (
    <div className="w-full pb-28 md:pb-12 space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-6 shadow-neo flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-green border-2 md:border-3 border-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-2xl sm:text-3xl text-gray-900">school</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-md text-amber-900">
              Panduan Resmi
            </span>
            <h1 className="font-black text-lg sm:text-2xl text-gray-900 tracking-tight mt-1">
              Alur Penggunaan Sistem Absensi Yatama
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Tahapan langkah awal dari konfigurasi jam, WhatsApp, hingga cetak laporan akhir.
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 flex items-center gap-1.5 transition-all shadow-sm self-stretch sm:self-auto justify-center"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Steps Navigation Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={`p-3 rounded-2xl border-2 transition-all text-left flex flex-col justify-between cursor-pointer ${
              activeStep === step.id
                ? "bg-gray-900 border-gray-900 text-white shadow-neo -translate-y-0.5"
                : "bg-white border-gray-300 hover:border-gray-900 text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeStep === step.id ? "bg-primary-green text-gray-900" : "bg-gray-100 text-gray-600"}`}>
                Langkah {step.number}
              </span>
              <span className={`material-symbols-outlined text-base ${activeStep === step.id ? "text-primary-green" : "text-gray-400"}`}>
                {step.icon}
              </span>
            </div>
            <span className="font-black text-xs mt-2 leading-tight line-clamp-2">
              {step.title}
            </span>
          </button>
        ))}
      </div>

      {/* Active Step Detail Card */}
      {(() => {
        const cur = steps.find((s) => s.id === activeStep) || steps[0];
        return (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-5 sm:p-7 shadow-neo space-y-6">
            {/* Step Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-200">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-lg border-2 border-gray-900 flex-shrink-0 shadow-sm">
                  {cur.number}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    {cur.menu}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-snug">
                    {cur.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
                    {cur.description}
                  </p>
                </div>
              </div>

              <Link
                to={cur.link}
                className="px-5 py-2.5 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <span>{cur.linkText}</span>
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </Link>
            </div>

            {/* Instruction Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {cur.details.map((section, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50/80 border-2 border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-center gap-2 font-black text-sm text-gray-900 border-b border-gray-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <h3>{section.heading}</h3>
                  </div>

                  <ul className="space-y-2.5">
                    {section.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
                        <span className="material-symbols-outlined text-emerald-600 text-base flex-shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Step Switcher Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={activeStep <= 1}
                onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-900 font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">navigate_before</span>
                <span>Langkah Sebelumnya</span>
              </button>

              <button
                type="button"
                disabled={activeStep >= steps.length}
                onClick={() => setActiveStep((s) => Math.min(steps.length, s + 1))}
                className="px-4 py-2 bg-gray-900 hover:bg-black disabled:opacity-30 text-white font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Langkah Selanjutnya</span>
                <span className="material-symbols-outlined text-base">navigate_next</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
