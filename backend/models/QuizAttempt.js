const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'GeneratedContent'
  },
  quizTitle: {
    type: String,
    required: true
  },
  quizData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  userAnswers: {
    type: [String],
    required: true
  },
  correctAnswers: {
    type: [String],
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctCount: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  isCompleted: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);

