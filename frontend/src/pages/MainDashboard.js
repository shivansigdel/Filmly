// src/pages/MainDashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchWithApiKey, searchMovies } from "../api/tmdb";
import MovieDetail from "./MovieDetail";
import "./MainDashboard.css";

export default function MainDashboard() {
  // carousel data
  const [trending, setTrending] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [mostPopular, setMostPopular] = useState([]);
  const [suggested, setSuggested] = useState([]);

  // detail‑modal & ratings state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [ratings, setRatings] = useState({}); // { movieId: score }
  const [pastMovies, setPastMovies] = useState([]); // retained for potential reuse

  // live‑search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────────
  // 1) Fetch CF “Suggested For You” list on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetch("http://localhost:4000/api/recs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load recommendations");
        return r.json();
      })
      .then((recs) => {
        const top10 = recs.slice(0, 20);
        return Promise.all(
          top10
            .filter((r) => Number.isInteger(r.tmdbId))
            .map((r) =>
              fetchWithApiKey(`movie/${r.tmdbId}`).then((d) => ({
                id: r.tmdbId,
                poster_path: d.poster_path,
                title: d.title,
                score: r.score,
              }))
            )
        );
      })
      .then((movies) => setSuggested(movies))
      .catch(console.error);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────────

  // load carousel sections
  useEffect(() => {
    fetchWithApiKey("trending/movie/week").then((d) => setTrending(d.results));
    fetchWithApiKey("movie/now_playing").then((d) => setNowPlaying(d.results));
    fetchWithApiKey("movie/top_rated").then((d) => setMostPopular(d.results));
  }, []);

  // fetch your user’s saved ratings + load recent posters
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetch("http://localhost:4000/api/ratings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (ratingsList) => {
        const map = {};
        ratingsList.forEach((r) => {
          map[r.movieId] = r.score;
        });
        setRatings(map);

        const last8 = ratingsList.slice(-8).reverse();
        const details = await Promise.all(
          last8.map((r) =>
            fetchWithApiKey(`movie/${r.movieId}`).then((d) => ({
              id: r.movieId,
              poster_path: d.poster_path,
            }))
          )
        );
        setPastMovies(details);
      })
      .catch(console.error);
  }, []);

  // debounce & call TMDB search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchMovies(searchTerm);
        setSearchResults(results.slice(0, 8));
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // open / close detail modal
  const openDetail = (id) => {
    setSelectedMovieId(id);
    setDetailOpen(true);
    setShowSearchDropdown(false);
  };
  const closeDetail = () => setDetailOpen(false);

  // save the user’s pick
  const handleRate = async (movieId, score) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch("http://localhost:4000/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([{ movieId, score }]),
      });
      if (!res.ok) throw new Error("Failed to save rating");

      setRatings((prev) => ({ ...prev, [movieId]: score }));
      setDetailOpen(false);
    } catch (err) {
      console.error("Error saving rating:", err);
    }
  };

  const renderSection = (title, movies) => (
    <div className="section">
      <h2 className="section-title">{title}</h2>
      <div className="carousel">
        {movies.map((m) => (
          <div key={m.id} className="card" onClick={() => openDetail(m.id)}>
            {m.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w200${m.poster_path}`}
                alt={m.title}
              />
            ) : (
              <div className="placeholder" />
            )}
            <p className="title">{m.title}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Navbar with live search + history button */}
      <nav className="dashboard-navbar">
        <div className="navbar-left">
          <h1 className="logo-design">Filmly 🍿</h1>
        </div>

        <div className="navbar-center">
          <div className="search-container">
            <input
              type="search"
              className="dashboard-search"
              placeholder="Search all movies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchResults.length) setShowSearchDropdown(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSearchDropdown(false), 200);
              }}
            />
            {showSearchDropdown && (
              <ul className="search-dropdown">
                {searchResults.length > 0 ? (
                  searchResults.map((m) => (
                    <li
                      key={m.id}
                      className="search-item"
                      onClick={() => openDetail(m.id)}
                    >
                      {m.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${m.poster_path}`}
                          alt={m.title}
                          className="search-thumb"
                        />
                      )}
                      <span>{m.title}</span>
                      <small>({m.release_date?.slice(0, 4) || "—"})</small>
                    </li>
                  ))
                ) : (
                  <li className="search-item">No matches</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="navbar-right">
          <ul className="nav-links">
            <li>
              <Link to="/history">History</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main content pushed below navbar */}
      <div className="main-dashboard">
        {renderSection("Trending This Week", trending)}
        {renderSection("New Releases", nowPlaying)}
        {renderSection("Most Popular (All Time)", mostPopular)}
        {renderSection("Suggested For You", suggested)}

        {/* Detail modal with previous‑rating hydration */}
        <MovieDetail
          movieId={selectedMovieId}
          isOpen={detailOpen}
          onClose={closeDetail}
          onRate={handleRate}
          initialRating={ratings[selectedMovieId] || 0}
        />
      </div>
    </>
  );
}
