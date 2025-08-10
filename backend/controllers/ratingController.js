// controllers/ratingController.js
// Normalizes incoming TMDb or ML IDs → stores MovieLens-style mlId.
// If a TMDb movie isn't in MovieLens, we atomically allocate a new mlId
// and create a Movie doc for it (tmdbId, title, genres).

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const { parse } = require("csv-parse/sync");
const Rating = require("../models/Rating");
const Movie = require("../models/Movie");

//Use the shared sequence helpers (initialized in server.js)
const { getNextMlId } = require("../models/Sequence");

// Use a backend env var; fall back to your React one if that’s where it lives
const TMDB_BEARER =
  process.env.TMDB_BEARER_TOKEN || process.env.REACT_APP_TMDB_BEARER_TOKEN;

// Build TMDb→MovieLens map (from links.csv) at startup
const linksCsv = fs.readFileSync(path.join(__dirname, "../../data/links.csv"));
const rows = parse(linksCsv, { columns: true, skip_empty_lines: true });
const tmdb2ml = new Map();
for (const r of rows) {
  const ml = parseInt(r.movieId, 10);
  const tm = parseInt(r.tmdbId, 10);
  if (!isNaN(ml) && !isNaN(tm)) tmdb2ml.set(tm, ml);
}
console.log(`Built TMDb→MovieLens map with ${tmdb2ml.size} entries`);

// ────────────────────────────────────────────────────────────────────────────
// Helpers

async function allocateMlId() {
  return getNextMlId();
}

async function fetchTmdbMovie(tmdbId) {
  if (!TMDB_BEARER) return null;
  const resp = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
    headers: {
      Authorization: `Bearer ${TMDB_BEARER}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) return null;
  return resp.json();
}

/**
 * Normalize an incoming ID:
 * - If it’s already an ML id present in DB, return it.
 * - Else if it’s a TMDb id that exists in links.csv, map to ML id.
 * - Else if we’ve already created a Movie doc for that tmdbId, reuse mlId.
 * - Else allocate a new mlId, fetch TMDb metadata, and create a Movie doc.
 */
async function resolveOrCreateMlId(rawId) {
  const id = Number(rawId);

  // 1) If it's already an ML id we know about in Mongo, keep it.
  if (await Movie.exists({ mlId: id })) {
    return id;
  }

  // 2) Map TMDb -> ML if links.csv knows it.
  if (tmdb2ml.has(id)) {
    return tmdb2ml.get(id);
  }

  // 3) If we already created a Movie for this tmdbId before, reuse that mlId.
  const existing = await Movie.findOne({ tmdbId: id }).lean();
  if (existing) return existing.mlId;

  // 4) Otherwise treat as brand new TMDb-only title: allocate mlId + create Movie
  const newMlId = await allocateMlId();
  let title = `TMDb #${id}`;
  let genres = [];

  const info = await fetchTmdbMovie(id);
  if (info) {
    title = info.title || title;
    genres = Array.isArray(info.genres) ? info.genres.map((g) => g.name) : [];
  } else {
    console.warn(
      `TMDb metadata fetch failed for ${id}; creating minimal Movie doc`
    );
  }

  await Movie.updateOne(
    { mlId: newMlId },
    { $set: { mlId: newMlId, tmdbId: id, title, genres } },
    { upsert: true }
  );

  console.log(`Created Movie: mlId=${newMlId} (tmdbId=${id}) "${title}"`);
  return newMlId;
}

// ────────────────────────────────────────────────────────────────────────────
// Controller

/**
 * POST /api/ratings
 * Body: [{ movieId: TMDb_or_ML, score: 1..10 }, ...]
 * Requires req.user.filmlyId (set by auth middleware)
 */
async function submitRatings(req, res) {
  const userId = req.user?.filmlyId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  const ratingsArray = req.body;
  if (!Array.isArray(ratingsArray) || !ratingsArray.length) {
    return res.status(400).json({ message: "No ratings provided" });
  }

  try {
    // Normalize IDs (and create Movies where needed)
    const mapped = [];
    for (const r of ratingsArray) {
      const raw = Number(r.movieId);
      const mlId = await resolveOrCreateMlId(raw);
      console.log(`🔄 Incoming ${raw} → mlId ${mlId}`);
      mapped.push({ user: userId, movieId: mlId, score: r.score });
    }

    // Upsert ratings: delete existing entries for these movies for this user, then insert
    const mlIds = mapped.map((r) => r.movieId);
    await Rating.deleteMany({ user: userId, movieId: { $in: mlIds } });
    await Rating.insertMany(mapped);

    

    return res.status(200).json({ message: "Ratings saved" });
  } catch (err) {
    console.error("Error in submitRatings:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

module.exports = { submitRatings };
