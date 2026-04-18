import mongoose from 'mongoose';

const RoomSkillMapNodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, default: 'Learn' },
  order: { type: Number, default: 0 },
  status: { type: String, default: 'Not Started' },
  originalNodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Node' }
}, { _id: true });

const RoomSkillMapSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  // Keep for backward compat — optional now
  skillMapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    index: true
  },
  addedBy: {
    type: String,
    required: true
  },
  // Embedded skill map data (independent copy)
  name: {
    type: String,
    default: 'Untitled',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  icon: {
    type: String,
    default: 'Map'
  },
  color: {
    type: String,
    default: '#2e5023'
  },
  goal: {
    type: String,
    default: ''
  },
  nodes: [RoomSkillMapNodeSchema],
  nodeCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for room lookups
RoomSkillMapSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('RoomSkillMap', RoomSkillMapSchema);
