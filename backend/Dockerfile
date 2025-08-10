# backend/Dockerfile  (trainer image)
FROM python:3.11-slim

# System deps for scipy/sklearn
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gfortran && rm -rf /var/lib/apt/lists/*

# Python deps (add boto3)
RUN pip install --no-cache-dir numpy scipy scikit-learn pymongo boto3

# App files
WORKDIR /app
COPY scripts /app/scripts

# Default command (override when running)
CMD ["python3", "/app/scripts/train_cf.py"]