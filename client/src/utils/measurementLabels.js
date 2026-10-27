/**
 * Tailor measurement field configurations in English
 */

export const REQUIRED_SHIRT_FIELDS = ['length', 'chest', 'waist', 'shoulder', 'sleeveLength'];
export const REQUIRED_PANT_FIELDS = ['length', 'waist', 'hip', 'bottomOpening'];

export const SHIRT_FIELDS = [
  { key: 'length', label: 'Length', gujaratiLabel: 'લંબાઈ', placeholder: 'e.g. 28.5', hint: 'Top to bottom length', required: true },
  { key: 'chest', label: 'Chest', gujaratiLabel: 'છાતી', placeholder: 'e.g. 40', hint: 'Chest circumference', required: true },
  { key: 'waist', label: 'Waist', gujaratiLabel: 'કમર', placeholder: 'e.g. 36', hint: 'Shirt waist measurement', required: true },
  { key: 'shoulder', label: 'Shoulder', gujaratiLabel: 'શોલ્ડર', placeholder: 'e.g. 18', hint: 'Shoulder width', required: true },
  { key: 'sleeveLength', label: 'Sleeve Length', gujaratiLabel: 'બાય / સ્લીવ', placeholder: 'e.g. 24', hint: 'Arm sleeve length', required: true },
  { key: 'sleeveOpening', label: 'Cuff / Opening', gujaratiLabel: 'કફ / મોરી', placeholder: 'e.g. 9.5', hint: 'Cuff circumference', required: false },
  { key: 'neck', label: 'Neck / Collar', gujaratiLabel: 'કોલર / ગળું', placeholder: 'e.g. 15.5', hint: 'Collar size', required: false },
  { key: 'frontChest', label: 'Front Chest', gujaratiLabel: 'સામે ની છાતી', placeholder: 'e.g. 19.5', hint: 'Front measurement', required: false },
];

export const PANT_FIELDS = [
  { key: 'length', label: 'Length', gujaratiLabel: 'લંબાઈ', placeholder: 'e.g. 39', hint: 'Total pant length', required: true },
  { key: 'waist', label: 'Waist', gujaratiLabel: 'કમર', placeholder: 'e.g. 34', hint: 'Waist circumference', required: true },
  { key: 'hip', label: 'Hip / Seat', gujaratiLabel: 'સીટ / હીપ', placeholder: 'e.g. 40', hint: 'Seat circumference', required: true },
  { key: 'thigh', label: 'Thigh', gujaratiLabel: 'જાંઘ / થાઈ', placeholder: 'e.g. 23', hint: 'Thigh measurement', required: false },
  { key: 'knee', label: 'Knee', gujaratiLabel: 'ઘૂંટણ / ની', placeholder: 'e.g. 16', hint: 'Knee circumference', required: false },
  { key: 'bottomOpening', label: 'Bottom Opening', gujaratiLabel: 'મોરી / બોટમ', placeholder: 'e.g. 14.5', hint: 'Bottom width', required: true },
  { key: 'crotchRise', label: 'Crotch / Rise', gujaratiLabel: 'લટક / હાઈ', placeholder: 'e.g. 10.5', hint: 'Rise / Crotch length', required: false },
];

export const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const TAILOR_ALIASES = {
  bottomopening: ['bottomopening', 'bottom', 'mori', 'bottom_opening'],
  crotchrise: ['crotchrise', 'rise', 'crotch', 'crotch_rise', 'latak'],
  sleeveopening: ['sleeveopening', 'cuff', 'sleeve_opening', 'cuffopening'],
  neck: ['neck', 'collar'],
  sleevelength: ['sleevelength', 'sleeve', 'sleeve_length'],
  frontchest: ['frontchest', 'front_chest'],
  hip: ['hip', 'seat'],
  waist: ['waist'],
  length: ['length'],
  chest: ['chest'],
  shoulder: ['shoulder'],
  thigh: ['thigh'],
  knee: ['knee'],
  calf: ['calf'],
};

export const getFieldValue = (measurements = {}, targetKey = '') => {
  if (!measurements) return '';
  if (measurements[targetKey] !== undefined && measurements[targetKey] !== null && String(measurements[targetKey]).trim() !== '') {
    return measurements[targetKey];
  }

  const normTarget = normalizeKey(targetKey);
  for (const [k, v] of Object.entries(measurements)) {
    if (normalizeKey(k) === normTarget && v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }

  const aliasList = TAILOR_ALIASES[normTarget];
  if (aliasList) {
    for (const alias of aliasList) {
      for (const [k, v] of Object.entries(measurements)) {
        if (normalizeKey(k) === normalizeKey(alias) && v !== undefined && v !== null && String(v).trim() !== '') {
          return v;
        }
      }
    }
  }

  return '';
};
