# Backend Dockerfile for GPXIFY
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run migrations then start the application
# Note: Migrations skipped temporarily due to existing production schema
# CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
# Increase request body size limit to 30MB (slightly above 25MB to allow headers)
ENV UVICORN_LIMIT_MAX_REQUEST_SIZE=31457280
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
