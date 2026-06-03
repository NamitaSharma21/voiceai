const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    attemptType: {
      type: String,
      enum: ['single', 'group'],
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
    correctAnswers: {
      type: Number,
      required: true
    },
    timeSpent: {
      type: Number,
      required: true,
      description: 'Time spent in seconds'
    },
    audioFile: {
      type: String,
      default: null
    },
    questions: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        question: String,
        userAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        confidence: Number
      }
    ],
    groupMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    feedback: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed'
    }
  },
  { timestamps: true }
);

// Index for faster queries
attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ attemptType: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
