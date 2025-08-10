// backend/routes/recommendRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const { recommend } = require("../controllers/recommendController");

const router = express.Router();

// Auth middleware: verify token and attach filmlyId
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ message: "Bad format" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    // Attach numeric filmlyId for the controller
    req.user = { filmlyId: payload.userId };
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

// GET /api/recommend
router.get("/", authenticate, recommend);

module.exports = router;
