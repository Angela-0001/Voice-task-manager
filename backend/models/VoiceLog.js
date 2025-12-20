const mongoose = require('mongoose');

const voiceLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sessionId: {
    type: String,
    required: false
  },
  rawCommand: {
    type: String,
    required: true,
    trim: true
  },
  interpretedIntent: {
    type: String,
    enum: ['CREATE', 'DELETE', 'UPDATE', 'READ', 'BULK_DELETE', 'BULK_UPDATE', 'add_task', 'delete_task', 'complete_task', 'show_tasks', 'filter_tasks', 'update_task', 'unknown', 'error'],
    default: 'unknown'
  },
  actionTriggered: {
    type: String,
    default: ''
  },
  success: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

voiceLogSchema.index({ userId: 1, createdAt: -1 });
voiceLogSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('VoiceLog', voiceLogSchema);