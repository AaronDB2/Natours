const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

// Check for Tour Id in Url Parameters (Nested Routes)
exports.checkParam = (req, res, next) => {
  if (req.params.tourId) req.query.tour = req.params.tourId;
  next();
};

// Set User and Tour Ids on Request Body
exports.setTourUserIds = (req, res, next) => {
  // Check if req.body has a tour and user id
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Get All Reviews
exports.getAllReviews = factory.getAll(Review);

// Create a New Review
exports.createReview = factory.createOne(Review);

// Delete Request for Deleting Review at Specific Id
exports.deleteReviewById = factory.deleteOne(Review);

// Update Request for Updating Review at Specific Id
exports.updateReview = factory.updateOne(Review);

// Get Request for One Review
exports.getReviewById = factory.getOne(Review);
