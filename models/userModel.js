const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Create User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    maxlength: [40, 'A user name must have less or equal to 40 characters'],
    minlength: [10, 'A user name must have more or equal to 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please fill in an email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Fill in a valid email address!'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'A password must have more or equal to 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide a password'],
    validate: {
      validator: function (val) {
        // This only points to current Doc on NEW Document Creation
        return val === this.password;
      },
      message: 'Passwords are not equal!',
    },
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// Document Middleware that runs before .save() and .create()
// Hashes password in Current Document
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Document Middleware that runs before .save() and .create()
// If Doc is New just Return
// Changes passwordChangedAt for Current Doc
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query Middleware that runs before all Query Commands that start with find
// Logs Query Execution Time
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Instance Method that checks if userPassword is the same as the encrypted password
userSchema.methods.correctPassword = async function (
  canditatePassword,
  userPassword
) {
  return await bcrypt.compare(canditatePassword, userPassword);
};

// Instance Method that Checks if User has Changed his Password
// and if Yes Compares it to JWT Token Timestamp to Check if Token is Still Valid
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = this.passwordChangedAt.getTime() / 1000;
    return JWTTimestamp < changedTimestamp;
  }
  // False means Current User Doc has Never Changed Password
  return false;
};

// Instance Method for Creating Reset Token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Create User Model
const User = mongoose.model('User', userSchema);

module.exports = User;
