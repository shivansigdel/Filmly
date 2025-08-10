// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { searchMovies } from "../api/tmdb";
import MovieDetail from "./MovieDetail";
import "./Dashboard.css";

Modal.setAppElement("#root");

export default function Dashboard() {
  const navigate = useNavigate();

  // UI state
  const [showWelcome, setShowWelcome] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [ratings, setRatings] = useState({}); // <-- movieId -> score
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const MIN_RATINGS = 5;

  // On mount: check if user has already rated enough to skip onboarding
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return navigate("/login");
      try {
        const res = await fetch("http://localhost:4000/api/ratings/count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { count } = await res.json();
          if (count >= MIN_RATINGS) {
            return navigate("/dashboard/app", { replace: true });
          }
        }
      } catch (err) {
        console.error(err);
      }
      setShowWelcome(true);
    };
    init();
  }, [navigate]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const movies = await searchMovies(query);
        setResults(movies);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const ratedCount = Object.keys(ratings).length;
  const canContinue = ratedCount >= MIN_RATINGS;

  const startOnboarding = () => {
    setShowWelcome(false);
    setModalIsOpen(true);
  };

  const openDetail = (movie) => {
    setSelectedMovieId(movie.id);
    setDetailOpen(true);
  };
  const closeDetail = () => setDetailOpen(false);

  const handleRate = (movieId, score) => {
    setRatings((prev) => ({ ...prev, [movieId]: score }));
    setDetailOpen(false);
  };

  const handleContinue = async () => {
    const payload = Object.entries(ratings).map(([id, score]) => ({
      movieId: Number(id),
      score,
    }));
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem("onboarded", "yes");
      navigate("/dashboard/app", { replace: true });
    } catch {
      alert("Could not save ratings. Please try again.");
    }
  };

  // 1) Show Welcome screen if still onboarding
  if (showWelcome) {
    return (
      <div className="dashboard-page">
        <div className="onboarding-welcome">
          <h2>Welcome to Filmly!</h2>
          <p>
            Before we get started, please rate <strong>5–10 movies</strong>{" "}
            you’ve watched recently.
          </p>
          <button onClick={startOnboarding}>Get Started</button>
        </div>

        {/* Keep MovieDetail mounted so you can rate as soon as they pick one */}
        <MovieDetail
          movieId={selectedMovieId}
          isOpen={detailOpen}
          onClose={closeDetail}
          onRate={handleRate}
          initialRating={ratings[selectedMovieId] || 0}
        />
      </div>
    );
  }

  // 2) Onboarding Modal (Search & Rate)
  return (
    <div className="dashboard-page">
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => {}}
        overlayClassName="modal-overlay"
        className="modal-content"
      >
        <h3>Search & Rate</h3>
        <div className="modal-search">
          <input
            type="search"
            placeholder="Search for a movie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="modal-results">
          {results.map((m) => (
            <div
              key={m.id}
              className={`movie-row${ratings[m.id] ? " movie-row--added" : ""}`}
              onClick={() => openDetail(m)}
            >
              {m.poster_path ? (
                <img
                  className="poster"
                  src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                  alt={m.title}
                />
              ) : (
                <div className="poster poster--placeholder" />
              )}
              <div className="details">
                <h4>{m.title}</h4>
                <p>{m.release_date?.slice(0, 4)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <span>
            Rated {ratedCount} / {MIN_RATINGS}
          </span>
          <button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </button>
        </div>
      </Modal>

      <MovieDetail
        movieId={selectedMovieId}
        isOpen={detailOpen}
        onClose={closeDetail}
        onRate={handleRate}
        initialRating={ratings[selectedMovieId] || 0}
      />
    </div>
  );
}
