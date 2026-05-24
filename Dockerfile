# Multi-stage build for the entire project
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build runtime
FROM docker:latest
WORKDIR /app

# Install Docker Compose
RUN apk add --no-cache docker-compose

# Copy the entire project
COPY . .

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules

# Expose ports
EXPOSE 3000 8000 5000

# Default command - run docker-compose
CMD ["docker-compose", "up"]
