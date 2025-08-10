// routes/ratingRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const Rating = require("../models/Rating");
const Movie = require("../models/Movie"); // for resolving tmdbId when not in links.csv
const { submitRatings } = require("../controllers/ratingController");

const router = express.Router();

// ─── Load ML→TMDb mapping at startup ─────────────────────────────────────
const linksCsv = fs.readFileSync(path.join(__dirname, "../../data/links.csv"));
const rows = parse(linksCsv, { columns: true, skip_empty_lines: true });
const ml2tmdb = new Map();
for (let r of rows) {
  const ml = parseInt(r.movieId, 10);
  const tm = parseInt(r.tmdbId, 10);
  if (!isNaN(ml) && !isNaN(tm)) ml2tmdb.set(ml, tm);
}
console.log(`Loaded ${ml2tmdb.size} ML→TMDb mappings`);

// ─── Auth middleware ─────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ message: "Bad format" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = { filmlyId: payload.userId };
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ─── POST /api/ratings — Save ratings ────────────────────────────────────
router.post("/", authenticate, submitRatings);

// ─── GET /api/ratings — Return rating history with TMDb IDs ─────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const filmlyId = req.user.filmlyId;

    const ratings = await Rating.find({ user: filmlyId })
      .sort("createdAt")
      .lean();

    // Collect all ML IDs we need to resolve
    const mlIds = [...new Set(ratings.map((r) => r.movieId))];

    // Look up Movie docs to resolve tmdbId for items not in links.csv
    const movies = await Movie.find(
      { mlId: { $in: mlIds } },
      { mlId: 1, tmdbId: 1, title: 1 }
    ).lean();
    const byMl = new Map(movies.map((m) => [m.mlId, m]));

    const payload = ratings.map((r) => {
      const m = byMl.get(r.movieId);
      const tmdbId = ml2tmdb.get(r.movieId) ?? m?.tmdbId ?? null;
      return {
        movieId: tmdbId, // what the UI expects (TMDb id)
        score: r.score,
        // optional debug fields – keep or remove per your UI needs:
        mlId: r.movieId,
        title: m?.title ?? null,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("Error fetching ratings:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET /api/ratings/count — Return rating count ────────────────────────
router.get("/count", authenticate, async (req, res) => {
  try {
    const filmlyId = req.user.filmlyId;
    const count = await Rating.countDocuments({ user: filmlyId });
    res.json({ count });
  } catch (err) {
    console.error("Error counting ratings:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
