# Infrastructure for Railway Deployment
# Multi-process container for NABR Intelligence Platform

FROM python:3.11-slim

WORKDIR /app

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy source code and pre-built index (the "Brain")
COPY src/ ./src/
COPY config/ ./config/
COPY data/index/ ./data/index/

# 4. Environment setup
ENV PYTHONPATH=/app/src
ENV PORT=8000

# 5. Expose port
EXPOSE 8000

# 6. Launch the Backend
CMD ["python", "src/query.py"]
