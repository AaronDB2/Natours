const mongoose = require('mongoose');
const Tour = require('./tourModel');

// Create Schema
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Please fill in a review'],
    },
    rating: {
      type: Number,
      required: [true, 'Please fill in a rating for the review'],
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Ratings must be below 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [
        true,
        'Review does not point to a tour. Please fill in for which tour the review is for.',
      ],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [
        true,
        'Review does not point to a user. Please fill in a user that wrote the review.',
      ],
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Set Compound Index on tour and user
reviewSchema.index({ tour: 1, user: -1 }, { unique: true });

// Document Middleware that runs after .save() and .create()
// Calls caclAverageRatings Function
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// Query Middleware that runs before all Query Commands that start with find
// Populates Tour and User Data
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Query Middleware that runs for all Query Commands that start with findOneAnd
// Gets Proccessed Review Document and Set it on this (Query) as Value r
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

// Query Middleware that runs After all Query Commands that start with findOneAnd
// Calls calcAverageRatings when Review is Updated or Deleted
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// Static Function for Calculating Average Rating and Updating Tour with The Number of and Average Rating
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Create Tour Model
const review = mongoose.model('Review', reviewSchema);

module.exports = review;
