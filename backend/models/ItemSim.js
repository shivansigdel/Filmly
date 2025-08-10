// backend/models/ItemSim.js
const mongoose = require("mongoose");

const ItemSimSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true }, // MovieLens mlId
    sims: [
      {
        movieId: { type: Number, required: true }, // neighbor mlId
        sim: { type: Number, required: true }, // cosine similarity
      },
    ],
  },
  {
    _id: false,
    collection: "itemSims",
  }
);

module.exports = mongoose.model("ItemSim", ItemSimSchema);
