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
 * Concurrency-safe atomic order number generator per tenant.
 * Format: ORD-YYYY-00001
 */
export async function generateNextOrderNumber(tenantId = null, session = null) {
  const currentYear = new Date().getFullYear();
  const counterKey = tenantId ? `order_seq_${tenantId}_${currentYear}` : `order_seq_${currentYear}`;

  // If counter doesn't exist yet, seed starting sequence from existing orders or global counter
  const existingCounter = await OrderCounter.findOne({ name: counterKey });
  if (!existingCounter) {
    let startingSeq = 0;
    if (tenantId) {
      const highestOrder = await mongoose.model('Order').findOne({
        tenantId,
        orderNumber: new RegExp(`^ORD-${currentYear}-\\d+$`),
      }).sort({ orderNumber: -1 });

      if (highestOrder) {
        const parts = highestOrder.orderNumber.split('-');
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          startingSeq = parsed;
        }
      } else {
        // Fallback to legacy global counter if present
        const globalCounter = await OrderCounter.findOne({ name: `order_seq_${currentYear}` });
        if (globalCounter && globalCounter.seq > 0) {
          startingSeq = globalCounter.seq;
        }
      }
    }

    await OrderCounter.findOneAndUpdate(
      { name: counterKey },
      { $setOnInsert: { seq: startingSeq } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

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
