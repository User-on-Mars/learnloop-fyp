import mongoose from 'mongoose';

/**
 * SkillMapTemplate - Admin-created templates that users can apply
 */

const SessionDefinitionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  }
}, { _id: false });

const NodeDefinitionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  sessions: {
    type: [SessionDefinitionSchema],
    required: true,
    validate: [
      {
        validator: function(sessions) {
          return sessions && sessions.length > 0;
        },
        message: 'At least one session is required per node'
      },
      {
        validator: function(sessions) {
          return sessions && sessions.length <= 5;
        },
        message: 'Maximum 5 sessions per node'
      }
    ]
  }
}, { _id: false });

const SkillMapTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20
  },
  description: {
    type: String,
    trim: true,
    maxlength: 150,
    default: ''
  },
  icon: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 30
  },
  goal: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 30
  },
  nodes: {
    type: [NodeDefinitionSchema],
    required: true,
    validate: {
      validator: function(nodes) {
        return nodes && nodes.length >= 2 && nodes.length <= 15;
      },
      message: 'Template must have between 2 and 15 nodes'
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isBuiltIn: {
    type: Boolean,
    default: false // Built-in templates from templates.ts
  },
  createdBy: {
    type: String,
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  usedByUsers: {
    type: [String], // Array of user IDs who have used this template
    default: []
  },
  // Link to original skillmap if published from user submission
  sourceSkillmapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    default: null
  },
  authorCredit: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  }
}, { 
  timestamps: true 
});

// Indexes
SkillMapTemplateSchema.index({ isPublished: 1, createdAt: -1 });
SkillMapTemplateSchema.index({ createdBy: 1 });

// Methods
SkillMapTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

SkillMapTemplateSchema.methods.trackUserUsage = async function(userId) {
  if (!this.usedByUsers.includes(userId)) {
    this.usedByUsers.push(userId);
    this.usageCount = this.usedByUsers.length; // Keep usageCount in sync with unique users
    await this.save();
  }
};

// Statics
SkillMapTemplateSchema.statics.getPublishedTemplates = async function() {
  return this.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .lean();
};

SkillMapTemplateSchema.statics.getAllTemplates = async function() {
  return this.find()
    .sort({ isBuiltIn: -1, createdAt: -1 })
    .lean();
};

SkillMapTemplateSchema.statics.getTemplateById = async function(id) {
  const template = await this.findById(id).lean();
  if (!template) {
    throw new Error('Template not found');
  }
  return template;
};

export default mongoose.model('SkillMapTemplate', SkillMapTemplateSchema);
