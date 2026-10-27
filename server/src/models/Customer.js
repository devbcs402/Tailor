import mongoose from 'mongoose';

const shirtMeasurementSchema = new mongoose.Schema(
  {
    length: { type: String, default: '' }, // Length
    chest: { type: String, default: '' }, // Chest
    waist: { type: String, default: '' }, // Waist
    shoulder: { type: String, default: '' }, // Shoulder
    sleeveLength: { type: String, default: '' }, // Sleeve Length
    sleeveOpening: { type: String, default: '' }, // Sleeve Opening / Cuff
    neck: { type: String, default: '' }, // Neck / Collar
    frontChest: { type: String, default: '' }, // Front Chest
    notes: { type: String, default: '' }, // Notes
  },
  { _id: false, strict: false }
);

const pantMeasurementSchema = new mongoose.Schema(
  {
    length: { type: String, default: '' }, // Length
    waist: { type: String, default: '' }, // Waist
    hip: { type: String, default: '' }, // Hip / Seat
    thigh: { type: String, default: '' }, // Thigh
    knee: { type: String, default: '' }, // Knee
    bottomOpening: { type: String, default: '' }, // Bottom Opening
    crotchRise: { type: String, default: '' }, // Crotch / Rise
    notes: { type: String, default: '' }, // Notes
  },
  { _id: false, strict: false }
);

const latestMeasurementsSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      default: '',
    },
    shirt: {
      type: shirtMeasurementSchema,
      default: () => ({}),
    },
    shirtPatterns: [{ type: String, trim: true }],
    shirtPattern: {
      type: String,
      default: '',
    },
    shirtCustomPattern: {
      type: String,
      default: '',
    },
    pant: {
      type: pantMeasurementSchema,
      default: () => ({}),
    },
    pantPatterns: [{ type: String, trim: true }],
    pantPattern: {
      type: String,
      default: '',
    },
    pantCustomPattern: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    customerCode: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    latestMeasurements: {
      type: latestMeasurementsSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes: Mobile number unique per tenant
customerSchema.index({ tenantId: 1, mobileNumber: 1 });
customerSchema.index({ tenantId: 1, createdAt: -1 });
customerSchema.index({ name: 'text', mobileNumber: 'text', address: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
