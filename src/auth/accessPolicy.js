export const AVAILABLE_PAGES = [
  {
    path: "/",
    label: "Home",
    title: "Dashboard Utama",
    icon: "home",
    description: "Halaman ringkasan statistik dan rekap cepat presensi harian santri & guru",
  },
  {
    path: "/scan",
    label: "Scan",
    title: "Scan QR Presensi",
    icon: "qr_code_scanner",
    description: "Pemindai kamera QR Code presensi santri dan guru secara cepat & real-time",
  },
  {
    path: "/students",
    label: "Siswa",
    title: "Data Santri / Siswa",
    icon: "group",
    description: "Manajemen data siswa, filter kelas, unduh barcode, dan cetak kartu presensi",
  },
  {
    path: "/teachers",
    label: "Guru",
    title: "Data Dewan Guru",
    icon: "badge",
    description: "Manajemen dewan guru, pengaturan akun login guru, dan kartu identitas guru",
  },
  {
    path: "/attendance",
    label: "Absen",
    title: "Rekap Data Presensi",
    icon: "calendar_month",
    description: "Rekap harian status kehadiran (Hadir, Terlambat, Sakit, Izin, Alpha) & input manual",
  },
  {
    path: "/holidays",
    label: "Libur",
    title: "Kalender Hari Libur",
    icon: "event",
    description: "Pengaturan hari libur nasional, libur pondok pesantren, dan cuti bersama",
  },
  {
    path: "/report",
    label: "Laporan",
    title: "Laporan & Statistik",
    icon: "assessment",
    description: "Rekapitulasi berkala, cetak lembar presensi, dan export file Excel bulanan",
  },
  {
    path: "/whatsapp-api",
    label: "WA Notifier",
    title: "WhatsApp API Gateway",
    icon: "forum",
    description: "Konfigurasi gateway WhatsApp, saluran API multi-grup, dan tes pengiriman",
  },
  {
    path: "/whatsapp-templates",
    label: "Template WA",
    title: "Template Pesan WhatsApp",
    icon: "sms",
    description: "Kustomisasi format pesan WhatsApp otomatis untuk notifikasi kehadiran dan keterlambatan",
  },
  {
    path: "/users",
    label: "User",
    title: "Manajemen Pengguna",
    icon: "manage_accounts",
    description: "Pengelolaan daftar akun pengguna dan staf sistem absensi digital",
  },
  {
    path: "/guide",
    label: "Panduan",
    title: "Buku Panduan",
    icon: "help",
    description: "Petunjuk teknis dan prosedur operasional penggunaan sistem absensi digital",
  },
];

export const DEFAULT_PERMISSIONS = {
  petugas_absen: {
    "/": true,
    "/scan": true,
    "/students": true,
    "/teachers": true,
    "/attendance": true,
    "/holidays": true,
    "/report": true,
    "/whatsapp-api": false,
    "/whatsapp-templates": false,
    "/users": false,
    "/guide": true,
  },
  guru: {
    "/": true,
    "/scan": true,
    "/students": false,
    "/teachers": false,
    "/attendance": true,
    "/holidays": false,
    "/report": true,
    "/whatsapp-api": false,
    "/whatsapp-templates": false,
    "/users": false,
    "/guide": true,
  },
};

export function isAdminRole(role) {
  return ["super_admin", "admin_yayasan", "admin_ma", "admin_mts"].includes(role);
}

export function menuForRole(role, permissions = null) {
  if (isAdminRole(role)) {
    return [
      ...AVAILABLE_PAGES,
      { path: "/profile", label: "Profil", title: "Profil Pengguna", icon: "account_circle" },
      { path: "/settings", label: "Setting", title: "Pengaturan Sistem", icon: "settings" },
    ];
  }

  const roleKey =
    role === "admin_akademik" || role === "petugas_absen"
      ? "petugas_absen"
      : role === "guru"
      ? "guru"
      : null;

  if (!roleKey) {
    return [
      { path: "/profile", label: "Profil", title: "Profil Pengguna", icon: "account_circle" },
    ];
  }

  const activePerms = permissions || DEFAULT_PERMISSIONS[roleKey] || {};

  const allowedPages = AVAILABLE_PAGES.filter((page) => {
    if (activePerms[page.path] !== undefined) {
      return Boolean(activePerms[page.path]);
    }
    return Boolean(DEFAULT_PERMISSIONS[roleKey]?.[page.path]);
  });

  return [
    ...allowedPages,
    { path: "/profile", label: "Profil", title: "Profil Pengguna", icon: "account_circle" },
  ];
}

export function canAccessPath(role, path, permissions = null) {
  if (!role) return false;
  if (path === "/profile") return true;
  if (path === "/settings") return isAdminRole(role);

  if (isAdminRole(role)) return true;

  const roleKey =
    role === "admin_akademik" || role === "petugas_absen"
      ? "petugas_absen"
      : role === "guru"
      ? "guru"
      : null;

  if (!roleKey) return false;

  const activePerms = permissions || DEFAULT_PERMISSIONS[roleKey] || {};
  if (activePerms[path] !== undefined) {
    return Boolean(activePerms[path]);
  }
  return Boolean(DEFAULT_PERMISSIONS[roleKey]?.[path]);
}

export function getFirstAllowedPath(role, permissions = null) {
  const menu = menuForRole(role, permissions);
  const candidate = menu.find((item) => item.path !== "/profile" && item.path !== "/settings");
  return candidate ? candidate.path : "/profile";
}
