#!/usr/bin/env bash
set -euo pipefail

# Go to backend root (this script lives in backend/scripts)
cd "$(dirname "$0")/.."

# Load .env so ADMIN_KEY / S3 / PORT etc are available
set -a
[ -f ".env" ] && . .env
set +a

# Find docker/aws (cron has a tiny PATH)
DOCKER_BIN="$(command -v docker)"
AWS_BIN="$(command -v aws)"

# Run trainer in Docker; upload to S3 inside the container
"$DOCKER_BIN" run --rm \
  --memory="12g" --memory-swap="16g" \
  -e MONGO_URI="mongodb://host.docker.internal:27017/filmly" \
  -e S3_BUCKET="${S3_BUCKET}" \
  -e S3_PREFIX="${S3_PREFIX:-models}" \
  -e AWS_ACCESS_KEY_ID="$("$AWS_BIN" configure get aws_access_key_id)" \
  -e AWS_SECRET_ACCESS_KEY="$("$AWS_BIN" configure get aws_secret_access_key)" \
  -e AWS_REGION="${AWS_REGION:-us-east-1}" \
  -v "$PWD/scripts:/app/scripts" \
  filmly-trainer:latest

# Hot-reload in the running Node server
curl -s -X POST "http://localhost:${PORT:-4000}/api/admin/reload-model" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -d "{\"bucket\":\"${S3_BUCKET}\",\"key\":\"${S3_PREFIX:-models}/cf_factors.json\"}" \
  >/dev/null && echo "[$(date)] Model reloaded"
