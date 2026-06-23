const mongoose = require('mongoose');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_RECORDING_SECONDS = 300;             // 5 minutes
const MAX_VOICE_MEMOS_PER_TASK = 10;

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
      max: [MAX_FILE_SIZE_BYTES, 'File size cannot exceed 10MB']
    },
    duration: {
      type: Number,
      required: true,
      max: [MAX_RECORDING_SECONDS, 'Recording cannot exceed 5 minutes']
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
      required: false
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ 'voiceMemos.transcription': 'text' }); // Text search on transcriptions

// Validation for voice memos
taskSchema.pre('save', function() {
  if (this.voiceMemos && this.voiceMemos.length > MAX_VOICE_MEMOS_PER_TASK) {
    throw new Error(`Maximum ${MAX_VOICE_MEMOS_PER_TASK} voice memos allowed per task`);
  }
});

// SIMPLE VALIDATION: Just set completedAt when needed
taskSchema.pre('save', function() {
  // Automatically set completedAt when status changes
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
});

module.exports = mongoose.model('Task', taskSchema);