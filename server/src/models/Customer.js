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
  { _id: false }
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
  { _id: false }
);

const latestMeasurementsSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      default: 'inch',
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
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ name: 'text', mobileNumber: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
