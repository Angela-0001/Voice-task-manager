const mongoose = require('mongoose');

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for anonymous users
  },
  deviceId: {
    type: String,
    required: false // For anonymous users - identifies the device
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Task cannot be empty']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    default: null
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  completedAt: {
    type: Date,
    default: null
  },
  voiceMemos: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    audioFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true,
      max: [10485760, 'File size cannot exceed 10MB'] // 10MB limit
    },
    duration: {
      type: Number,
      required: true,
      max: [300, 'Recording cannot exceed 5 minutes'] // 5 minutes = 300 seconds
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp3', 'audio/wav', 'audio/ogg']
    },
    transcription: {
      type: String,
      default: ''
    },
    transcriptionConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Allow null for anonymous users
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ deviceId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ 'voiceMemos.transcription': 'text' }); // Text search on transcriptions

// Validation for voice memos
taskSchema.pre('save', function() {
  // Limit voice memos per task
  if (this.voiceMemos && this.voiceMemos.length > 10) {
    throw new Error('Maximum 10 voice memos allowed per task');
  }
});

// SIMPLE VALIDATION: Just set completedAt when needed
taskSchema.pre('save', function() {
  // Automatically set completedAt when status changes
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Log for debugging
  if (this.userId) {
    console.log('💾 Saving authenticated task:', { userId: this.userId, title: this.title });
  } else {
    console.log('💾 Saving anonymous task:', { title: this.title });
  }
});

module.exports = mongoose.model('Task', taskSchema);