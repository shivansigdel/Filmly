// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Modal from "react-modal";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import MainDashboard from "./pages/MainDashboard";
import HistoryPage from "./pages/HistoryPage";

// Set the app element for react-modal accessibility
Modal.setAppElement("#root");

function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Onboarding flow: rate 5-10 movies */}
        <Route path="/dashboard/onboard" element={<Dashboard />} />
        {/* Main dashboard after onboarding */}
        <Route path="/dashboard/app" element={<MainDashboard />} />
        {/* History of rated movies */}
        <Route path="/history" element={<HistoryPage />} /> {/* ← added */}
        {/* Redirect any unknown route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
