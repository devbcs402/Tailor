import mongoose from 'mongoose';

const measurementDefinitionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['shirt_measurement', 'pant_measurement'],
      required: [true, 'Category (shirt_measurement or pant_measurement) is required'],
      index: true,
    },
    fieldKey: {
      type: String,
      required: [true, 'Field key is required'],
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: [true, 'Measurement display name is required'],
      trim: true,
    },
    gujaratiName: {
      type: String,
      trim: true,
      default: '',
    },
    fieldType: {
      type: String,
      enum: ['number', 'text'],
      default: 'number',
    },
    unit: {
      type: String,
      default: '',
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique field keys per tenant and category
measurementDefinitionSchema.index(
  { tenantId: 1, category: 1, fieldKey: 1 },
  { unique: true }
);

// Sorting index by display order
measurementDefinitionSchema.index({ tenantId: 1, category: 1, displayOrder: 1 });

export const DEFAULT_SHIRT_MEASUREMENTS = [
  { fieldKey: 'length', displayName: 'Length', gujaratiName: 'લંબાઈ', fieldType: 'number', isRequired: true, displayOrder: 1, isSystemDefault: true },
  { fieldKey: 'chest', displayName: 'Chest', gujaratiName: 'છાતી', fieldType: 'number', isRequired: true, displayOrder: 2, isSystemDefault: true },
  { fieldKey: 'waist', displayName: 'Waist', gujaratiName: 'કમર', fieldType: 'number', isRequired: true, displayOrder: 3, isSystemDefault: true },
  { fieldKey: 'shoulder', displayName: 'Shoulder', gujaratiName: 'શોલ્ડર', fieldType: 'number', isRequired: true, displayOrder: 4, isSystemDefault: true },
  { fieldKey: 'sleeveLength', displayName: 'Sleeve Length', gujaratiName: 'બાય / સ્લીવ', fieldType: 'number', isRequired: true, displayOrder: 5, isSystemDefault: true },
  { fieldKey: 'sleeveOpening', displayName: 'Cuff / Opening', gujaratiName: 'કફ / મોરી', fieldType: 'number', isRequired: false, displayOrder: 6, isSystemDefault: true },
  { fieldKey: 'neck', displayName: 'Collar / Neck', gujaratiName: 'કોલર / ગળું', fieldType: 'number', isRequired: false, displayOrder: 7, isSystemDefault: true },
  { fieldKey: 'frontChest', displayName: 'Front Chest', gujaratiName: 'સામે ની છાતી', fieldType: 'number', isRequired: false, displayOrder: 8, isSystemDefault: true },
];

export const DEFAULT_PANT_MEASUREMENTS = [
  { fieldKey: 'length', displayName: 'Length', gujaratiName: 'લંબાઈ', fieldType: 'number', isRequired: true, displayOrder: 1, isSystemDefault: true },
  { fieldKey: 'waist', displayName: 'Waist', gujaratiName: 'કમર', fieldType: 'number', isRequired: true, displayOrder: 2, isSystemDefault: true },
  { fieldKey: 'hip', displayName: 'Hip / Seat', gujaratiName: 'સીટ / હીપ', fieldType: 'number', isRequired: true, displayOrder: 3, isSystemDefault: true },
  { fieldKey: 'thigh', displayName: 'Thigh', gujaratiName: 'જાંઘ / થાઈ', fieldType: 'number', isRequired: false, displayOrder: 4, isSystemDefault: true },
  { fieldKey: 'knee', displayName: 'Knee', gujaratiName: 'ઘૂંટણ / ની', fieldType: 'number', isRequired: false, displayOrder: 5, isSystemDefault: true },
  { fieldKey: 'bottomOpening', displayName: 'Bottom Opening', gujaratiName: 'મોરી / બોટમ', fieldType: 'number', isRequired: true, displayOrder: 6, isSystemDefault: true },
  { fieldKey: 'crotchRise', displayName: 'Crotch / Rise', gujaratiName: 'લટક / હાઈ', fieldType: 'number', isRequired: false, displayOrder: 7, isSystemDefault: true },
];

/**
 * Seed default shirt and pant measurements for a new or unseeded tenant
 */
export const seedTenantDefaultMeasurements = async (tenantId) => {
  try {
    const count = await MeasurementDefinition.countDocuments({ tenantId });
    if (count === 0) {
      const initialDocs = [
        ...DEFAULT_SHIRT_MEASUREMENTS.map((m) => ({
          ...m,
          tenantId,
          category: 'shirt_measurement',
          isActive: true,
        })),
        ...DEFAULT_PANT_MEASUREMENTS.map((m) => ({
          ...m,
          tenantId,
          category: 'pant_measurement',
          isActive: true,
        })),
      ];
      await MeasurementDefinition.insertMany(initialDocs);
      return initialDocs.length;
    }
    return 0;
  } catch (err) {
    console.error(`[Measurement Seeder] Failed to seed default measurements for tenant ${tenantId}:`, err);
    return 0;
  }
};

export const MeasurementDefinition = mongoose.model(
  'MeasurementDefinition',
  measurementDefinitionSchema
);
