FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy shared library
COPY shared /app/shared

# Copy service
COPY services/auth-service /app/services/auth-service

# Install dependencies
RUN pip install --default-timeout=100 -r /app/services/auth-service/requirements.txt

# Set working directory to service
WORKDIR /app/services/auth-service

# Set Python path to include project root
ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
