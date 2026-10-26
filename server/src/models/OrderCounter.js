import mongoose from 'mongoose';

const orderCounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export const OrderCounter = mongoose.model('OrderCounter', orderCounterSchema);

/**
 * Concurrency-safe atomic order number generator.
 * Format: ORD-YYYY-00001
 */
export async function generateNextOrderNumber(session = null) {
  const currentYear = new Date().getFullYear();
  const counterKey = `order_seq_${currentYear}`;

  const queryOptions = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };
  if (session) {
    queryOptions.session = session;
  }

  const counter = await OrderCounter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    queryOptions
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `ORD-${currentYear}-${paddedSeq}`;
}
