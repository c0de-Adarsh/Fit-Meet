const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['liked', 'matched', 'passed'],
    default: 'liked'
  },
  likedAt: {
    type: Date,
    default: Date.now
  },
  matchedAt: {
    type: Date
  },
  lastMessageAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate likes
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Index for finding matches
matchSchema.index({ user1: 1, status: 1 });
matchSchema.index({ user2: 1, status: 1 });

module.exports = mongoose.model('Match', matchSchema);