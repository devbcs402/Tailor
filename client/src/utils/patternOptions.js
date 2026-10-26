export const SHIRT_PATTERNS = [
  { id: 'plain', label: 'Plain' },
  { id: 'checks', label: 'Checks' },
  { id: 'striped', label: 'Striped' },
  { id: 'printed', label: 'Printed' },
  { id: 'kurta_collar', label: 'Kurta Collar' },
  { id: 'chinese_collar', label: 'Chinese Collar' },
  { id: 'other', label: 'Other' },
];

export const PANT_PATTERNS = [
  { id: 'plain_pant', label: 'Plain Pant' },
  { id: 'formal_pant', label: 'Formal Pant' },
  { id: 'jeans_style', label: 'Jeans Style' },
  { id: 'pencil_fit', label: 'Pencil Fit' },
  { id: 'pleated', label: 'Pleated' },
  { id: 'cotton_trouser', label: 'Cotton Trouser' },
  { id: 'other', label: 'Other' },
];

export const ORDER_STATUS_CONFIG = {
  pending: {
    key: 'pending',
    label: 'Pending',
    badgeClass: 'pending',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In Progress',
    badgeClass: 'in_progress',
  },
  ready: {
    key: 'ready',
    label: 'Ready',
    badgeClass: 'ready',
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    badgeClass: 'delivered',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    badgeClass: 'cancelled',
  },
};

export const getShirtPatternLabel = (patternId, customPattern = '') => {
  if (!patternId && !customPattern) return '-';
  if (patternId === 'other' && customPattern) {
    return customPattern;
  }
  const match = SHIRT_PATTERNS.find((p) => p.id === patternId);
  return match ? match.label : (patternId || customPattern || '-');
};

export const getPantPatternLabel = (patternId, customPattern = '') => {
  if (!patternId && !customPattern) return '-';
  if (patternId === 'other' && customPattern) {
    return customPattern;
  }
  const match = PANT_PATTERNS.find((p) => p.id === patternId);
  return match ? match.label : (patternId || customPattern || '-');
};
