import mongoose from 'mongoose';

const patternSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Pattern name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['shirt', 'pant'],
      required: [true, 'Pattern type (shirt or pant) is required'],
      index: true,
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

// Compound index to help quickly search and sort by tenant, type, and name
patternSchema.index({ tenantId: 1, type: 1, name: 1 });

export const Pattern = mongoose.model('Pattern', patternSchema);
