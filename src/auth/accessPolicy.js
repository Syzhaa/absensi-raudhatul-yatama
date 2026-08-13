const adminMenu = [
  { path: "/", label: "Dashboard", icon: "home" },
  { path: "/scan", label: "Scan QR", icon: "qr_code_scanner" },
  { path: "/students", label: "Siswa", icon: "group" },
  { path: "/teachers", label: "Guru", icon: "badge" },
  { path: "/attendance", label: "Absensi", icon: "calendar_month" },
  { path: "/holidays", label: "Kalender Libur", icon: "event" },
  { path: "/users", label: "Users", icon: "manage_accounts" },
  { path: "/settings", label: "Pengaturan", icon: "settings" },
];

const guruMenu = [
  { path: "/", label: "Dashboard", icon: "home" },
  { path: "/scan", label: "Scan QR", icon: "qr_code_scanner" },
  { path: "/attendance", label: "Daftar Hadir", icon: "fact_check" },
  { path: "/profile", label: "Profil", icon: "account_circle" },
];

export function menuForRole(role) {
  return role === "guru" ? guruMenu : adminMenu;
}

export function canAccessPath(role, path) {
  return menuForRole(role).some((item) => item.path === path);
}
