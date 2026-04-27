FROM python:3.11-slim

WORKDIR /app

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy and install requirements
COPY requirements.txt .
# Use cpu-only torch to save massive amounts of memory on Railway
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy code and graph
COPY src/ ./src/
COPY config/ ./config/
COPY data/index/ ./data/index/

# 4. Environment
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# 5. Launch - Let Railway provide the PORT
CMD ["python", "src/query.py"]
