const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters']
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      // Replace vulnerable regex with a safer pattern
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: true,
      minlength: [6, 'Password must be at least 6 characters']
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    gamesLost: {
      type: Number,
      default: 0,
    },
    gamesDrawn: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['offline', 'online', 'in_game', 'looking_for_match'],
      default: 'offline',
    },
    currentGame: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiration: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lastFailedLogin: {
      type: Date,
      default: null
    },
    requireCaptcha: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get public profile without sensitive data
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Method to calculate win rate
userSchema.methods.getWinRate = function() {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.gamesWon / this.gamesPlayed) * 100);
};

/**
 * Data migration function to update existing users
 * Use this when deploying the updated model to production
 */
userSchema.statics.migrateData = async function() {
  try {
    // Convert old field names to new ones
    const users = await this.find({});
    for (const user of users) {
      // Only update if using old field names
      if (typeof user.games === 'number' && typeof user.gamesPlayed === 'undefined') {
        user.gamesPlayed = user.games;
        user.gamesWon = user.wins || 0;
        user.gamesLost = user.losses || 0;
        user.gamesDrawn = user.draws || 0;
        user.status = user.isOnline ? 'online' : 'offline';
        await user.save();
      }
    }
    console.log('User data migration completed successfully');
  } catch (error) {
    console.error('Error migrating user data:', error);
  }
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);