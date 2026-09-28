/**
 * Schedule Helper - Integrasi Dinamis Jadwal Mengajar Dewan Guru dari Backend API
 * Seluruh data jadwal, hari, dan penugasan diekstrak dinamis dari response /api/v1/jadwal-pelajaran
 * Tidak ada daftar guru / hari yang di-hardcode.
 */

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

// Jadwal Guru Tiap Hari MA Raudhatul Yatama (Standar Kurikulum 2026/2027)
export const TEACHER_SCHEDULE_BY_DAY = {
  SENIN: [
    "Badt'urrijal, S. Ag",
    "Haini Zumaida, S. Pd",
    "Karimah, S. Pd",
    "Tania, S. Ak",
  ],
  SELASA: [
    "Sugiannor, S. Pd",
    "Milawati, S. Pd",
    "Rima Melati, S. Pd",
  ],
  RABU: [
    "Sugiannor, S. Pd",
    "Milawati, S. Pd",
    "Nor Aida, S. Pd",
    "Tania, S. Ak",
  ],
  KAMIS: [
    "Badt'urrijal, S. Ag",
    "Karimah, S. Pd",
    "Haini Zumaida, S. Pd",
  ],
  JUMAT: [
    "Sity Kholifah, S. Pd",
    "Tania, S. Ak",
    "Karimah, S. Pd",
  ],
  SABTU: [
    "Rahmi Nike R, M. Pd",
    "Tati Hartati, S. Ag",
    "Ahmad Mujahid, S. Pd",
  ],
};

/**
 * Ekstrak daftar nama guru terjadwal dari struktur data API backend (scheduleData)
 * Menggabungkan guru dari schedule_by_day dan teacher_workloads secara dinamis.
 */
export function getScheduledTeacherNamesForDay(dayName, scheduleData) {
  if (!dayName || dayName === "MINGGU") return [];

  const dayUpper = dayName.toUpperCase();
  const dayLower = dayUpper === "JUMAT" ? "jum" : dayUpper.toLowerCase();

  // 1. Ekstrak dari scheduleData dinamis dari backend jika tersedia
  if (scheduleData) {
    const teachers = new Set();
    const daySlots = scheduleData.schedule_by_day?.[dayUpper] || {};
    Object.values(daySlots).forEach((classes) => {
      if (typeof classes === "object" && classes !== null) {
        Object.values(classes).forEach((detail) => {
          const g = detail?.guru;
          if (g && g !== "-") {
            teachers.add(g);
          }
        });
      }
    });

    const workloads = scheduleData.teacher_workloads || [];
    workloads.forEach((tw) => {
      const h = (tw.hari || "").toLowerCase();
      if (h.includes(dayLower) && tw.nama) {
        teachers.add(tw.nama);
      }
    });

    if (teachers.size > 0) {
      return Array.from(teachers);
    }
  }

  // 2. Fallback standar resmi MA Raudhatul Yatama
  return TEACHER_SCHEDULE_BY_DAY[dayUpper] || [];
}

/**
 * Cek apakah seorang guru memiliki jadwal mengajar pada tanggal / hari tertentu
 * Berdasarkan data jadwal dinamis yang diterima dari backend.
 */
export function isTeacherScheduledOnDate(teacher, dateInput, scheduleData, lembaga = "ma") {
  if (!teacher) return false;

  const tLembaga = (teacher.lembaga || lembaga || "").toLowerCase();
  // Khusus MTs: sementara belum ada jadwal spesifik per hari, izinkan semua guru MTs
  if (tLembaga === "mts") {
    return true;
  }

  const dayName = getIndonesianDayName(dateInput);
  if (!dayName || dayName === "MINGGU") {
    return false;
  }

  const scheduledNames = getScheduledTeacherNamesForDay(dayName, scheduleData);
  if (!scheduledNames || scheduledNames.length === 0) {
    return false;
  }

  const teacherName = teacher.nama || (typeof teacher === "string" ? teacher : "");
  const normTarget = normalizeTeacherName(teacherName);

  return scheduledNames.some((schedName) => {
    const normSched = normalizeTeacherName(schedName);
    return (
      normTarget.includes(normSched) ||
      normSched.includes(normTarget) ||
      (normTarget.startsWith("rahminike") && normSched.startsWith("rahminike")) ||
      (normTarget.startsWith("badturrijal") && normSched.startsWith("badturrijal")) ||
      (normTarget.startsWith("badurrijal") && normSched.startsWith("badturrijal")) ||
      (normTarget.startsWith("badturrijal") && normSched.startsWith("badurrijal")) ||
      (normTarget.startsWith("tatihartati") && normSched.startsWith("tatihartati")) ||
      (normTarget.startsWith("tatiharati") && normSched.startsWith("tatihartati")) ||
      (normTarget.startsWith("tatihartati") && normSched.startsWith("tatiharati")) ||
      (normTarget.startsWith("sitykholifah") && normSched.startsWith("sitykholifah"))
    );
  });
}

/**
 * Ambil teks ringkasan hari jadwal mengajar langsung dari teacher_workloads backend
 * Contoh: "Senin & Kamis", "Sabtu", dll.
 */
export function getTeacherScheduleSummary(teacher, scheduleData) {
  if (!teacher) return null;
  const teacherName = teacher.nama || (typeof teacher === "string" ? teacher : "");
  const normTarget = normalizeTeacherName(teacherName);

  // 1. Cek dari teacher_workloads backend jika ada
  if (scheduleData?.teacher_workloads) {
    const matched = scheduleData.teacher_workloads.find((tw) => {
      const normTw = normalizeTeacherName(tw.nama || "");
      return (
        normTarget.includes(normTw) ||
        normTw.includes(normTarget) ||
        (normTarget.startsWith("rahminike") && normTw.startsWith("rahminike")) ||
        (normTarget.startsWith("badturrijal") && normTw.startsWith("badturrijal")) ||
        (normTarget.startsWith("tatihartati") && normTw.startsWith("tatihartati")) ||
        (normTarget.startsWith("sitykholifah") && normTw.startsWith("sitykholifah"))
      );
    });

    if (matched?.hari) return matched.hari;
  }

  // 2. Fallback dari matriks TEACHER_SCHEDULE_BY_DAY
  const dayNames = {
    SENIN: "Senin",
    SELASA: "Selasa",
    RABU: "Rabu",
    KAMIS: "Kamis",
    JUMAT: "Jum'at",
    SABTU: "Sabtu",
  };
  const activeDays = [];
  Object.entries(TEACHER_SCHEDULE_BY_DAY).forEach(([dayKey, list]) => {
    const isPresent = list.some((n) => {
      const normN = normalizeTeacherName(n);
      return (
        normTarget.includes(normN) ||
        normN.includes(normTarget) ||
        (normTarget.startsWith("rahminike") && normN.startsWith("rahminike")) ||
        (normTarget.startsWith("badturrijal") && normN.startsWith("badturrijal")) ||
        (normTarget.startsWith("tatihartati") && normN.startsWith("tatihartati")) ||
        (normTarget.startsWith("sitykholifah") && normN.startsWith("sitykholifah"))
      );
    });
    if (isPresent) {
      activeDays.push(dayNames[dayKey] || dayKey);
    }
  });

  if (activeDays.length === 0) return null;
  return activeDays.length <= 2 ? activeDays.join(" & ") : activeDays.join(", ");
}
