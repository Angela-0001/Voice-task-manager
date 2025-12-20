const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Set timezone to IST (matching reference implementation)
process.env.TZ = 'Asia/Kolkata';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters']
  },
  profileImage: {
    type: String,
    default: ''
  },
  authProvider: {
    type: String,
    enum: ['local'],
    default: 'local'
  },
  createdAt: {
    type: Date,
    default: () => new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
  },
  lastLogin: {
    type: Date,
    default: () => new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare passwords (from reference)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);