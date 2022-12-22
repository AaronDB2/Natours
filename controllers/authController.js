const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// Creates a JWT token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Send JWT Token in HTTP Responds
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Cookie Options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Only Add secure Option to Cookie if in Production Mode
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // Remove Password from Output
  user.password = undefined;

  // Make Cookie for JWT Token
  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Creates New User
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

// Login User by Giving a JWT Token if Credentials Match
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('please provide an email and password!', 400));
  }

  // Find User by Email and also return Password
  const user = await User.findOne({ email: email }).select('+password');

  // Checks if User Exists or if the Passwords Match
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

// Middleware for Loggin Out the User
exports.logout = (req, res, next) => {
  // Overwrite jwt Cookie without JWT Token
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Middleware for Protecting Routes. These Routes are Only Accessible if There is a Valid JWT Token
exports.protect = catchAsync(async (req, res, next) => {
  // Get JWT Token and Check if it Exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access'),
      401
    );
  }

  // Validate JWT Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if User still Exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to the token does no longer exists.',
        401
      )
    );
  }

  // Check if User Changed Password after the Token was Given
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again!', 401)
    );
  }

  // Grant Access to the Protected Route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Middleware for Checking if User has The Correct Role to Access the Resource that is Restricted
// ( Closure Returns the Middleware Function )
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };

// Middleware for Allowing a User to Reset there Password.
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Try to Send Email
  try {
    // Send Token to User's Email
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // Reset token and Token Expires Time
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later.',
        500
      )
    );
  }
});

// Middleware for Reseting The Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Encrypt Token in Req.Params
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Get User Based on Token and Check Expired Token Time
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If Token has not Expired and there is a User, Set the New Password.
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Set Data for User
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log User In and Send JWT Token
  createSendToken(user, 200, res);
});

// Middleware for Updating Password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get the User from the Collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if POSTed Current Password is Correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Password is Incorrect! Please fill in the Correct Password.',
        401
      )
    );
  }

  // If so, Update Password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Log User In and Send JWT Token
  createSendToken(user, 200, res);
});

// Middleware for Checking Login on Rendered Pages. NO ERROR CATCHING
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // Validate JWT Token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // Check if User still Exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Check if User Changed Password after the Token was Given
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a Logged In User
      res.locals.user = currentUser;
    }
    next();
  } catch (err) {
    next();
  }
};
