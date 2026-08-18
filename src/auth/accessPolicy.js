const adminMenu = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/scan", label: "Scan", icon: "qr_code_scanner" },
  { path: "/students", label: "Siswa", icon: "group" },
  { path: "/teachers", label: "Guru", icon: "badge" },
  { path: "/attendance", label: "Absen", icon: "calendar_month" },
  { path: "/holidays", label: "Libur", icon: "event" },
  { path: "/users", label: "User", icon: "manage_accounts" },
  { path: "/whatsapp-api", label: "WA Notifier", icon: "forum" },
  { path: "/profile", label: "Profil", icon: "account_circle" },
  { path: "/settings", label: "Setting", icon: "settings" },
];

const guruMenu = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/scan", label: "Scan", icon: "qr_code_scanner" },
  { path: "/attendance", label: "Absen", icon: "fact_check" },
  { path: "/profile", label: "Profil", icon: "account_circle" },
];

export function menuForRole(role) {
  return role === "guru" ? guruMenu : adminMenu;
}

export function canAccessPath(role, path) {
  return menuForRole(role).some((item) => item.path === path);
}
