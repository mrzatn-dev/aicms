FROM python:3.12-slim

ARG INSTALL_LOCAL_WHISPER=false

# Install system dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY services/transcription-service/requirements.txt .
COPY services/transcription-service/requirements-local-whisper.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_LOCAL_WHISPER" = "true" ]; then \
         pip install --no-cache-dir -r requirements-local-whisper.txt; \
       fi

# Copy service code
COPY services/transcription-service/ .
COPY shared/ ./shared/

# Create uploads directory
RUN mkdir -p /tmp/uploads

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8007/health', timeout=5)"

# Run the application
CMD ["python", "main.py"]
