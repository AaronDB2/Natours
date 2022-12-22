/* eslint-disable node/no-unsupported-features/es-syntax */
const AppError = require('../utils/appError');

// Handle Cast Error
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle Duplicate Field Error
const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value: "${value}". Please use another value`;
  return new AppError(message, 400);
};

// Handle Validation Error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JsonWebToken Error
const handleJsonWebTokenError = () =>
  new AppError('Invalid token! Please log in again.', 401);

// Handle TokenExpired Error
const handleTokenExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Error for Dev Build
const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // Rendered Website
  console.error('ERROR', err);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

// Error for Production Build
const sendErrorProduction = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // Programming or unknown error: don't leak error details
    }
    console.error('ERROR', err);

    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  // Rendered Website
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
    // Programming or unknown error: don't leak error details
  }
  console.error('ERROR', err);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

// Handle Errors
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let errCopy = { ...err };
    errCopy.message = err.message;

    if (err.name === 'CastError') errCopy = handleCastErrorDB(errCopy);
    if (err.code === 11000) errCopy = handleDuplicateFieldsDB(errCopy);
    if (err.name === 'ValidationError')
      errCopy = handleValidationErrorDB(errCopy);
    if (err.name === 'JsonWebTokenError') errCopy = handleJsonWebTokenError();
    if (err.name === 'TokenExpiredError') errCopy = handleTokenExpiredError();
    sendErrorProduction(errCopy, req, res);
  }
};
