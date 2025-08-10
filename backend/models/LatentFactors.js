// models/LatentFactors.js
const fs = require("fs");
const path = require("path");

let Q = [];
let item2idx = {};
let idx2item = {};
let ready = false;

function normalizeRow(v) {
  const n = Math.hypot(...v);
  return n ? v.map((x) => x / n) : v;
}

function buildIdx2Item(map) {
  // JSON keys are strings; ensure we turn them into numbers
  const out = {};
  for (const [mlIdStr, idx] of Object.entries(map)) {
    out[idx] = parseInt(mlIdStr, 10);
  }
  return out;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function loadFromObject(obj) {
  if (!obj || !Array.isArray(obj.Q) || !obj.item2idx) {
    throw new Error("Bad cf_factors payload: expected keys Q and item2idx");
  }
  Q = obj.Q.map(normalizeRow); // normalize rows for cosine
  item2idx = obj.item2idx;
  idx2item = buildIdx2Item(item2idx);
  ready = true;
  return { Q, item2idx };
}

async function init(customPath) {
  const jsonPath =
    customPath || path.resolve(__dirname, "../scripts/cf_factors.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return loadFromObject(parsed);
}

function getSimilarMovies(mlId, topK = 10) {
  if (!ready) return [];
  const idx = item2idx[mlId];
  if (idx === undefined) return [];

  const v = Q[idx];
  const sims = Q.map((row, j) => ({
    movieId: idx2item[j],
    sim: dot(v, row),
  }));

  return sims
    .filter((x) => x.movieId !== mlId)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topK);
}

/** Expose readiness and current factors */
function isReady() {
  return ready;
}
function current() {
  return { Q, item2idx };
}

function loadFromJSON(jsonStringOrBuffer) {
  const parsed = JSON.parse(
    Buffer.isBuffer(jsonStringOrBuffer)
      ? jsonStringOrBuffer.toString("utf8")
      : jsonStringOrBuffer
  );
  return loadFromObject(parsed);
}

function reloadFromJson(objOrStr) {
  if (typeof objOrStr === "string" || Buffer.isBuffer(objOrStr)) {
    return loadFromJSON(objOrStr);
  }
  return loadFromObject(objOrStr);
}

module.exports = {
  init,
  getSimilarMovies,
  isReady,
  current,
  loadFromJSON,
  reloadFromJson,
};
