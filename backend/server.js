// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("./models/Movie");

// Routes
const authRoutes = require("./routes/authRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Sequence initializer for allocating new mlIds
const { ensureSequenceInitialized } = require("./models/Sequence");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    // Seed/create the mlId counter from current max movies.mlId if missing
    await ensureSequenceInitialized();
    console.log("mlId sequence initialized");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get("/health", (_req, res) => res.json({ ok: true }));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/recs", recommendRoutes);
app.use("/api/admin", adminRoutes);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
