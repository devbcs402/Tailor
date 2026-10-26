import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      mobileNumber: { type: String, required: true },
      address: { type: String, default: '' },
    },
    orderDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Delivery deadline is required'],
      index: true,
    },
    deliveryTime: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'ready', 'delivered', 'cancelled'],
      default: 'in_progress',
      index: true,
    },
    measurementUnit: {
      type: String,
      default: 'inch',
    },
    shirt: {
      quantity: { type: Number, default: 0, min: 0 },
      patterns: [{ type: String, trim: true }],
      pattern: { type: String, default: '' },
      customPattern: { type: String, default: '' },
      measurements: {
        length: { type: String, default: '' },
        chest: { type: String, default: '' },
        waist: { type: String, default: '' },
        shoulder: { type: String, default: '' },
        sleeveLength: { type: String, default: '' },
        sleeveOpening: { type: String, default: '' },
        neck: { type: String, default: '' },
        frontChest: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    },
    pant: {
      quantity: { type: Number, default: 0, min: 0 },
      patterns: [{ type: String, trim: true }],
      pattern: { type: String, default: '' },
      customPattern: { type: String, default: '' },
      measurements: {
        length: { type: String, default: '' },
        waist: { type: String, default: '' },
        hip: { type: String, default: '' },
        thigh: { type: String, default: '' },
        knee: { type: String, default: '' },
        bottomOpening: { type: String, default: '' },
        crotchRise: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    },
    specialInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    pricing: {
      shirtPrice: { type: Number, default: 0, min: 0 },
      pantPrice: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
      advancePaid: { type: Number, default: 0, min: 0 },
      balanceDue: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for tenant-scoped searching, filtering, and unique order numbers per tenant
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ tenantId: 1, status: 1, deadline: 1 });
orderSchema.index({ tenantId: 1, orderDate: -1 });
orderSchema.index({ orderNumber: 'text', 'customerSnapshot.name': 'text', 'customerSnapshot.mobileNumber': 'text' });

export const Order = mongoose.model('Order', orderSchema);
