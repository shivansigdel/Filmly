#!/usr/bin/env python3
import os, json
import numpy as np
from pymongo import MongoClient
from scipy.sparse import coo_matrix
from sklearn.decomposition import TruncatedSVD

def main():
    uri = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/filmly")
    print(f"Connecting to MongoDB at {uri}...", flush=True)
    client = MongoClient(uri)
    db = client.get_default_database()

    # 1) Load ratings 
    total = db.ratings.count_documents({})
    print(f"Expecting to load {total} ratings...", flush=True)

    # 1a) Keep only movies with ≥5 ratings
    min_ratings = 5
    movies_cursor = db.ratings.aggregate(
        [
            {"$group": {"_id": "$movieId", "c": {"$sum": 1}}},
            {"$match": {"c": {"$gte": min_ratings}}},
            {"$project": {"_id": 1}},
        ],
        allowDiskUse=True,
    )
    kept_movies = [d["_id"] for d in movies_cursor]
    print(f"Kept {len(kept_movies)} movies with ≥{min_ratings} ratings", flush=True)

    # 2) Build index mappings 
    users_cursor = db.ratings.aggregate(
        [
            {"$match": {"movieId": {"$in": kept_movies}}},
            {"$group": {"_id": "$user"}},
            {"$project": {"_id": 1}},
        ],
        allowDiskUse=True,
    )
    users = sorted([d["_id"] for d in users_cursor])
    items = sorted(kept_movies)
    user2idx = {u: i for i, u in enumerate(users)}
    item2idx = {m: i for i, m in enumerate(items)}
    print(f"Unique users: {len(users)}, unique items: {len(items)}", flush=True)

    # 3) Construct rating matrix R 
    filt = {"user": {"$in": users}, "movieId": {"$in": items}}
    nnz = db.ratings.count_documents(filt)
    print(f"R nnz after filtering: {nnz}", flush=True)

    rows = np.empty(nnz, dtype=np.int32)
    cols = np.empty(nnz, dtype=np.int32)
    data = np.empty(nnz, dtype=np.float32)

    i = 0
    printed = 0
    cursor = db.ratings.find(
        filt, {"user": 1, "movieId": 1, "score": 1}, no_cursor_timeout=True
    ).batch_size(100000)
    try:
        for doc in cursor:
            u = user2idx.get(doc["user"])
            m = item2idx.get(doc["movieId"])
            if u is None or m is None:
                continue
            rows[i] = u
            cols[i] = m
            data[i] = float(doc["score"])
            i += 1
            if i // 1_000_000 > printed:
                printed = i // 1_000_000
                print(f"  filled {i}/{nnz}", flush=True)
    finally:
        cursor.close()

    if i != nnz:
        # In case of any skips, trim arrays
        rows = rows[:i]; cols = cols[:i]; data = data[:i]

    R = coo_matrix((data, (rows, cols)), shape=(len(users), len(items))).tocsr()
    print(f"R shape: {R.shape}, nnz: {R.nnz}", flush=True)

    # 5) Truncated SVD
    K = 50
    print(f"Running Truncated SVD with K={K}...", flush=True)
    svd = TruncatedSVD(n_components=K, random_state=42)
    P = svd.fit_transform(R)      # (n_users × K)
    Q = svd.components_.T         # (n_items × K)
    print("Truncated SVD complete", flush=True)
    print(f"P shape: {P.shape}, Q shape: {Q.shape}", flush=True)

    # 6) Save to JSON
    out_dir = os.path.dirname(__file__)
    out_path = os.path.join(out_dir, "cf_factors.json")
    print(f"Saving JSON to {out_path}...", flush=True)
    cf_json = {
        "P": [[round(float(x), 5) for x in row] for row in P],
        "Q": [[round(float(x), 5) for x in row] for row in Q],
        "user2idx": {int(k): int(v) for k, v in user2idx.items()},
        "item2idx": {int(k): int(v) for k, v in item2idx.items()}
    }
    with open(out_path, "w") as f:
        json.dump(cf_json, f)
    print("Saved cf_factors.json", flush=True)

    # 6b) Optional: upload to S3 if env is set
    bucket = os.environ.get("S3_BUCKET")
    if bucket:
        try:
            import boto3
            s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))
            prefix = os.environ.get("S3_PREFIX", "models").rstrip("/")
            key = f"{prefix}/cf_factors.json"
            s3.upload_file(out_path, bucket, key)
            print(f"Uploaded to s3://{bucket}/{key}", flush=True)
        except Exception as e:
            print(f"⚠️ S3 upload skipped/failed: {e}", flush=True)

    client.close()
    print("All done.", flush=True)

if __name__ == "__main__":
    main()
