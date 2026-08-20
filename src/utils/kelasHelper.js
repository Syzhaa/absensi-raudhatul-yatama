/**
 * Kelas Helper - Frontend version
 * Konversi format kelas antara Roman (X, XI, XII) dan Numeric (10, 11, 12)
 */

const romanToNumericMap = {
  'X': '10',
  'XI': '11',
  'XII': '12',
};

const numericToRomanMap = {
  '10': 'X',
  '11': 'XI',
  '12': 'XII',
};

/**
 * Konversi kelas ke format tertentu
 * @param {string} kelas - Input kelas (X, XI, XII, 10, 11, 12)
 * @param {string} targetFormat - Target format: 'roman' atau 'numeric'
 * @returns {string} Kelas dalam format target
 */
export function convertKelasFormat(kelas, targetFormat = 'roman') {
  if (!kelas) return kelas;
  
  const normalized = String(kelas).trim().toUpperCase();
  
  // Jika target roman
  if (targetFormat === 'roman') {
    // Jika input sudah roman, return as-is
    if (numericToRomanMap[normalized]) {
      return numericToRomanMap[normalized];
    }
    // Jika input numeric, convert
    if (romanToNumericMap[normalized]) {
      return normalized;
    }
    // Return as-is jika tidak match
    return kelas;
  }
  
  // Jika target numeric
  if (targetFormat === 'numeric') {
    // Jika input sudah numeric, return as-is
    if (romanToNumericMap[normalized]) {
      return romanToNumericMap[normalized];
    }
    // Jika input roman, convert
    if (numericToRomanMap[normalized]) {
      return normalized;
    }
    // Return as-is jika tidak match
    return kelas;
  }
  
  return kelas;
}

/**
 * Get valid kelas list by format
 * @param {string} format - 'roman' atau 'numeric'
 * @returns {Array<string>}
 */
export function getValidKelas(format = 'roman') {
  return format === 'roman' ? ['X', 'XI', 'XII'] : ['10', '11', '12'];
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
