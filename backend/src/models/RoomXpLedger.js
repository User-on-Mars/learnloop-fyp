import mongoose from 'mongoose';

const RoomXpLedgerSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  skillMapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  xpAmount: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    enum: ['practice', 'node_completion', 'skillmap_completion', 'manual'],
    default: 'manual',
    index: true
  },
  referenceId: {
    type: String,
    default: null,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  earnedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient aggregation queries
RoomXpLedgerSchema.index({ roomId: 1, userId: 1, earnedAt: -1 });
RoomXpLedgerSchema.index({ roomId: 1, earnedAt: -1 });
RoomXpLedgerSchema.index({ roomId: 1, userId: 1, source: 1, referenceId: 1 });

export default mongoose.model('RoomXpLedger', RoomXpLedgerSchema);
