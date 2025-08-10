// backend/models/Movie.js
const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    mlId: { type: Number, unique: true },
    title: String,
    genres: [String],
    tmdbId: Number,
  },
  {
    collection: "movies", // matches ingestMovies.js upsert
  }
);

module.exports = mongoose.model("Movie", movieSchema);
