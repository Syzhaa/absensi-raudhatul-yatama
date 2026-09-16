import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Guide() {
  const [activeTab, setActiveTab] = useState("scan");
  const [searchQuery, setSearchQuery] = useState("");

  const guideTabs = [
    {
      id: "scan",
      label: "Scan Presensi",
      title: "Panduan Pemindaian QR Code (Masuk & Pulang)",
      icon: "qr_code_scanner",
      color: "bg-emerald-500",
      badge: "Operasional Harian",
      route: "/scan",
      routeText: "Buka Pemindai Scan QR",
      description: "Tata cara penggunaan kamera pemindai harian di gerbang sekolah untuk presensi santri dan dewan guru.",
      sections: [
        {
          title: "1. Pemilihan Sesi: Masuk & Pulang",
          icon: "swap_horiz",
          points: [
            "Pagi Hari: Pilih tab 'MASUK'. Kamera akan merekam jam kedatangan santri dan memvalidasi apakah berstatus Hadir atau Terlambat berdasarkan jam batas masuk.",
            "Siang/Sore Hari: Pilih tab 'PULANG' saat jam kepulangan santri atau guru untuk mencatat waktu checkout.",
            "Sistem otomatis mencegah double-scan dalam interval cepat untuk menghindari data kembar yang tidak disengaja.",
          ],
        },
        {
          title: "2. Pengaturan Kamera & Audio Suara",
          icon: "videocam",
          points: [
            "Pilih Kamera: Tersedia saklar pemilih antara Kamera Belakang (disarankan untuk HP/tablet) dan Kamera Depan (laptop).",
            "Saklar Suara (Beep Audio): Aktifkan suara konfirmasi agar berbunyi 'beep' sukses setiap kali kartu barcode berhasil terpindai.",
            "Pencahayaan: Pastikan QR Code pada kartu santri/guru tidak terhalang bayangan gelap atau pantulan cahaya terang.",
          ],
        },
        {
          title: "3. Presensi Mandiri Guru via Link & Geofencing GPS",
          icon: "pin_drop",
          points: [
            "Dewan guru dapat melakukan presensi mandiri melalui ponsel masing-masing dengan membuka tautan khusus presensi guru (/scan-guru).",
            "Guru dapat memasukkan NPK/NIP atau scan kartu tanpa perlu login akun admin.",
            "Jika fitur Validasi Lokasi (Geofencing) diaktifkan di Pengaturan, guru wajib mengizinkan akses lokasi GPS di browser dan berada di dalam radius sekolah.",
          ],
        },
        {
          title: "4. Mode Cadangan (Offline Scanner)",
          icon: "wifi_off",
          points: [
            "Aplikasi dilengkapi penyimpanan lokal (IndexedDB/LocalStorage). Jika jaringan internet terputus mendadak saat antrean scan, kamera tetap membaca barcode.",
            "Data rekaman akan tersimpan di memori perangkat dan otomatis terkirim (sync) ke server utama begitu koneksi internet pulih kembali.",
          ],
        },
      ],
      faq: [
        {
          q: "Kamera tidak menyala atau muncul layar hitam?",
          a: "Periksa izin kamera di browser Anda (klik ikon gembok di sebelah kiri alamat URL), lalu izinkan 'Camera: Allow'. Pastikan tidak ada aplikasi lain yang sedang menggunakan kamera.",
        },
        {
          q: "Barcode/QR Code tidak terbaca oleh pemindai?",
          a: "Jaga jarak kartu sekitar 15–25 cm tegak lurus di depan kamera. Pastikan pencahayaan cukup dan kartu dicetak dengan resolusi tajam.",
        },
      ],
    },
    {
      id: "input",
      label: "Input Manual & Izin",
      title: "Panduan Input Presensi Manual, Izin, Sakit & Dispensasi",
      icon: "edit_calendar",
      color: "bg-blue-500",
      badge: "Pencatatan Khusus",
      route: "/attendance",
      routeText: "Buka Rekap & Input Absen",
      description: "Langkah penanganan santri atau guru yang tidak membawa kartu, izin resmi, sakit, atau dispensasi tugas madrasah.",
      sections: [
        {
          title: "1. Input Kehadiran Santri Tanpa Kartu",
          icon: "person_search",
          points: [
            "Jika santri tertinggal kartu ID di rumah, buka menu Rekap Absen (/attendance) atau gunakan tombol 'Input Manual' di bagian bawah halaman Scan.",
            "Ketik nama santri atau kelas, pilih status 'Hadir' atau 'Terlambat', lalu masukkan jam masuk dan simpan.",
            "Status kehadiran santri langsung tercatat resmi di database dan sinkron ke rekap harian.",
          ],
        },
        {
          title: "2. Pencatatan Santri / Guru Izin & Sakit",
          icon: "medical_services",
          points: [
            "Buka menu Absen (/attendance), cari nama santri atau dewan guru bersangkutan.",
            "Klik ikon pensil (Edit Status Kehadiran), ubah status menjadi 'Izin' atau 'Sakit'.",
            "Tuliskan keterangan (misal: 'Demam', 'Ada acara keluarga di luar kota', atau 'Tugas dinas Kemenag').",
            "Sistem akan otomatis memperbarui statistik di dashboard dan mengecualikan santri tersebut dari vonis Alpha.",
          ],
        },
        {
          title: "3. Ketentuan Sistem Jam Auto-Alpha",
          icon: "timer",
          points: [
            "Di menu Pengaturan, terdapat konfigurasi 'Jam Auto-Alpha' (standar jam 12:00 siang).",
            "Sebelum jam 12:00, santri yang belum melakukan scan masuk belum divonis Alpha pada layar dashboard agar rekaman rekap tetap adil.",
            "Tepat setelah jam batas terlewati, sistem otomatis menandai siswa yang tidak hadir dan tanpa surat izin sebagai 'Alpha'.",
          ],
        },
        {
          title: "4. Koreksi & Perbaikan Riwayat Kehadiran",
          icon: "history_toggle_subdrop",
          points: [
            "Admin atau Petugas Absen yang memiliki hak akses dapat mengubah atau membetulkan jam masuk/pulang santri jika terjadi kekeliruan pencatatan.",
            "Setiap perubahan status dan jam tercatat dalam riwayat rekaman presensi sistem.",
          ],
        },
      ],
      faq: [
        {
          q: "Apakah notifikasi WhatsApp tetap terkirim saat input manual?",
          a: "Ya, jika fitur WhatsApp Notifier aktif di Pengaturan, notifikasi perubahan status (Izin/Sakit/Hadir) tetap dapat diteruskan ke nomor orang tua santri.",
        },
        {
          q: "Bisakah guru mengubah status kehadiran santri?",
          a: "Bisa, akun guru yang diberikan hak akses halaman Absen dapat memasukkan presensi manual dan mengubah status santri di kelasnya.",
        },
      ],
    },
    {
      id: "master",
      label: "Data Siswa & Guru",
      title: "Panduan Master Siswa, Dewan Guru & Akun Webmail",
      icon: "badge",
      color: "bg-purple-500",
      badge: "Manajemen Data & Akun",
      route: "/teachers",
      routeText: "Buka Data Dewan Guru",
      description: "Pengelolaan biodata santri dan pendidik, pembuatan akun login resmi, integrasi webmail, dan cetak kartu identitas.",
      sections: [
        {
          title: "1. Pembuatan Akun & Webmail Guru (nama@raudhatulyatama.sch.id)",
          icon: "key",
          points: [
            "Buka menu Guru (/teachers), klik tombol 'Buat Akun' pada guru yang belum memiliki akun.",
            "Sistem otomatis menyiapkan email resmi (nama@raudhatulyatama.sch.id) dan kata sandi default Yatama10.",
            "Akun ini otomatis tersambung ke 2 sistem sekaligus: Webmail Resmi (mail.raudhatulyatama.sch.id) dan Aplikasi Presensi Digital (/login).",
            "Gunakan tombol 'Salin Kredensial untuk WhatsApp' untuk mengirimkan email & password secara rapi ke guru bersangkutan.",
          ],
        },
        {
          title: "2. Cetak Kartu Identitas Digital Santri & Guru",
          icon: "print",
          points: [
            "Pilih satu atau beberapa data (centang checkbox), lalu tekan tombol 'Cetak Kartu'.",
            "Pratinjau Full Screen: Layar pratinjau kartu otomatis menyesuaikan ukuran layar tanpa celah kosong.",
            "Gunakan tombol 'Fit' atau tombol zoom (+ / -) untuk mengatur tingkat perbesaran kartu secara presisi.",
            "Sakelar Tanpa Celah (0mm): Kartu depan dan belakang langsung menempel rapat dengan garis batas potong, memudahkan saat dicetak dua sisi atau dilaminasi.",
            "Klik tombol 'Unduh PNG' untuk arsip gambar atau 'Cetak Kartu' untuk mencetak langsung ke printer.",
          ],
        },
        {
          title: "3. Tambah & Import Excel Massal",
          icon: "file_upload",
          points: [
            "Tambah Satuan: Klik tombol 'Tambah Siswa' atau 'Tambah Guru' untuk memasukkan biodata lengkap.",
            "Import Excel Massal: Gunakan fitur 'Import Excel', unduh template resmi (.xlsx), isi kolom data, lalu unggah file kembali.",
            "Pastikan kolom NISN/NPK dan Nomor WhatsApp terisi dengan benar agar integrasi berjalan optimal.",
          ],
        },
        {
          title: "4. Kenaikan Kelas & Pembaruan Jenjang",
          icon: "school",
          points: [
            "Gunakan fitur 'Naik Kelas' pada daftar santri untuk memindahkan tingkat kelas (misal Kelas X naik ke XI).",
            "Format penamaan kelas (Romawi X/XI/XII atau Angka 10/11/12) dapat disesuaikan di menu Pengaturan.",
          ],
        },
      ],
      faq: [
        {
          q: "Bagaimana jika guru lupa kata sandi?",
          a: "Admin dapat membuka menu Guru, klik tombol 'Kredensial' pada guru yang bersangkutan, masukkan password baru (minimal 6 karakter) atau klik 'Acak Sandi', lalu simpan. Password baru otomatis tersinkron ke Webmail dan Presensi.",
        },
        {
          q: "Apakah nomor WhatsApp orang tua wajib diawali +62?",
          a: "Tidak wajib. Sistem secara otomatis menstandarkan nomor yang diawali 08... atau 62... ke format internasional WhatsApp.",
        },
      ],
    },
    {
      id: "whatsapp",
      label: "WhatsApp Notifier",
      title: "Panduan Integrasi WhatsApp Notifier & Saluran Grup",
      icon: "forum",
      color: "bg-teal-500",
      badge: "Gateway Notifikasi",
      route: "/whatsapp-api",
      routeText: "Buka Pengaturan WA Notifier",
      description: "Menghubungkan gateway pengiriman pesan instan ke nomor wali santri dan saluran grup kelas madrasah.",
      sections: [
        {
          title: "1. Konfigurasi API Gateway",
          icon: "key",
          points: [
            "Buka menu WA Notifier (/whatsapp-api).",
            "Masukkan API Key dari gateway WhatsApp (wa.tappdigital.id).",
            "Aktifkan saklar 'Notifikasi WhatsApp Otomatis'.",
            "Gunakan tombol 'Tes Ping Koneksi Gateway' untuk memastikan nomor bot aktif dan terhubung.",
          ],
        },
        {
          title: "2. Mode Saluran: Pribadi & Saluran Multi-Grup",
          icon: "groups",
          points: [
            "Mode Nomor Pribadi: Notifikasi scan kedatangan dan kepulangan langsung dikirimkan ke nomor WhatsApp orang tua santri masing-masing.",
            "Mode Grup Kelas: Notifikasi presensi dapat diteruskan ke grup WhatsApp kelas santri atau grup resmi dewan guru.",
            "Sistem mendukung multi-channel API key per-kelas jika madrasah membedakan nomor pengirim per lembaga (MA & MTs).",
          ],
        },
        {
          title: "3. Template Pesan & Kustomisasi Variabel",
          icon: "sms",
          points: [
            "Buka menu Template WA (/whatsapp-templates) untuk menyesuaikan kata-kata pesan otomatis.",
            "Dukung variabel dinamis: {nama_siswa}, {kelas}, {status}, {jam}, {tanggal}, {lembaga}.",
            "Pesan otomatis dapat dibedakan antara status Hadir Tepat Waktu, Terlambat (beserta menit keterlambatan), Izin, Sakit, dan Pulang.",
          ],
        },
        {
          title: "4. Simulator Pengiriman Notifikasi",
          icon: "send",
          points: [
            "Gunakan tab Simulator di menu WA Notifier untuk menguji tampilan pesan WhatsApp sebelum diterapkan ke sistem produksi.",
            "Masukkan nomor tester (misal HP admin) untuk memastikan format tebal (*bold*), garis miring (_italic_), dan nama variabel terbaca sempurna.",
          ],
        },
      ],
      faq: [
        {
          q: "Apakah pesan WA terkirim jika kuota internet santri habis?",
          a: "Notifikasi dikirim langsung ke WhatsApp orang tua/wali santri melalui server madrasah, sehingga orang tua tetap menerima pesan tanpa bergantung pada HP siswa.",
        },
        {
          q: "Bagaimana jika pengiriman pesan WA gagal?",
          a: "Sistem memiliki antrean pesan otomatis (Queue Worker). Pesan yang tertunda akan dicoba kirim ulang secara otomatis tanpa mengganggu kelancaran proses scan di gerbang.",
        },
      ],
    },
    {
      id: "access",
      label: "Hak Akses & Pengaturan",
      title: "Panduan Manajemen User, Hak Akses & Konfigurasi Sistem",
      icon: "admin_panel_settings",
      color: "bg-amber-500",
      badge: "Sistem & Keamanan",
      route: "/settings",
      routeText: "Buka Menu Pengaturan",
      description: "Pengaturan peran pengguna (Role), switch izin per-halaman, jam operasional, dan kalender libur madrasah.",
      sections: [
        {
          title: "1. Peran & Hierarki Pengguna (RBAC)",
          icon: "shield_person",
          points: [
            "Super Admin: Memiliki kendali penuh ke seluruh modul, lembaga (MA & MTs), dan pengaturan sistem.",
            "Admin MA / MTs: Mengelola data santri, dewan guru, dan presensi khusus di lembaganya.",
            "Petugas Absen: Akun staf piket yang bertugas mengoperasikan pemindai scan dan rekap kehadiran harian.",
            "Dewan Guru: Akun personal pendidik untuk presensi mandiri, melihat riwayat kehadiran, dan rekap kelas.",
          ],
        },
        {
          title: "2. Tab Hak Akses di Pengaturan (/settings)",
          icon: "toggle_on",
          points: [
            "Admin dapat mengatur izin buka setiap halaman untuk Petugas Absen dan Guru cukup dengan saklar ON / OFF.",
            "Halaman yang dinonaktifkan otomatis disembunyikan dari sidebar menu dan di-redirect jika dibuka langsung via URL.",
            "Tersedia tombol pintas: 'Izinkan Semua (ON)', 'Matikan Semua (OFF)', dan 'Reset Standar'.",
          ],
        },
        {
          title: "3. Pengaturan Jam Absensi & GPS Sekolah",
          icon: "schedule",
          points: [
            "Jam Buka: Waktu awal kamera pemindai mulai menerima scan (misal 06:00).",
            "Batas Masuk & Terlambat: Siswa yang memindai setelah jam ini otomatis berstatus Terlambat (misal 07:30).",
            "Jam Pulang: Waktu kepulangan resmi santri (misal 14:00/15:00).",
            "Koordinat GPS: Masukkan titik lintang & bujur madrasah serta radius meter untuk validasi presensi mandiri guru.",
          ],
        },
        {
          title: "4. Kalender Hari Libur (/holidays)",
          icon: "event",
          points: [
            "Tandai tanggal merah nasional, libur pondok pesantren, dan cuti bersama di menu Kalender Libur.",
            "Pada tanggal yang terdaftar sebagai hari libur, sistem otomatis menonaktifkan vonis Auto-Alpha sehingga tidak ada santri/guru yang dicatat Alpha tanpa alasan.",
          ],
        },
      ],
      faq: [
        {
          q: "Apakah Petugas Absen bisa mengubah pengaturan jam sekolah?",
          a: "Tidak. Menu Pengaturan (Settings) hanya dapat diakses oleh akun Admin (Super Admin, Admin MA, Admin MTs).",
        },
        {
          q: "Bagaimana cara membatasi guru agar hanya bisa membuka menu Scan dan Profil?",
          a: "Buka menu Pengaturan -> Tab 'Hak Akses' -> Pilih Role: Guru -> Matikan saklar untuk menu yang tidak diinginkan (misal Siswa, Libur, WA Notifier), lalu klik Simpan.",
        },
      ],
    },
    {
      id: "report",
      label: "Laporan & Rekap",
      title: "Panduan Dashboard, Rekapitulasi & Ekspor Laporan",
      icon: "assessment",
      color: "bg-rose-500",
      badge: "Laporan & Evaluasi",
      route: "/report",
      routeText: "Buka Menu Laporan",
      description: "Pemantauan statistik real-time kehadiran, pencetakan berkas rekap bulanan, dan ekspor lembar Excel.",
      sections: [
        {
          title: "1. Pemantauan Real-time di Dashboard",
          icon: "analytics",
          points: [
            "Dashboard menampilkan kartu ringkasan kehadiran hari ini: Total Siswa, Hadir, Terlambat, Izin, Sakit, dan Alpha.",
            "Grafik kehadiran mingguan dan bulanan untuk memantau tren kedisiplinan santri secara visual.",
            "Feed pemindaian live stream: Menampilkan data santri yang baru saja melakukan scan barcode secara real-time.",
          ],
        },
        {
          title: "2. Filter Fleksibel Rekapitulasi",
          icon: "filter_alt",
          points: [
            "Filter Lembaga: Beralih antara Madrasah Aliyah (MA) dan Madrasah Tsanawiyah (MTs).",
            "Filter Kelas: Memilih kelas tertentu (misal Kelas X A, XI B) untuk rekap absensi per-wali kelas.",
            "Filter Rentang Waktu: Pilih 'Hari Ini', 'Minggu Ini', 'Bulan Ini', atau rentang tanggal kustom (custom date range).",
          ],
        },
        {
          title: "3. Ekspor Dokumen Resmi (Excel & PDF)",
          icon: "download",
          points: [
            "Ekspor Excel (.xlsx): Format rapi dengan penataan kolom lebar, keterangan jam masuk, jam pulang, dan total kehadiran.",
            "Cetak PDF Rekap: Rangkuman tabel siap cetak ber-kop resmi Madrasah Raudhatul Yatama Kabupaten Banjar.",
            "Cetak PDF Harian: Mencetak rincian detail per-hari (1 hari per 1 lembar kertas terpisah) untuk arsip tata usaha.",
          ],
        },
        {
          title: "4. Evaluasi Ketidakhadiran & Tindak Lanjut",
          icon: "rule",
          points: [
            "Laporan siswa dengan persentase kehadiran rendah dapat langsung diidentifikasi untuk tindak lanjut guru BK atau wali kelas.",
            "Riwayat notifikasi WhatsApp dapat dicocokkan untuk memastikan orang tua telah menerima informasi ketidakhadiran santri.",
          ],
        },
      ],
      faq: [
        {
          q: "Apakah data absensi yang sudah lama bisa diunduh kembali?",
          a: "Bisa. Seluruh riwayat presensi tersimpan permanen di basis data server dan dapat ditarik kembali kapan saja melalui filter rentang tanggal.",
        },
        {
          q: "Apakah bisa mencetak laporan khusus dewan guru?",
          a: "Bisa. Di menu Laporan terdapat tab 'Laporan Guru' yang merekap kehadiran pendidik, jam datang, jam pulang, dan mata pelajaran.",
        },
      ],
    },
  ];

  const currentTab = guideTabs.find((t) => t.id === activeTab) || guideTabs[0];

  const filteredSections = searchQuery
    ? currentTab.sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sec.points.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : currentTab.sections;

  const filteredFaq = searchQuery
    ? currentTab.faq.filter(
        (f) =>
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentTab.faq;

  return (
    <div className="w-full pb-32 md:pb-12 space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-green border-2 md:border-3 border-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-2xl sm:text-3xl text-gray-900">
              menu_book
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 border border-amber-400 rounded-md text-amber-900">
                Dokumentasi & Panduan Resmi
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500">
                Sistem Presensi & Webmail Yatama
              </span>
            </div>
            <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight mt-1">
              Pusat Panduan & Prosedur Operasional
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Pilih tab di bawah untuk melihat petunjuk lengkap setiap modul aplikasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Link
            to="/"
            className="flex-1 sm:flex-initial px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-2 shadow-neo">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {guideTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                  isActive
                    ? "bg-gray-900 text-white border-gray-900 shadow-neo -translate-y-0.5"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-900 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl ${
                    isActive ? "text-primary-green" : "text-gray-500"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Card */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-3xl p-5 sm:p-7 shadow-neo space-y-6">
        {/* Tab Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-gray-200">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary-green text-gray-900 flex items-center justify-center font-black border-2 border-gray-900 flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl font-bold">
                {currentTab.icon}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-700">
                  {currentTab.badge}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-gray-900 leading-snug mt-1">
                {currentTab.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5 leading-relaxed">
                {currentTab.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Quick Search within tab */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari petunjuk..."
                className="pl-8 pr-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-bold text-gray-900 focus:outline-none w-44 sm:w-52 transition-all"
              />
            </div>

            <Link
              to={currentTab.route}
              className="px-4 py-2 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentTab.routeText}</span>
              <span className="material-symbols-outlined text-base">open_in_new</span>
            </Link>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredSections.map((sec, idx) => (
            <div
              key={idx}
              className="bg-gray-50/80 border-2 border-gray-200 hover:border-gray-900 rounded-2xl p-4 sm:p-5 space-y-3 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2.5 font-black text-sm text-gray-900 border-b border-gray-200 pb-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-900 text-primary-green flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-base">{sec.icon}</span>
                </div>
                <h3 className="leading-tight">{sec.title}</h3>
              </div>

              <ul className="space-y-2.5">
                {sec.points.map((pt, pIdx) => (
                  <li
                    key={pIdx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 font-medium leading-relaxed"
                  >
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

        {/* Frequently Asked Questions (FAQ) Box */}
        {filteredFaq.length > 0 && (
          <div className="bg-amber-50/60 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
              <span className="material-symbols-outlined text-xl text-amber-700">help</span>
              <h4>Pertanyaan Sering Ditanyakan (FAQ)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {filteredFaq.map((item, fIdx) => (
                <div
                  key={fIdx}
                  className="bg-white border-2 border-amber-200 rounded-xl p-3.5 space-y-1.5 shadow-sm"
                >
                  <span className="font-black text-xs text-gray-900 flex items-start gap-1.5 leading-snug">
                    <span className="text-amber-600">Q:</span>
                    <span>{item.q}</span>
                  </span>
                  <p className="text-[11px] sm:text-xs text-gray-600 font-medium leading-relaxed pl-4">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Pagination Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 flex-wrap gap-2">
          {(() => {
            const currentIdx = guideTabs.findIndex((t) => t.id === activeTab);
            const prevTab = currentIdx > 0 ? guideTabs[currentIdx - 1] : null;
            const nextTab = currentIdx < guideTabs.length - 1 ? guideTabs[currentIdx + 1] : null;

            return (
              <>
                {prevTab ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(prevTab.id);
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    <span>{prevTab.label}</span>
                  </button>
                ) : (
                  <div />
                )}

                {nextTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(nextTab.id);
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl border-2 border-gray-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto"
                  >
                    <span>{nextTab.label}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
