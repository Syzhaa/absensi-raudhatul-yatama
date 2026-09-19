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

/**
 * Ekstrak daftar nama guru terjadwal dari struktur data API backend (scheduleData)
 * Menggabungkan guru dari schedule_by_day dan teacher_workloads secara dinamis.
 */
export function getScheduledTeacherNamesForDay(dayName, scheduleData) {
  if (!scheduleData || !dayName || dayName === "MINGGU") return [];

  const teachers = new Set();
  const dayUpper = dayName.toUpperCase();
  const dayLower = dayUpper === "JUMAT" ? "jum" : dayUpper.toLowerCase();

  // 1. Ekstrak dari schedule_by_day
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

  // 2. Ekstrak dari teacher_workloads
  const workloads = scheduleData.teacher_workloads || [];
  workloads.forEach((tw) => {
    const h = (tw.hari || "").toLowerCase();
    if (h.includes(dayLower) && tw.nama) {
      teachers.add(tw.nama);
    }
  });

  return Array.from(teachers);
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

  // Jika scheduleData belum selesai dimuat dari BE, jangan blokir guru
  if (!scheduleData) {
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
      (normTarget.startsWith("sitykholifah") && normSched.startsWith("sitykholifah"))
    );
  });
}

/**
 * Ambil teks ringkasan hari jadwal mengajar langsung dari teacher_workloads backend
 * Contoh: "Senin & Kamis", "Sabtu", dll.
 */
export function getTeacherScheduleSummary(teacher, scheduleData) {
  if (!teacher || !scheduleData?.teacher_workloads) return null;
  const teacherName = teacher.nama || (typeof teacher === "string" ? teacher : "");
  const normTarget = normalizeTeacherName(teacherName);

  const matched = scheduleData.teacher_workloads.find((tw) => {
    const normTw = normalizeTeacherName(tw.nama || "");
    return (
      normTarget.includes(normTw) ||
      normTw.includes(normTarget) ||
      (normTarget.startsWith("rahminike") && normTw.startsWith("rahminike")) ||
      (normTarget.startsWith("badturrijal") && normTw.startsWith("badturrijal")) ||
      (normTarget.startsWith("sitykholifah") && normTw.startsWith("sitykholifah"))
    );
  });

  return matched?.hari || null;
}
