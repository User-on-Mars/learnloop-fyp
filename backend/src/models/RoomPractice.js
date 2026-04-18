import mongoose from 'mongoose';

/**
 * RoomPractice - Tracks practice sessions within room skill maps.
 * Completely separate from personal practice sessions.
 */
const RoomPracticeSchema = new mongoose.Schema({
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
  roomSkillMapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomSkillMap',
    required: true,
    index: true
  },
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  nodeTitle: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  minutesPracticed: {
    type: Number,
    required: true,
    min: 1
  },
  timerSeconds: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  blockers: {
    type: String,
    default: ''
  },
  nextStep: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

RoomPracticeSchema.index({ roomId: 1, userId: 1, roomSkillMapId: 1 });
RoomPracticeSchema.index({ roomId: 1, userId: 1, date: -1 });

export default mongoose.model('RoomPractice', RoomPracticeSchema);
