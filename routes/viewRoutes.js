const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

// Router for Views
const router = express.Router();

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.renderOverview
);
router.get(
  '/tour/:slug',
  authController.isLoggedIn,
  viewController.renderTourDetails
);
router.get('/login', authController.isLoggedIn, viewController.renderLogin);
router.get('/signup', viewController.renderSignup);
router.get('/me', authController.protect, viewController.renderAccount);
router.get('/my-tours', authController.protect, viewController.renderMyTours);
router.post(
  '/submit-user-data',
  authController.protect,
  viewController.updateUserDate
);

module.exports = router;
