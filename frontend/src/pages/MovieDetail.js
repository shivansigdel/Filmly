// src/pages/MovieDetail.js
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { fetchWithApiKey } from "../api/tmdb";
import "./MovieDetail.css";

Modal.setAppElement("#root");

export default function MovieDetail({
  movieId,
  isOpen,
  onClose,
  onRate,
  initialRating = 0,
}) {
  const [movie, setMovie] = useState(null);
  const [selectedVal, setSelectedVal] = useState(0);
  const [hoverVal, setHoverVal] = useState(0);

  useEffect(() => {
    if (!movieId) return;
    setMovie(null);
    fetchWithApiKey(`movie/${movieId}?append_to_response=credits`)
      .then((data) => setMovie(data))
      .catch(console.error);
  }, [movieId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedVal(initialRating);
      setHoverVal(0);
    }
  }, [isOpen, movieId, initialRating]);

  if (!movie) return null;

  const displayVal = hoverVal > 0 ? hoverVal : selectedVal;
  const stars = Array.from({ length: 10 }, (_, idx) => {
    const val = idx + 1,
      filled = displayVal >= val;
    return (
      <span
        key={idx}
        className={`star ${filled ? "star-full" : "star-empty"}`}
        onMouseEnter={() => setHoverVal(val)}
        onMouseLeave={() => setHoverVal(0)}
        onClick={() => {
          setSelectedVal(val);
          onRate(movieId, val);
        }}
      >
        ★
      </span>
    );
  });

  const director = movie.credits.crew.find((c) => c.job === "Director")?.name;
  const cast = movie.credits.cast
    .slice(0, 6)
    .map((c) => c.name)
    .join(", ");

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="modal-overlay"
      className="modal-detail-content"
    >
      <button className="back-button" onClick={onClose}>
        ←
      </button>
      <button className="close-button" onClick={onClose}>
        −
      </button>

      <div className="detail-container">
        <img
          className="detail-poster"
          src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
          alt={movie.title}
        />

        <div className="detail-info">
          <h2>{movie.title}</h2>
          <p className="subheading">
            {new Date(movie.release_date).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            • {movie.runtime} min
          </p>
          <p className="genres">{movie.genres.map((g) => g.name).join(", ")}</p>
          <p className="rating">
            ⭐ {movie.vote_average.toFixed(1)} IMDb rating
          </p>

          <div className="star-input">{stars}</div>

          <p className="overview">{movie.overview}</p>
          <p className="credits">
            <strong>Cast:</strong> <em>{cast}</em>
          </p>
          <p className="credits">
            <strong>Director:</strong> <em>{director}</em>
          </p>
        </div>
      </div>
    </Modal>
  );
}
