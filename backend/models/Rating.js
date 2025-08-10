// backend/models/Rating.js
const mongoose = require("mongoose");

/**
 * Rating schema
 * - user: numeric Filmly user ID
 * - movieId: MovieLens or TMDb movie identifier
 * - score: numeric rating (1–10)
 */
const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: Number,
      required: true,
    },
    movieId: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one rating per movie
ratingSchema.index({ user: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
