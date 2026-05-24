FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY shared /app/shared
COPY api-gateway /app/api-gateway

RUN pip install --default-timeout=100 -r /app/api-gateway/requirements.txt

WORKDIR /app/api-gateway
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
