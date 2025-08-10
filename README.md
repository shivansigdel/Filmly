# Filmly — Personalized Movie Recommendations

Filmly is a full‑stack movie recommendation app with a React frontend, a Node/Express API, MongoDB storage, and a collaborative‑filtering model. Users rate movies (1–10), get a personalized **Suggested For You** shelf, and can browse trending/now‑playing/top‑rated via TMDb.

---

## Features

* **Auth (JWT)**: Email + password login/signup.
* **Onboarding**: Prompt to rate 5–10 titles before entering the app.
* **Personalized recs**: Matrix‑factorization (SVD) user × item factors.
* **Live search**: TMDb search with instant detail modal + in‑app rating.
* **History**: Horizontal scroll of previously rated movies.
* **TMDb ⇄ MovieLens mapping**: Normalize ratings storage to MovieLens IDs; handle TMDb‑only titles by allocating new internal IDs.

> Note: If cold‑start fallback (genre/language) or nightly training isn’t enabled yet, those are on the roadmap—see below.

---

## Tech Stack

* **Frontend**: React, react‑router, react‑modal, vanilla CSS
* **Backend**: Node.js, Express, JWT
* **Database**: MongoDB
* **Recommender**: SVD / matrix factorization (Python or Node pipeline)
* **Data**: TMDb API for metadata; MovieLens mappings (optional)

---

## Repo Structure (example)

```
filmly/
├─ backend/
│  ├─ models/            # User, Movie, Rating, Counter
│  ├─ routes/            # /auth, /ratings, /recs
│  ├─ controllers/
│  ├─ scripts/           # (optional) ingest/train utilities
│  ├─ server.js
│  └─ .env.example
├─ frontend/             # React app (if split)
│  └─ src/
│     ├─ api/tmdb.js
│     └─ pages/          # Home, Login, SignUp, Dashboard, History, MovieDetail
├─ data/                 # links.csv, movies.csv (MovieLens) — DO NOT COMMIT
└─ README.md
```

> Your actual layout may differ; adjust commands below accordingly.

---

## Getting Started (Local)

### 1) Prerequisites

* Node.js 18+
* MongoDB running locally (`mongodb://127.0.0.1:27017/filmly`)
* TMDb API key (v3) or bearer token (v4)

### 2) Configure Backend

Create **`backend/.env`** (see `.env.example`):

```ini
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/filmly
JWT_SECRET_KEY=

TMDB_API_KEY=
TMDB_BEARER_TOKEN=

ADMIN_KEY=6d5e4f3

S3_BUCKET=
S3_PREFIX=
AWS_REGION=us-east-1
```

> Set a real `JWT_SECRET_KEY` in development/production. Change `ADMIN_KEY` to a secret value you control. Never commit real secrets.
> `ADMIN_KEY` secures your `/api/admin/reload-model` endpoint. Leave S3 vars empty if you’re not uploading `cf_factors.json` to S3.
> Never commit real secrets.

### 2b) Configure Frontend (.env)

> Frontend env vars are public at build time. Only include non‑sensitive values.

**Create React App (CRA)** — create `frontend/.env`:

```ini
REACT_APP_TMDB_API_KEY=
REACT_APP_TMDB_BEARER_TOKEN=
```

### 3) Install & Run

**Backend**

```bash
cd backend
npm install
npm start
# API on http://localhost:4000
```

**Frontend**

```bash
# if your React app lives in /frontend
cd ../frontend
npm install
npm start
# UI on http://localhost:3000 (CRA/Vite default)
```

---

## Datasets (MovieLens) & ID Mapping

* This repo **does not** include the `data/` folder. Download a MovieLens dataset and place the CSVs locally.
* Recommended: **MovieLens 32M (ml-32m)** — 32,000,204 ratings, 2,000,072 tags, 87,585 movies, 200,948 users (collected Oct 2023; released May 2024). Files: `links.csv`, `movies.csv`, `ratings.csv`, `tags.csv`.

### Download (Option A: 32M)

```bash
mkdir -p data && cd data
curl -LO https://files.grouplens.org/datasets/movielens/ml-32m.zip
unzip ml-32m.zip && mv ml-32m/* . && rmdir ml-32m
ls -lh links.csv movies.csv ratings.csv tags.csv
```

### Download (Option B: 25M)

```bash
mkdir -p data && cd data
curl -LO https://files.grouplens.org/datasets/movielens/ml-25m.zip
unzip ml-25m.zip && mv ml-25m/* . && rmdir ml-25m
```

> For quick demos, you can also use **ml-latest-small** (100k ratings), but the recommender quality will be lower.



### Keep data out of git

Add to your `.gitignore`:

```gitignore
# datasets
/data/
*.zip
```

### How Filmly uses the data

* On backend startup, Filmly builds a **TMDb → MovieLens** map from `data/links.csv`.
* Ratings submitted with TMDb IDs are **normalized** to MovieLens IDs before storage.
* If a TMDb title isn’t in MovieLens, Filmly can allocate a new internal ID and store it (metadata pulled from TMDb). New titles join model training once they reach a minimum number of ratings (e.g., ≥5).

#### Data freshness & new titles (post‑2023)

* The **ml‑32m** snapshot covers ratings up to **2023**. New releases after that date won’t appear in the offline dataset by default.
* Filmly closes that gap by allowing **TMDb‑only titles** to be rated immediately. Once a new title accumulates **≥5 ratings** (configurable), it is **kept for training** and becomes eligible for recommendations after the next model run (e.g., nightly cron).
* In short: *as users rate new movies, they are gradually incorporated into `training_cf` and the recs will include them over time*.

---

## API (Quick Reference)

### Auth

* `POST /api/auth/signup` → create user
* `POST /api/auth/login` → returns `{ token }` (JWT)

### Ratings

* `POST /api/ratings` → body: `[{ movieId, score }]` (accepts TMDb or MovieLens IDs)
* `GET  /api/ratings` → current user’s rating history
* `GET  /api/ratings/count` → total number of ratings for current user

### Recommendations

* `GET /api/recs?limit=20` → personalized top‑N (default 10; pass `limit` to request more)

**Example:**

```bash
curl http://localhost:4000/api/recs?limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Frontend Pages

* **Home**: Navbar + CTA, blurred poster rows (TMDb popular).
* **Login / SignUp**: Forms with validation; token saved to `localStorage`.
* **Onboarding Dashboard**: Search + rate until minimum (5) is reached.
* **Main Dashboard**: Shelves for Trending, New Releases, Most Popular, and **Suggested For You** (personalized). Live search with dropdown.
* **History**: Scrollable grid of rated titles.
* **Movie Detail Modal**: Poster, metadata (genres, runtime), TMDb user rating, and 10‑star input.

---

## Configuration Knobs

* **Minimum ratings to unlock app**: `MIN_RATINGS` (frontend onboarding screen).
* **Recs limit**: use `GET /api/recs?limit=20` (frontend slices to 20 in `MainDashboard.js`).
* **Image sizes**: TMDb `w92`, `w154`, `w342`, `w500` endpoints used across pages.

---

## Recommender Details (Truncated SVD)

Filmly's recommender uses **TruncatedSVD** (from `sklearn.decomposition`) on a sparse user×item ratings matrix.

* **Pre‑filtering:** Keep only items with at least **≥5 ratings** to reduce noise and shrink the matrix.
* **Matrix build:** Construct `R` as a CSR sparse matrix with shape `(n_users, n_items)` using integer index maps `user2idx` / `item2idx`.
* **Factorization:** `TruncatedSVD(n_components=50, random_state=42)` →

  * `P = svd.fit_transform(R)` → user factors `(n_users × K)`
  * `Q = svd.components_.T` → item factors `(n_items × K)`
* **Scoring:** Predicted preference is the dot‑product `\hat{r}_{u,i} = P[u] · Q[i]`. Top‑N recs are the highest‑scoring unseen items for a user.
* **Artifacts:** Factors + index maps are saved to `cf_factors.json` (and can be uploaded to S3). The server can **hot‑reload** the model via an admin endpoint without downtime.

> Default hyperparameters: `K=50`, min ratings per item = `5`. Adjust as you like.

---

### How Recommendations Work (at a glance)

* You rate a few movies (5–10) to kick‑start the system.
* Behind the scenes, Filmly uses **Truncated SVD** (a matrix‑factorization technique) to learn a handful of hidden **themes** from the anonymized user–movie ratings.
* Each **user** and **movie** gets a small vector (latent factors) describing its position on those themes.
* To recommend, we compare a user’s vector with every unseen movie’s vector using a simple **dot product** (measure of alignment) and return **up to 20** highest‑scoring picks.
* Keeping only the **top K** themes (the “truncated” part) reduces noise, handles sparse data, and keeps responses fast.
* New releases join training once they reach **≥5 ratings**, so suggestions stay fresh beyond the dataset snapshot.

**Tuning note:** A **K≈50** default balances nuance and speed; increase K for more detail or decrease for lighter workloads.

## Roadmap (Optional)

* **Nightly training** (cron/Docker) that rebuilds factors from Mongo ratings.
* **Model artifact store** (e.g., S3) and **hot‑reload** endpoint.
* **Cold‑start fallback** using TMDb metadata (genre/language) when CF coverage is low.


---

## Troubleshooting

* **Unauthorized** → Ensure `Authorization: Bearer <token>` header is present.
* **TMDb 401/403** → Check TMDb key/bearer in backend `.env`.
* **No recs** → Ensure user has ≥5 ratings and the recommender model is loaded.
* **CORS** → If the frontend is hosted separately, enable that origin on the backend.

---

## Demo: Rate Movies & Get Recs (cURL)

Below is a quick, copy‑pasteable flow to try Filmly locally.

> Replace emails/passwords with your own. Capture the `token` from the login response and export it as `$TOKEN`.

### 1) Sign up (or skip if you already have a user)

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@filmly.app","username":"demo","password":"demo123"}'
```

### 2) Log in and save the JWT

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@filmly.app","password":"demo123"}' | jq -r .token)
```

### 3) Rate a few movies (TMDb IDs are accepted — backend normalizes to MovieLens)

```bash
curl -X POST http://localhost:4000/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"movieId":155,    "score":9},  # The Dark Knight
    {"movieId":157336, "score":9},  # Interstellar
    {"movieId":603,    "score":10}, # The Matrix
    {"movieId":27205,  "score":9},  # Inception
    {"movieId":11,     "score":8}   # Star Wars (1977)
  ]'
```

> Post at least **5 ratings** so the recommender has enough signal.

### 4) Fetch your recommendations (ask for 20)

```bash
curl "http://localhost:4000/api/recs?limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:5]'
```

You should get an array like:

```json
[
  { "tmdbId": 123, "title": "Example Movie", "score": 7.42 },
  { "tmdbId": 456, "title": "Another Movie", "score": 7.31 }
]
```

### (Optional) Hot‑reload a newly trained model

```bash
curl -X POST http://localhost:4000/api/admin/reload-model \
  -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{"bucket":"'$S3_BUCKET'","key":"'$S3_PREFIX'/cf_factors.json"}'
```


## Acknowledgements

* MovieLens dataset by GroupLens
* TMDb for metadata and posters


