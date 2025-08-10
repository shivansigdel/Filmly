#!/usr/bin/env node
// backend/scripts/ingestMovies.js

require("dotenv").config({ path: __dirname + "/../.env" });
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");

// ─── 1) Define Movie schema/model ─────────────────────────────────────────
const movieSchema = new mongoose.Schema({
  mlId: { type: Number, unique: true },
  title: String,
  genres: [String],
  tmdbId: Number,
  releaseDate: String,
  posterPath: String,
});
const Movie = mongoose.model("Movie", movieSchema);

// ─── 2) Connect to MongoDB ─────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB");

  // ─── 3A) Load movies.csv ────────────────────────────────────────────────
  const moviesMap = new Map();
  await new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, "../../data/movies.csv"))
      .pipe(csv())
      .on("data", (row) => {
        const mlId = Number(row.movieId);
        moviesMap.set(mlId, {
          mlId,
          title: row.title,
          genres:
            row.genres === "(no genres listed)" ? [] : row.genres.split("|"),
          tmdbId: null,
          releaseDate: null,
          posterPath: null,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });
  console.log(`Loaded ${moviesMap.size} entries from movies.csv`);

  // ─── 3B) Merge in links.csv ─────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, "../../data/links.csv"))
      .pipe(csv())
      .on("data", (row) => {
        const mlId = Number(row.movieId);
        const rec = moviesMap.get(mlId);
        if (rec) rec.tmdbId = Number(row.tmdbId);
      })
      .on("end", resolve)
      .on("error", reject);
  });
  console.log("Merged TMDb IDs from links.csv");

  // ─── 4) Upsert into MongoDB ──────────────────────────────────────────────
  let count = 0;
  for (const movie of moviesMap.values()) {
    if (!movie.tmdbId) continue; // skip entries without a TMDb mapping
    await Movie.updateOne(
      { mlId: movie.mlId },
      { $set: movie },
      { upsert: true }
    );
    count++;
  }
  console.log(`✓ Upserted ${count} movie docs into 'movies' collection`);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
