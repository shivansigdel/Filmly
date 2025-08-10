// backend/scripts/fixMovieMetadata.js
require("dotenv").config();
const mongoose = require("mongoose");
const Movie = require("../models/Movie");

const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN;

(async () => {
  if (!TMDB_BEARER) {
    console.error("Missing TMDB_BEARER_TOKEN in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  // Update any movie we created with a placeholder title or missing genres
  const q = {
    tmdbId: { $exists: true, $ne: null },
    $or: [{ title: /^TMDb #/ }, { genres: { $size: 0 } }],
  };

  const movies = await Movie.find(q).lean();
  console.log(`Found ${movies.length} to backfill`);

  for (const m of movies) {
    const resp = await fetch(`https://api.themoviedb.org/3/movie/${m.tmdbId}`, {
      headers: {
        Authorization: `Bearer ${TMDB_BEARER}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      console.warn(`Skip mlId=${m.mlId} tmdbId=${m.tmdbId}: ${resp.status}`);
      continue;
    }
    const info = await resp.json();
    const title = info.title || m.title;
    const genres = Array.isArray(info.genres)
      ? info.genres.map((g) => g.name)
      : m.genres;

    await Movie.updateOne({ mlId: m.mlId }, { $set: { title, genres } });
    console.log(`updated mlId=${m.mlId} to "${title}"`);
  }

  await mongoose.disconnect();
  console.log("Done.");
})();
