// Abbreviations that should stay in capitals.
const KEEP_UPPER = new Set([
  'LH', 'RH', 'LED', 'ABS', 'UD', 'GVM', 'FAW', 'DAF', 'MAN', 'ECU', 'USB', 'AC', 'DC', 'HID', 'PTO', 'OEM',
  '4X4', 'HVAC', 'EBS', 'ASR', 'DPF', 'EGR', 'SCR', 'ADR', 'GPS',
])
// Short joining words stay lower case unless they start the name.
const SMALL_WORDS = new Set(['a', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function tidyWord(word: string, isFirst: boolean): string {
  if (!word) return word
  const upper = word.toUpperCase()
  if (KEEP_UPPER.has(upper)) return upper
  // Measurements and numbers: 137CM -> 137cm, 27.5 X 23.5 -> 27.5 x 23.5
  if (/^\d/.test(word) || upper === 'X') return word.toLowerCase()
  const lower = word.toLowerCase()
  if (!isFirst && SMALL_WORDS.has(lower)) return lower
  // Capitalise each part of hyphenated words (Mercedes-Benz)
  return lower.replace(/(^|-)([a-z])/g, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

/**
 * "COVER MIRROR ARM LOWER LH" -> "Cover Mirror Arm Lower LH",
 * "GRILL WIDE 137CM" -> "Grill Wide 137cm", "FueL Cap" -> "Fuel Cap".
 * Also collapses repeated spaces.
 */
export function tidyProductName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) =>
      word
        .split('/')
        .map((part) => tidyWord(part, index === 0))
        .join('/'),
    )
    .join(' ')
}
