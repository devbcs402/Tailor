/**
 * Tailor measurement field configurations in English
 */

export const REQUIRED_SHIRT_FIELDS = ['length', 'chest', 'waist', 'shoulder', 'sleeveLength'];
export const REQUIRED_PANT_FIELDS = ['length', 'waist', 'hip', 'bottomOpening'];

export const SHIRT_FIELDS = [
  { key: 'length', label: 'Length', placeholder: 'e.g. 28.5', hint: 'Top to bottom length', required: true },
  { key: 'chest', label: 'Chest', placeholder: 'e.g. 40', hint: 'Chest circumference', required: true },
  { key: 'waist', label: 'Waist', placeholder: 'e.g. 36', hint: 'Shirt waist measurement', required: true },
  { key: 'shoulder', label: 'Shoulder', placeholder: 'e.g. 18', hint: 'Shoulder width', required: true },
  { key: 'sleeveLength', label: 'Sleeve Length', placeholder: 'e.g. 24', hint: 'Arm sleeve length', required: true },
  { key: 'sleeveOpening', label: 'Cuff / Opening', placeholder: 'e.g. 9.5', hint: 'Cuff circumference', required: false },
  { key: 'neck', label: 'Neck / Collar', placeholder: 'e.g. 15.5', hint: 'Collar size', required: false },
  { key: 'frontChest', label: 'Front Chest', placeholder: 'e.g. 19.5', hint: 'Front measurement', required: false },
];

export const PANT_FIELDS = [
  { key: 'length', label: 'Length', placeholder: 'e.g. 39', hint: 'Total pant length', required: true },
  { key: 'waist', label: 'Waist', placeholder: 'e.g. 34', hint: 'Waist circumference', required: true },
  { key: 'hip', label: 'Hip / Seat', placeholder: 'e.g. 40', hint: 'Seat circumference', required: true },
  { key: 'thigh', label: 'Thigh', placeholder: 'e.g. 23', hint: 'Thigh measurement', required: false },
  { key: 'knee', label: 'Knee', placeholder: 'e.g. 16', hint: 'Knee circumference', required: false },
  { key: 'bottomOpening', label: 'Bottom Opening', placeholder: 'e.g. 14.5', hint: 'Bottom width', required: true },
  { key: 'crotchRise', label: 'Crotch / Rise', placeholder: 'e.g. 10.5', hint: 'Rise / Crotch length', required: false },
];
