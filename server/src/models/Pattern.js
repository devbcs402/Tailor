import mongoose from 'mongoose';

const patternSchema = new mongoose.Schema(
  {
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

// Compound index to help quickly search and sort by type and name
patternSchema.index({ type: 1, name: 1 });

export const Pattern = mongoose.model('Pattern', patternSchema);
