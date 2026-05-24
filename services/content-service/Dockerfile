FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY shared /app/shared
COPY services/content-service /app/services/content-service

RUN pip install --default-timeout=100 -r /app/services/content-service/requirements.txt

WORKDIR /app/services/content-service
ENV PYTHONPATH=/app

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
