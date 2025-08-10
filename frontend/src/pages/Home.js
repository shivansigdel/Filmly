// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { fetchWithApiKey } from "../api/tmdb";
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWithApiKey("movie/popular");
        setMovies((data?.results || []).slice(0, 10));
      } catch (error) {
        console.error("Error fetching movies", error);
      }
    })();
  }, []);

  const firstRow = movies.slice(0, 5);
  const secondRow = movies.slice(5, 10);

  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="all-container">
          <h1 className="logo-design">Filmly 🍿</h1>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/login">Sign In</Link>
          </li>
          <li>
            <Link to="/signup">Create Account</Link>
          </li>
          <li>
            <Link to="/films">Films</Link>
          </li>
          <li>
            <Link to="/members">Members</Link>
          </li>
        </ul>
      </nav>

      <div className="content">
        <div className="movies-row">
          {firstRow.map((m) =>
            m.poster_path ? (
              <img
                key={m.id}
                src={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                alt={m.title}
                className="background-movie"
                loading="lazy"
                decoding="async"
              />
            ) : null
          )}
        </div>

        <div className="buttons">
          <Link to="/signup" className="btn" role="button">
            Get&nbsp;Started&nbsp;–&nbsp;It’s&nbsp;Free!
          </Link>
        </div>

        <div className="movies-row">
          {secondRow.map((m) =>
            m.poster_path ? (
              <img
                key={m.id}
                src={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                alt={m.title}
                className="background-movie"
                loading="lazy"
                decoding="async"
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
