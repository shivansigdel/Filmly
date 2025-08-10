// controllers/recommendController.js
const fs = require("fs");
const path = require("path");
const Rating = require("../models/Rating");
const Movie = require("../models/Movie");
const { parse } = require("csv-parse/sync");
const { isReady, current } = require("../models/LatentFactors");

// ─── Load ML→TMDb mapping ───────────────────────────
const linksCsv = fs.readFileSync(path.join(__dirname, "../../data/links.csv"));
const rows = parse(linksCsv, { columns: true, skip_empty_lines: true });
const ml2tmdb = new Map();
for (let r of rows) {
  const ml = parseInt(r.movieId, 10);
  const tm = parseInt(r.tmdbId, 10);
  if (!isNaN(ml) && !isNaN(tm)) ml2tmdb.set(ml, tm);
}
console.log(`Loaded ${ml2tmdb.size} ML→TMDb mappings`);

function cosineSimilarity(a, b) {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

function normalize(vec) {
  const norm = Math.hypot(...vec);
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

async function recommend(req, res) {
  const filmlyId = req.user.filmlyId;
  console.log(`recommend() called for user ${filmlyId}`);

  try {
    // Make sure factors are loaded
    if (!isReady()) {
      return res.status(503).json({ message: "Latent vectors not loaded yet" });
    }
    const { Q, item2idx } = current();
    // build idx2item fresh from item2idx so it's always in sync
    const idx2item = Object.fromEntries(
      Object.entries(item2idx).map(([k, v]) => [v, parseInt(k, 10)])
    );

    // 1) Fetch user ratings
    const userRatings = await Rating.find({ user: filmlyId }).lean();
    console.log(`▶ Ratings fetched: ${userRatings.length}`);

    if (userRatings.length === 0) {
      return res.status(200).json([]); // No ratings, no recs
    }

    const ratedSet = new Set(userRatings.map((r) => r.movieId));

    // 2) Compute user latent vector from rated movies
    const vectors = [];

    for (const { movieId, score } of userRatings) {
      const idx = item2idx[movieId];
      if (idx !== undefined) {
        const vec = Q[idx];
        const weight = score - 5; // Centered at neutral
        vectors.push(vec.map((v) => v * weight));
      }
    }

    if (vectors.length === 0) {
      return res.status(200).json([]); // No known latent vectors
    }

    const userVec = normalize(
      vectors.reduce(
        (sum, vec) => sum.map((v, i) => v + vec[i]),
        new Array(Q[0].length).fill(0)
      )
    );

    // 3) Score all items
    const preds = [];
    for (let j = 0; j < Q.length; j++) {
      const mlId = idx2item[j];
      if (ratedSet.has(mlId)) continue;
      const score = cosineSimilarity(userVec, Q[j]);
      preds.push({ mlId, score });
    }

    // 4) Sort & Slice
    preds.sort((a, b) => b.score - a.score);
    const top20 = preds.slice(0, 20);

    // 5) Enrich
    const payload = [];
    for (const { mlId, score } of top20) {
      const mDoc = await Movie.findOne({ mlId }).lean();
      const tmdbId = mDoc?.tmdbId ?? ml2tmdb.get(mlId) ?? null;
      const title = mDoc?.title || "Unknown title";
      payload.push({ mlId, tmdbId, title, score: Number(score.toFixed(2)) });
    }

    console.log("Final payload:", payload);
    return res.json(payload);
  } catch (err) {
    console.error("Recommendation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { recommend };
