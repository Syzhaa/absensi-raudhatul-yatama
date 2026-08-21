/**
 * Kelas Helper - Frontend version
 * Konversi format kelas antara Roman (VII, VIII, IX, X, XI, XII) dan Numeric (7, 8, 9, 10, 11, 12)
 */

export const romanToNumericMap = {
  'I': '1',
  'II': '2',
  'III': '3',
  'IV': '4',
  'V': '5',
  'VI': '6',
  'VII': '7',
  'VIII': '8',
  'IX': '9',
  'X': '10',
  'XI': '11',
  'XII': '12',
};

export const numericToRomanMap = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
  '10': 'X',
  '11': 'XI',
  '12': 'XII',
};

/**
 * Get numeric sorting value of a kelas (1..12)
 */
export function getKelasNumericVal(kelas) {
  if (!kelas) return 999;
  const raw = String(kelas).trim().toUpperCase();
  const cleaned = raw.replace(/^KELAS\s*/i, '').trim();

  // Check Roman prefix first
  const romanMatch = cleaned.match(/^(XII|XI|IX|VIII|VII|VI|IV|V|III|II|I|X)/i);
  if (romanMatch && romanToNumericMap[romanMatch[1].toUpperCase()]) {
    return parseInt(romanToNumericMap[romanMatch[1].toUpperCase()], 10);
  }

  // Check Numeric prefix
  const numMatch = cleaned.match(/^(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return 999;
}

/**
 * Sort a list of kelas strings by their grade level order (7, 8, 9, 10, 11, 12)
 */
export function sortKelasList(kelasList = []) {
  return [...kelasList].sort((a, b) => {
    const valA = getKelasNumericVal(a);
    const valB = getKelasNumericVal(b);
    if (valA !== valB) return valA - valB;
    return String(a).localeCompare(String(b));
  });
}

/**
 * Konversi kelas ke format tertentu (roman | numeric)
 * Mendukung format tunggal maupun kombinasi (misal: "7", "VII", "7A", "VII-B", "10 IPA 1", "Kelas 8")
 * @param {string} kelas - Input kelas
 * @param {string} targetFormat - Target format: 'roman' atau 'numeric'
 * @returns {string} Kelas dalam format target
 */
export function convertKelasFormat(kelas, targetFormat = 'roman') {
  if (!kelas) return kelas;
  
  const raw = String(kelas).trim();
  const hasKelasPrefix = /^KELAS\s+/i.test(raw);
  const withoutPrefix = raw.replace(/^KELAS\s+/i, '').trim();

  // Match Roman numerals at start
  const romanMatch = withoutPrefix.match(/^(XII|XI|IX|VIII|VII|VI|IV|V|III|II|I|X)([\s\.\-_].*|[A-Za-z].*|$)/i);
  // Match Digits at start
  const numericMatch = withoutPrefix.match(/^(\d+)([\s\.\-_].*|[A-Za-z].*|$)/);

  let converted = withoutPrefix;

  if (targetFormat === 'roman') {
    if (numericMatch) {
      const num = numericMatch[1];
      const suffix = numericMatch[2] || '';
      if (numericToRomanMap[num]) {
        converted = numericToRomanMap[num] + suffix;
      }
    }
  } else if (targetFormat === 'numeric') {
    if (romanMatch) {
      const rom = romanMatch[1].toUpperCase();
      const suffix = romanMatch[2] || '';
      if (romanToNumericMap[rom]) {
        converted = romanToNumericMap[rom] + suffix;
      }
    }
  }

  return hasKelasPrefix ? `Kelas ${converted}` : converted;
}

/**
 * Get valid kelas list by format and optional lembaga
 * @param {string} format - 'roman' atau 'numeric'
 * @param {string} lembaga - 'mts' atau 'ma'
 * @returns {Array<string>}
 */
export function getValidKelas(format = 'roman', lembaga = null) {
  const lem = lembaga ? String(lembaga).toLowerCase() : null;
  if (lem === 'mts') {
    return format === 'roman' ? ['VII', 'VIII', 'IX'] : ['7', '8', '9'];
  }
  if (lem === 'ma') {
    return format === 'roman' ? ['X', 'XI', 'XII'] : ['10', '11', '12'];
  }
  return format === 'roman'
    ? ['VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    : ['7', '8', '9', '10', '11', '12'];
}

/**
 * Validate kelas format
 * @param {string} kelas
 * @param {string} format
 * @returns {boolean}
 */
export function validateKelas(kelas, format = 'roman') {
  const normalized = String(kelas).trim().toUpperCase();
  const validList = getValidKelas(format);
  return validList.includes(normalized);
}
