FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY shared /app/shared
COPY services/ai-service /app/services/ai-service

RUN pip install --default-timeout=100 -r /app/services/ai-service/requirements.txt

WORKDIR /app/services/ai-service
ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
