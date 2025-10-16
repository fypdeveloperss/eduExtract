const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // User preferences stored in User document
  preferences: {
    contentPreferences: {
      quizFormat: {
        type: String,
        enum: ['multiple-choice', 'true-false', 'fill-blank', 'mixed'],
        default: 'multiple-choice'
      },
      summaryLength: {
        type: String,
        enum: ['brief', 'medium', 'detailed'],
        default: 'medium'
      },
      flashcardStyle: {
        type: String,
        enum: ['simple', 'detailed', 'visual'],
        default: 'simple'
      },
      presentationSlides: {
        type: Number,
        min: 5,
        max: 50,
        default: 10
      }
    },
    tonePreferences: {
      communicationStyle: {
        type: String,
        enum: ['academic', 'casual', 'professional', 'friendly'],
        default: 'academic'
      },
      complexityLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
      },
      languageStyle: {
        type: String,
        enum: ['formal', 'informal', 'conversational'],
        default: 'formal'
      }
    },
    learningBehavior: {
      preferredLearningTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'anytime'],
        default: 'anytime'
      },
      studySessionLength: {
        type: Number,
        min: 15,
        max: 120,
        default: 30
      },
      difficultyProgression: {
        type: String,
        enum: ['gradual', 'moderate', 'challenging'],
        default: 'moderate'
      }
    },
    contentCustomization: {
      includeExamples: {
        type: Boolean,
        default: true
      },
      includeVisuals: {
        type: Boolean,
        default: true
      },
      includeReferences: {
        type: Boolean,
        default: false
      },
      personalizedExamples: {
        type: Boolean,
        default: false
      }
    },
    // Study profile captured during onboarding
    studyProfile: {
      purpose: {
        type: String,
        default: ''
      },
      school: {
        type: String,
        default: ''
      },
      courses: {
        type: [String],
        default: []
      }
    }
  },
  
  // Onboarding tracking
  onboarding: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    preferencesSet: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  }
});

module.exports = mongoose.model('User', userSchema); 