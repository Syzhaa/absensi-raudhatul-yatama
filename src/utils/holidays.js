/**
 * Daftar Hari Libur Nasional Indonesia 2025-2026
 */
const NATIONAL_HOLIDAYS = {
  "2025-01-01": "Tahun Baru Masehi",
  "2025-01-27": "Isra Miraj Nabi Muhammad SAW",
  "2025-01-28": "Cuti Bersama Isra Miraj",
  "2025-01-29": "Tahun Baru Imlek 2576",
  "2025-03-29": "Hari Raya Nyepi (Tahun Baru Saka 1947)",
  "2025-03-31": "Hari Raya Idul Fitri 1446 H",
  "2025-04-01": "Hari Raya Idul Fitri 1446 H (Hari Kedua)",
  "2025-04-18": "Wafat Isa Al Masih",
  "2025-04-20": "Hari Raya Paskah",
  "2025-05-01": "Hari Buruh Internasional",
  "2025-05-12": "Hari Raya Waisak 2569 BE",
  "2025-05-29": "Kenaikan Isa Al Masih",
  "2025-06-01": "Hari Lahir Pancasila",
  "2025-06-07": "Hari Raya Idul Adha 1446 H",
  "2025-06-27": "Tahun Baru Hijriyah 1447 H",
  "2025-08-17": "Hari Kemerdekaan Republik Indonesia",
  "2025-09-05": "Maulid Nabi Muhammad SAW",
  "2025-12-25": "Hari Raya Natal",
  "2025-12-26": "Cuti Bersama Natal",
  "2026-01-01": "Tahun Baru Masehi",
  "2026-01-17": "Isra Miraj Nabi Muhammad SAW",
  "2026-02-17": "Tahun Baru Imlek 2577",
  "2026-03-19": "Hari Raya Idul Fitri 1447 H",
  "2026-03-20": "Hari Raya Idul Fitri 1447 H (Hari Kedua)",
  "2026-03-21": "Cuti Bersama Idul Fitri",
  "2026-03-25": "Hari Raya Nyepi (Tahun Baru Saka 1948)",
  "2026-04-03": "Wafat Isa Al Masih",
  "2026-04-05": "Hari Raya Paskah",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Isa Al Masih",
  "2026-05-23": "Hari Raya Waisak 2570 BE",
  "2026-05-27": "Hari Raya Idul Adha 1447 H",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-17": "Tahun Baru Hijriyah 1448 H",
  "2026-08-17": "Hari Kemerdekaan Republik Indonesia",
  "2026-09-25": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",
  "2026-12-26": "Cuti Bersama Natal",
};

export function isSunday(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCDay() === 0;
}

export function getNationalHolidayName(dateStr) {
  return NATIONAL_HOLIDAYS[dateStr.substring(0, 10)] || null;
}

export function getAutoHoliday(dateStr) {
  const key = dateStr.substring(0, 10);

  if (isSunday(key)) {
    return {
      name: "Hari Minggu",
      description: "Hari Minggu — Hari Libur Mingguan",
      applies_to: "all",
      is_auto: true,
    };
  }

  const nationalName = NATIONAL_HOLIDAYS[key];
  if (nationalName) {
    return {
      name: nationalName,
      description: nationalName + " — Hari Libur Nasional Indonesia",
      applies_to: "all",
      is_auto: true,
    };
  }

  return null;
}
