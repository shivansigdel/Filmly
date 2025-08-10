const mongoose = require("mongoose");

const sequenceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    next: { type: Number, required: true },
  },
  { versionKey: false }
);

// avoid OverwriteModelError in dev hot-reloads
const Sequence =
  mongoose.models.Sequence || mongoose.model("Sequence", sequenceSchema);

/**
 * Ensure the mlId counter exists. Initializes to (max mlId in movies)+1 if missing.
 */
async function ensureSequenceInitialized() {
  const Movie = mongoose.models.Movie || require("./Movie");
  const existing = await Sequence.findById("mlId").lean();
  if (existing) return existing;

  const maxMovie = await Movie.findOne().sort({ mlId: -1 }).lean();
  const startNext = (maxMovie?.mlId || 0) + 1;

  const created = await Sequence.findOneAndUpdate(
    { _id: "mlId" },
    { $setOnInsert: { next: startNext } },
    { new: true, upsert: true }
  ).lean();

  return created;
}

/** Atomically allocate the next mlId. */
async function getNextMlId() {
  const doc = await Sequence.findOneAndUpdate(
    { _id: "mlId" },
    { $inc: { next: 1 } },
    { new: true, upsert: true }
  ).lean();
  return doc.next - 1; // allocated id is previous value
}

module.exports = { Sequence, ensureSequenceInitialized, getNextMlId };
