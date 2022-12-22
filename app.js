const path = require('path');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// Own Modules
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express(); // Initialize Express

app.set('view engine', 'pug'); // Set Pug Templates
app.set('views', path.join(__dirname, 'views'));

// Global Middlewares
// ----------------------------------------------------------------------------------------------------------------------------------------
// Middleware for Serving Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
// Further HELMET configuration for Security Policy (CSP)
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://js.stripe.com/v3/',
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://cdnjs.cloudflare.com',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
  'https://unpkg.com',
  'https://cdnjs.cloudflare.com',
  'https://tile.openstreetmap.org',
  'http://127.0.0.1:3000/api/v1/users/login',
  'http://127.0.0.1:3000/api/v1/users/updateMe',
  'ws://localhost:1234/',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls],
      frameSrc: ['*.stripe.com', '*.stripe.network'],
    },
  })
);

// Middleware for Logging in Development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Middleware for Rate Limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please trye again in an hour!',
});

app.use('/api', limiter);

// Middleware for Adding Data to Request Body
app.use(
  express.json({
    limit: '12kb',
  })
);

// Middleware for Parsing Data from URL Encooded form
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware for Parsing Cookie Data
app.use(cookieParser());

// Middleware for Sanitizing Data Against NoSQL Query Injection
app.use(mongoSanitize());

// Middleware for Sanitizing Data Against XSS
app.use(xss());

// Middleware for Preventing Parameter Polution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Middleware for Handling CORS
app.use(cors());

// Midlleware for Adding Current Date to HTTP Request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Routes Middleware
// ----------------------------------------------------------------------------------------------------------------------------------------

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// All routes that are not specified before
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;
