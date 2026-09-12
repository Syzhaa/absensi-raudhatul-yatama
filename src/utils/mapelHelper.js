/**
 * Mapel Helper - Manajemen Mata Pelajaran & Penugasan Guru per Kelas
 */

export const DEFAULT_MAPEL_LIST = [
  "Bahasa Arab",
  "Fiqih",
  "Qur’an Hadist",
  "Bahasa Inggris",
  "Pendidikan Pancasila",
  "Penjaskes",
  "Sosiologi",
  "Prakarya",
  "Sejarah Peminatan",
  "Geografi",
  "Kimia",
  "Akidah Akhlak",
  "Bahasa Indonesia",
  "Seni Budaya",
  "Matematika",
  "Ekonomi",
  "TIKNOLOGI",
  "SKI",
  "Fisika",
  "Biologi",
  "Mulok",
];

const STORAGE_KEY = "yatama_custom_mapel_list";

export function getCustomMapelList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomMapel(newMapel) {
  if (!newMapel || !newMapel.trim()) return;
  const clean = newMapel.trim();
  const current = getCustomMapelList();
  if (!DEFAULT_MAPEL_LIST.includes(clean) && !current.includes(clean)) {
    const updated = [...current, clean];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export function getAllMapelList() {
  const custom = getCustomMapelList();
  const set = new Set([...DEFAULT_MAPEL_LIST, ...custom]);
  return Array.from(set);
}

/**
 * Parse string "SKI (Kelas X), SKI (Kelas XI), Matematika"
 * into array of { mapel, kelas }
 */
export function parseAssignments(str) {
  if (!str) return [];
  const items = String(str).split(",").map((s) => s.trim()).filter(Boolean);
  return items.map((item) => {
    const match = item.match(/^(.+?)\s*\((?:Kelas\s*)?([^)]+)\)$/i);
    if (match) {
      return { mapel: match[1].trim(), kelas: match[2].trim() };
    }
    return { mapel: item, kelas: "Semua" };
  });
}

/**
 * Format array of { mapel, kelas } into single string
 */
export function serializeAssignments(assignments = []) {
  return assignments
    .map((a) => (a.kelas && a.kelas !== "Semua" ? `${a.mapel} (Kelas ${a.kelas})` : a.mapel))
    .join(", ");
}
