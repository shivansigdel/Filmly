#!/usr/bin/env node
const path = require("path");
// Load environment variables from backend/.env
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

(async function () {
  // 1) Connect to MongoDB using MONGO_URI from .env
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB at ${process.env.MONGO_URI}`);
  } catch (err) {
    console.error("Mongo connect error:", err);
    process.exit(1);
  }

  // 2) Define User and Counter models
  const User = mongoose.model(
    "User",
    new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      filmlyId: Number,
    }),
    "users"
  );
  const Counter = mongoose.model(
    "Counter",
    new mongoose.Schema({ _id: String, seq: Number }),
    "counters"
  );

  // 3) Function to get next filmlyId
  async function getNextFilmlyId() {
    const doc = await Counter.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return doc.seq;
  }

  // 4) Assign filmlyId to all users missing one
  const users = await User.find({ filmlyId: { $exists: false } });
  console.log(`Found ${users.length} users to assign filmlyIds`);

  for (const u of users) {
    const id = await getNextFilmlyId();
    u.filmlyId = id;
    await u.save();
    console.log(`Assigned ${u.email || u._id} → filmlyId ${id}`);
  }

  console.log("Done assigning filmlyIds to existing users");
  process.exit(0);
})();
