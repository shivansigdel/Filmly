// authController.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Counter model (for filmlyId)
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number,
});
const Counter = mongoose.model("Counter", counterSchema, "counters");

const signUp = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // 1) Prevent duplicate emails/usernames
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // 2) Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3) Generate the next filmlyId
    const counterDoc = await Counter.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const filmlyId = counterDoc.seq;

    // 4) Create the new user with filmlyId
    const newUser = new User({
      filmlyId,
      email,
      username,
      password: hashedPassword,
    });
    await newUser.save();

    // 5) Respond (you can also issue a token here)
    res.status(201).json({ message: "User created", filmlyId });
  } catch (err) {
    console.error("Error during sign-up:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Sign JWT using numeric filmlyId
    const token = jwt.sign(
      { userId: user.filmlyId },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signUp, login };
