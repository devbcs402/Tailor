/**
 * Tailor measurement key normalization and alias resolution utilities
 */

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
