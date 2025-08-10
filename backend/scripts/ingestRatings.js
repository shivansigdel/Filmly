#!/usr/bin/env node
// backend/scripts/ingestRatings.js

require("dotenv").config({ path: __dirname + "/../.env" });
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Rating = require("../models/Rating");

const BATCH_SIZE = 10000;

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB");

  let ops = [];
  let total = 0;

  const stream = fs
    .createReadStream(path.join(__dirname, "../../data/ratings.csv"))
    .pipe(csv());

  stream.on("data", (row) => {
    const user = +row.userId;
    const movieId = +row.movieId;
    const score = +row.rating;

    ops.push({
      updateOne: {
        filter: { user, movieId },
        update: { $set: { user, movieId, score } },
        upsert: true,
      },
    });

    if (ops.length >= BATCH_SIZE) {
      stream.pause();
      const batch = ops.splice(0, ops.length);
      Rating.bulkWrite(batch, { ordered: false })
        .then((res) => {
          total += batch.length;
          console.log(`Flushed ${batch.length} ops (total so far: ${total})`);
          stream.resume();
        })
        .catch((err) => {
          console.error("Bulk write error:", err);
          process.exit(1);
        });
    }
  });

  stream.on("end", async () => {
    if (ops.length) {
      await Rating.bulkWrite(ops, { ordered: false });
      total += ops.length;
      console.log(`Final flush of ${ops.length} ops`);
    }
    console.log(`Done writing ${total} ratings`);
    process.exit(0);
  });

  stream.on("error", (err) => {
    console.error("Stream error:", err);
    process.exit(1);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
