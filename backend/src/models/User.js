import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  suspendedAt: { type: Date, default: null },
  bannedAt: { type: Date, default: null },
  statusReason: { type: String, default: '', maxlength: 500 },
  lastLoginAt: { type: Date, default: null },
  firebaseUid: { type: String, default: null },
  emailVerified: { type: Boolean, default: false }
}, { timestamps: true })

UserSchema.index({ role: 1 })
UserSchema.index({ accountStatus: 1 })
UserSchema.index({ firebaseUid: 1 }, { sparse: true })

export default mongoose.model('User', UserSchema)
