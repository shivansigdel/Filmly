// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.status === 200) {
        // Save the JWT and redirect into the onboarding flow
        localStorage.setItem("authToken", data.token);
        console.log("Login successful! Redirecting to onboarding...");
        navigate("/dashboard/onboard");
      } else {
        alert(data.message || "An error occurred");
      }
    } catch (error) {
      console.error("Error logging in", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-form-box">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="login-container">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-container">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-submit-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
