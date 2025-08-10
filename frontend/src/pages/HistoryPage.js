// src/pages/HistoryPage.js
import React, { useState, useEffect } from "react";
import { fetchWithApiKey } from "../api/tmdb";
import MovieDetail from "./MovieDetail";
import "./HistoryPage.css";

export default function HistoryPage() {
  const [rated, setRated] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedScore, setSelectedScore] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetch("http://localhost:4000/api/ratings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (list) => {
        const detailed = await Promise.all(
          list.map((r) =>
            fetchWithApiKey(`movie/${r.movieId}`)
              .then((d) => ({
                id: r.movieId,
                score: r.score,
                title: d.title,
                poster_path: d.poster_path,
              }))
              .catch(() => null)
          )
        );
        setRated(detailed.filter((x) => x));
      })
      .catch(console.error);
  }, []);

  const openDetail = (id, score) => {
    setSelectedId(id);
    setSelectedScore(score);
    setDetailOpen(true);
  };
  const closeDetail = () => setDetailOpen(false);

  return (
    <div className="history-page">
      <h2>Your Rating History</h2>
      {rated.length === 0 ? (
        <p>You haven’t rated any movies yet.</p>
      ) : (
        <div className="history-grid">
          {rated.map((m) => (
            <div
              key={m.id}
              className="history-card"
              onClick={() => openDetail(m.id, m.score)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={`https://image.tmdb.org/t/p/w154${m.poster_path}`}
                alt={m.title}
              />
              <div className="history-info">
                <p className="history-title">{m.title}</p>
                <p className="history-score">Your Score: {m.score}/10</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <MovieDetail
        movieId={selectedId}
        isOpen={detailOpen}
        onClose={closeDetail}
        onRate={() => {}}
        initialRating={selectedScore}
      />
    </div>
  );
}
