FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy shared directory
COPY shared /app/shared

# Alembic migrations (run before serving auth routes)
COPY migrations /app/migrations
COPY alembic.ini apply_db.py /app/

# Auth is mounted in-process by the gateway
COPY services/auth_service /app/services/auth_service

# Copy api-gateway
COPY api-gateway /app/api-gateway

RUN pip install --default-timeout=100 --no-cache-dir \
    -r /app/api-gateway/requirements.txt

WORKDIR /app/api-gateway
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "python /app/apply_db.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
