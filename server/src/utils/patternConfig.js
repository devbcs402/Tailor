/**
 * Configurable pattern definitions for Shirts and Pants
 * with English labels.
 */

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

export const ORDER_STATUSES = {
  pending: { id: 'pending', label: 'Pending', color: 'amber' },
  in_progress: { id: 'in_progress', label: 'In Progress', color: 'blue' },
  ready: { id: 'ready', label: 'Ready', color: 'indigo' },
  delivered: { id: 'delivered', label: 'Delivered', color: 'green' },
  cancelled: { id: 'cancelled', label: 'Cancelled', color: 'red' },
};
