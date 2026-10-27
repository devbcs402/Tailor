/**
 * Client-Side Gujarati Transliteration & Phonetic Suggestion Engine
 *
 * Converts Latin-script English input / phonetic Gujarati pronunciation into Gujarati script:
 * Examples:
 * - "chhati" -> "છાતી"
 * - "lambai" -> "લંબાઈ"
 * - "kamar" -> "કમર"
 * - "khissani unchai" -> "ખિસ્સાની ઊંચાઈ"
 * - "baju" -> "બાજુ"
 */

// Curated dictionary for tailoring, anatomical & common transliterations
const COMMON_GUJARATI_MAP = {
  // Direct examples from requirements
  'chhati': 'છાતી',
  'lambai': 'લંબાઈ',
  'kamar': 'કમર',
  'khissani unchai': 'ખિસ્સાની ઊંચાઈ',
  'khissani': 'ખિસ્સાની',
  'unchai': 'ઊંચાઈ',
  'baju': 'બાજુ',

  // Common measurement names & variations
  'chati': 'છાતી',
  'chaati': 'છાતી',
  'chest': 'છાતી',
  'lambi': 'લંબાઈ',
  'length': 'લંબાઈ',
  'waist': 'કમર',
  'west': 'વેસ્ટ',
  'seat': 'સીટ',
  'hip': 'હીપ',
  'seat/hip': 'સીટ / હીપ',
  'shoulder': 'શોલ્ડર',
  'kandho': 'ખંભો',
  'khambho': 'ખંભો',
  'khanbho': 'ખંભો',
  'sleeve': 'સ્લીવ',
  'sleeve length': 'બાય / સ્લીવ',
  'bay': 'બાય',
  'baay': 'બાય',
  'bahi': 'બાંહી',
  'cuff': 'કફ',
  'opening': 'મોરી',
  'sleeve opening': 'કફ / મોરી',
  'neck': 'ગળું',
  'galu': 'ગળું',
  'gala': 'ગળા',
  'collar': 'કોલર',
  'front': 'સામે',
  'front chest': 'સામે ની છાતી',
  'back': 'પાછળ',
  'back pleat': 'બેક પ્લીટ',
  'pleat': 'પ્લીટ',
  'pocket': 'ખિસ્સું',
  'khissu': 'ખિસ્સું',
  'pocket height': 'ખિસ્સાની ઊંચાઈ',
  'pocket width': 'ખિસ્સાની પહોળાઈ',
  'paholai': 'પહોળાઈ',
  'rundi': 'રૂંદી',
  'rundai': 'રૂંદાઈ',
  'thigh': 'જાંઘ',
  'jangh': 'જાંઘ',
  'jhangh': 'જાંઘ',
  'thai': 'થાઈ',
  'knee': 'ઘૂંટણ',
  'ghutan': 'ઘૂંટણ',
  'ghuntan': 'ઘૂંટણ',
  'ni': 'ની',
  'bottom': 'બોટમ',
  'bottom opening': 'મોરી / બોટમ',
  'mori': 'મોરી',
  'crotch': 'લટક',
  'rise': 'હાઈ',
  'latak': 'લટક',
  'hai': 'હાઈ',
  'crotch rise': 'લટક / હાઈ',
  'gher': 'ઘેર',
  'ghero': 'ઘેરો',
  'daman': 'દામન',
  'inseem': 'ઇનસીમ',
  'inseam': 'ઇનસીમ',
  'outseam': 'આઉટસીમ',
  'belt': 'બેલ્ટ',
  'chain': 'ચેન',
  'button': 'બટન',
  'astar': 'અસ્તર',
  'kapad': 'કાપડ',
  'patti': 'પટ્ટી',
  'pati': 'પટ્ટી',
  'watch pocket': 'વોચ પોકેટ',
  'watch pocket depth': 'વોચ પોકેટ ઊંડાઈ',
  'undai': 'ઊંડાઈ',
  'coller': 'કોલર',
  'kollar': 'કોલર',
  'pockets': 'ખિસ્સા',
  'khissa': 'ખિસ્સા',
  'half': 'હાફ',
  'full': 'ફુલ',
  'cut': 'કટ',
  'fitting': 'ફિટિંગ',
  'loose': 'લૂઝ',
};

// Alternatives for common English words
const ALTERNATIVES_MAP = {
  'chest': ['છાતી', 'ચેસ્ટ'],
  'length': ['લંબાઈ', 'લેન્થ'],
  'waist': ['કમર', 'વેસ્ટ'],
  'shoulder': ['શોલ્ડર', 'ખંભો'],
  'pocket': ['ખિસ્સું', 'પોકેટ'],
  'pocket height': ['ખિસ્સાની ઊંચાઈ', 'પોકેટ હાઈટ'],
  'sleeve': ['સ્લીવ', 'બાય'],
  'neck': ['ગળું', 'કોલર'],
  'cuff': ['કફ', 'મોરી'],
  'bottom': ['બોટમ', 'મોરી'],
  'thigh': ['જાંઘ', 'થાઈ'],
  'knee': ['ઘૂંટણ', 'ની'],
  'rise': ['હાઈ', 'લટક'],
  'crotch': ['લટક', 'ક્રોચ'],
  'pleat': ['પ્લીટ', 'ચપટી'],
  'chhati': ['છાતી'],
  'lambai': ['લંબાઈ'],
  'kamar': ['કમર'],
  'khissani unchai': ['ખિસ્સાની ઊંચાઈ'],
  'baju': ['બાજુ'],
};

const INDEPENDENT_VOWELS = {
  'aa': 'આ',
  'a': 'અ',
  'ee': 'ઈ',
  'ii': 'ઈ',
  'i': 'ઇ',
  'oo': 'ઊ',
  'uu': 'ઊ',
  'u': 'ઉ',
  'e': 'એ',
  'ai': 'ઐ',
  'o': 'ઓ',
  'au': 'ઔ',
  'ou': 'ઔ',
};

const VOWEL_MATRAS = {
  'aa': 'ા',
  'a': '',
  'ee': 'ી',
  'ii': 'ી',
  'i': 'િ',
  'oo': 'ૂ',
  'uu': 'ૂ',
  'u': 'ુ',
  'e': 'ે',
  'ai': 'ૈ',
  'o': 'ો',
  'au': 'ૌ',
  'ou': 'ૌ',
};

const CONSONANTS = [
  ['chh', 'છ'],
  ['kh', 'ખ'],
  ['gh', 'ઘ'],
  ['ch', 'ચ'],
  ['jh', 'ઝ'],
  ['th', 'થ'],
  ['dh', 'ધ'],
  ['ph', 'ફ'],
  ['bh', 'ભ'],
  ['sh', 'શ'],
  ['shh', 'ષ'],
  ['gn', 'જ્ઞ'],
  ['gy', 'જ્ઞ'],
  ['ksh', 'ક્ષ'],
  ['tr', 'ત્ર'],
  ['k', 'ક'],
  ['g', 'ગ'],
  ['j', 'જ'],
  ['z', 'ઝ'],
  ['t', 'ત'],
  ['d', 'દ'],
  ['n', 'ન'],
  ['p', 'પ'],
  ['f', 'ફ'],
  ['b', 'બ'],
  ['m', 'મ'],
  ['y', 'ય'],
  ['r', 'ર'],
  ['l', 'લ'],
  ['v', 'વ'],
  ['w', 'વ'],
  ['s', 'સ'],
  ['h', 'હ'],
];

/**
 * Phonetically transliterates a single word from Latin to Gujarati script
 */
function transliterateSingleWord(word) {
  const clean = word.toLowerCase().trim();
  if (!clean) return '';

  if (COMMON_GUJARATI_MAP[clean]) {
    return COMMON_GUJARATI_MAP[clean];
  }

  let result = '';
  let i = 0;
  const n = clean.length;

  while (i < n) {
    // Check common prefixes / specific word starts like 'un-'
    if (i === 0 && clean.startsWith('un') && n > 2) {
      result += 'ઊં';
      i += 2;
      continue;
    }

    // Check anusvara 'am' or 'an' before consonant
    if (clean.substring(i, i + 2) === 'am' || clean.substring(i, i + 2) === 'an') {
      const nextChar = clean[i + 2];
      if (nextChar && !'aeiou'.includes(nextChar)) {
        result += 'ં';
        i += 2;
        continue;
      }
    }

    // Check independent vowels if at beginning or preceded by vowel
    let foundVowel = false;
    for (const v of ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ou', 'a', 'i', 'u', 'e', 'o']) {
      if (clean.startsWith(v, i)) {
        if (i === 0) {
          result += INDEPENDENT_VOWELS[v] || 'અ';
        } else if (result.endsWith('ા') && (v === 'i' || v === 'ee')) {
          result += 'ઈ'; // e.g. -ai suffix as in lambai, unchai -> ાઈ
        } else {
          result += INDEPENDENT_VOWELS[v] || '';
        }
        i += v.length;
        foundVowel = true;
        break;
      }
    }
    if (foundVowel) continue;

    // Check double consonants (e.g. 'ss' in khissani -> સ્સ, 'tt' in patti -> ટ્ટ)
    let isDoubleConsonant = false;
    for (const [seq, char] of CONSONANTS) {
      if (clean.startsWith(seq + seq, i)) {
        result += char + '\u0ACD' + char;
        i += seq.length * 2;
        isDoubleConsonant = true;
        break;
      }
    }
    if (isDoubleConsonant) {
      for (const v of ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ou', 'a', 'i', 'u', 'e', 'o']) {
        if (clean.startsWith(v, i)) {
          if (v === 'i' && i + v.length === n) {
            result += 'ી'; // Word-final i is dirgha ી
          } else {
            result += VOWEL_MATRAS[v] !== undefined ? VOWEL_MATRAS[v] : '';
          }
          i += v.length;
          break;
        }
      }
      continue;
    }

    // Check single or compound consonant
    let foundConsonant = false;
    for (const [seq, char] of CONSONANTS) {
      if (clean.startsWith(seq, i)) {
        i += seq.length;

        // Check vowel following consonant
        let matra = '';
        let matchedVowelLen = 0;
        for (const v of ['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ou', 'a', 'i', 'u', 'e', 'o']) {
          if (clean.startsWith(v, i)) {
            matchedVowelLen = v.length;
            if (v === 'i' && i + matchedVowelLen === n) {
              matra = 'ી'; // Word-final i after consonant is dirgha ી (e.g. chhati -> છાતી)
            } else {
              matra = VOWEL_MATRAS[v];
            }
            break;
          }
        }

        if (matchedVowelLen > 0) {
          result += char + matra;
          i += matchedVowelLen;
        } else {
          // Consonant with implicit 'a' (no matra)
          result += char;
        }
        foundConsonant = true;
        break;
      }
    }
    if (foundConsonant) continue;

    // Retain punctuation, numbers, spaces
    result += clean[i];
    i++;
  }

  return result;
}

/**
 * Transliterates an entire phrase or multi-word string into Gujarati script
 * @param {string} text
 * @returns {string} Gujarati transliteration
 */
export const transliterateToGujarati = (text = '') => {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  // Check exact phrase match first
  if (COMMON_GUJARATI_MAP[lower]) {
    return COMMON_GUJARATI_MAP[lower];
  }

  // Word-by-word transliteration
  const words = trimmed.split(/(\s+)/);
  return words
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return transliterateSingleWord(part);
    })
    .join('');
};

/**
 * Returns a list of Gujarati transliteration suggestions for a given input
 * @param {string} text
 * @returns {string[]} Suggestions array
 */
export const getGujaratiSuggestions = (text = '') => {
  if (!text || typeof text !== 'string') return [];
  const clean = text.trim().toLowerCase();
  if (!clean) return [];

  const suggestions = [];

  // Check predefined alternatives first
  if (ALTERNATIVES_MAP[clean]) {
    for (const alt of ALTERNATIVES_MAP[clean]) {
      if (!suggestions.includes(alt)) suggestions.push(alt);
    }
  }

  // Generate phonetic transliteration
  const phonetic = transliterateToGujarati(text);
  if (phonetic && !suggestions.includes(phonetic)) {
    suggestions.push(phonetic);
  }

  return suggestions;
};
