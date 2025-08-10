import React, { useState, useEffect } from "react";
import { searchMovies } from "../api/tmdb"; //TMDB helper
import "./SearchAndRate.css";

export default function SearchAndRate({ onRate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // debounce the API calls
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const movies = await searchMovies(query);
        setResults(movies);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="search-rate-container">
      <input
        className="search-input"
        type="search"
        placeholder="Search for a movie…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="results-list">
        {results.map((m) => (
          <div key={m.id} className="movie-row">
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

            <button
              className="add-button"
              onClick={() => onRate(m)}
              title="Add / Rate this movie"
            >
              ＋
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
