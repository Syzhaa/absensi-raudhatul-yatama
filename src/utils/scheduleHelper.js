/**
 * Schedule Helper - Jadwal Mengajar Dewan Guru MA Raudhatul Yatama
 * Berdasarkan Surat Keputusan Pembagian Tugas Mengajar Semester Ganjil 2026/2027
 */

export const TEACHER_SCHEDULE_MA = {
  SENIN: [
    "Badt'urrijal, S. Ag",
    "Haini Zumaida, S. Pd",
    "Karimah, S. Pd",
    "Tania, S. Ak",
  ],
  SELASA: [
    "Milawati, S. Pd",
    "Rima Melati, S. Pd",
    "Sugiannor, S. Pd",
    "Tania, S. Ak",
  ],
  RABU: [
    "Milawati, S. Pd",
    "Nor Aida, S. Pd",
    "Rima Melati, S. Pd",
    "Sugiannor, S. Pd",
    "Tania, S. Ak",
  ],
  KAMIS: [
    "Badt'urrijal, S. Ag",
    "Haini Zumaida, S. Pd",
    "Karimah, S. Pd",
  ],
  JUMAT: [
    "Karimah, S. Pd",
    "Sity Kholifah, S. Pd",
    "Tania, S. Ak",
  ],
  SABTU: [
    "Ahmad Mujahid, S. Pd",
    "Rahmi Nike Rosahin, M. Pd",
    "Rahmi Nike R, M. Pd",
    "Tati Hartati, S. Ag",
  ],
  MINGGU: [],
};

const DAY_NAMES_ID = [
  "MINGGU", // 0
  "SENIN",  // 1
  "SELASA", // 2
  "RABU",   // 3
  "KAMIS",  // 4
  "JUMAT",  // 5
  "SABTU",  // 6
];

/**
 * Konversi string YYYY-MM-DD atau Date objek ke nama hari Bahasa Indonesia
 */
export function getIndonesianDayName(dateInput) {
  if (!dateInput) return "";
  let d;
  if (typeof dateInput === "string") {
    const parts = dateInput.split("-");
    if (parts.length === 3) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = new Date(dateInput);
  }
  const dayIndex = d.getDay();
  return DAY_NAMES_ID[dayIndex] || "";
}

/**
 * Normalisasi nama untuk pencocokan toleran gelar / spasi / tanda baca
 */
export function normalizeTeacherName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Cek apakah seorang guru memiliki jadwal mengajar pada tanggal / hari tertentu
 */
export function isTeacherScheduledOnDate(teacher, dateInput, lembaga = "ma") {
  if (!teacher) return false;

  const tLembaga = (teacher.lembaga || lembaga || "").toLowerCase();
  // Khusus MTs: jika belum memiliki mapping jadwal per hari, tampilkan semua guru MTs
  if (tLembaga === "mts") {
    return true;
  }

  const dayName = getIndonesianDayName(dateInput);
  if (!dayName || dayName === "MINGGU") {
    return false;
  }

  const scheduledNames = TEACHER_SCHEDULE_MA[dayName] || [];
  const teacherName = teacher.nama || (typeof teacher === "string" ? teacher : "");
  const normTarget = normalizeTeacherName(teacherName);

  return scheduledNames.some((schedName) => {
    const normSched = normalizeTeacherName(schedName);
    return (
      normTarget.includes(normSched) ||
      normSched.includes(normTarget) ||
      (normTarget.startsWith("rahminike") && normSched.startsWith("rahminike")) ||
      (normTarget.startsWith("badturrijal") && normSched.startsWith("badturrijal")) ||
      (normTarget.startsWith("sitykholifah") && normSched.startsWith("sitykholifah"))
    );
  });
}

/**
 * Ambil daftar hari di mana guru ini memiliki jadwal
 */
export function getTeacherScheduledDays(teacher) {
  if (!teacher) return [];
  const teacherName = teacher.nama || (typeof teacher === "string" ? teacher : "");
  const days = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  return days.filter((day) => {
    const scheduledNames = TEACHER_SCHEDULE_MA[day] || [];
    const normTarget = normalizeTeacherName(teacherName);
    return scheduledNames.some((schedName) => {
      const normSched = normalizeTeacherName(schedName);
      return (
        normTarget.includes(normSched) ||
        normSched.includes(normTarget) ||
        (normTarget.startsWith("rahminike") && normSched.startsWith("rahminike")) ||
        (normTarget.startsWith("badturrijal") && normSched.startsWith("badturrijal")) ||
        (normTarget.startsWith("sitykholifah") && normSched.startsWith("sitykholifah"))
      );
    });
  });
}

/**
 * Ambil teks ringkasan hari jadwal mengajar (contoh: "Senin & Kamis")
 */
export function getTeacherScheduleSummary(teacher) {
  const days = getTeacherScheduledDays(teacher);
  if (!days || days.length === 0) return null;
  const formatted = days.map((d) => {
    if (d === "JUMAT") return "Jum'at";
    return d.charAt(0) + d.slice(1).toLowerCase();
  });
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return formatted.join(", ");
}
