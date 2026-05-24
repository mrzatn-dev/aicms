FROM python:3.12-slim

WORKDIR /app

# Copy shared code
COPY shared/ /app/shared/

# Copy service code
COPY services/user-service/ /app/services/user-service/

# Install dependencies
RUN pip install --no-cache-dir -r /app/services/user-service/requirements.txt

WORKDIR /app/services/user-service

CMD ["python", "main.py"]
