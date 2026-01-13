const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // Step 1: Gym Selection
    gymName: {
      type: String,
      trim: true,
    },
    gymLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },

    // Step 2: Terms Acceptance
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: Date,

    // Step 3: Document Upload
    idDocument: {
      url: String,
      publicId: String,
      uploadedAt: Date,
    },
    gymMembershipDocument: {
      url: String,
      publicId: String,
      uploadedAt: Date,
    },

    // Step 4-11
    firstName: {
      type: String,
      trim: true,
    },
    birthday: {
      type: String,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      enum: ['Man', 'Woman', 'Other'],
    },
    interestedIn: {
      type: String,
      enum: ['Man', 'Woman', 'Every one'],
    },
    lookingFor: {
      type: String,
      enum: ['Long-term Partner', 'Work out Partner', 'Looking for Both'],
    },
    ageRange: {
      type: String,
      enum: ['18-25', '25-35', '35-45', '45-Over'],
    },
    interests: [{
      type: String,
    }],
    bio: {
      type: String,
      maxlength: 500,
    },
    photos: [{
      url: String,
      publicId: String,
      uploadedAt: Date,
    }],

    // Chat and Online Status
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    profileImage: {
      type: String,
      get: function() {
        return this.photos && this.photos.length > 0 ? this.photos[0].url : null;
      }
    },

  
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    currentStep: {
      type: Number,
      default: 0,
    },

   
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
userSchema.virtual('name').get(function() {
  return this.firstName || 'User';
});

userSchema.index({ phoneNumber: 1 });
userSchema.index({ gymName: 1 });
userSchema.index({ isActive: 1, profileCompleted: 1 });
userSchema.index({ isOnline: 1 });

module.exports = mongoose.model('User', userSchema);
