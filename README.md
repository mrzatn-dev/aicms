# AI-Powered Microservice Content Management System

A production-level microservice web application for managing content with AI-powered analysis and validation.

## Architecture

```
User → Frontend (Next.js) → API Gateway → Microservices
                                              ├── Auth Service (8001)
                                              ├── Content Service (8002)
                                              ├── Validation Service (8003)
                                              ├── AI Analysis Service (8004)
                                              └── Analytics Service (8005)
```

Services communicate via **REST API** and **RabbitMQ** message broker.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, asyncpg |
| Frontend | Next.js 14, React, TailwindCSS |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Broker | RabbitMQ 3 |
| Auth | JWT (python-jose, bcrypt) |
| AI/NLP | Custom NLP pipeline (classification, summarization, toxicity) |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose

### Run the Application

```bash
# Clone and start all services
docker compose up --build

# Services will be available at:
# Frontend:     http://localhost:3000
# API Gateway:  http://localhost:8000
# API Docs:     http://localhost:8000/docs
# RabbitMQ UI:  http://localhost:15672
```

### Default Admin Credentials
- **Email:** admin@cms.local
- **Password:** admin123

## 🚀 Production Deployment

**⚠️ IMPORTANT:** Before deploying to production, read the production setup documentation!

- **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** - Complete production deployment guide
  - Environment configuration
  - Database setup
  - SSL/HTTPS configuration
  - OAuth 2.0 setup (Google & GitHub)
  - CORS configuration
  - Docker deployment
  - Security checklist

- **[OAUTH_SETUP_QUICK.md](./OAUTH_SETUP_QUICK.md)** - Quick OAuth setup cheat sheet
  - 5-minute Google OAuth setup
  - 5-minute GitHub OAuth setup
  - Common errors & fixes
  - Testing checklist

### Quick Production Steps

1. **Copy production environment file**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

2. **Configure OAuth providers**
   - Google: [PRODUCTION_SETUP.md#google-oauth](./PRODUCTION_SETUP.md#google-oauth-configuration)
   - GitHub: [PRODUCTION_SETUP.md#github-oauth](./PRODUCTION_SETUP.md#github-oauth-configuration)

3. **Deploy**
   ```bash
   # Using production docker-compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Project Structure

```
/diplom-ex
├── api-gateway/           # API Gateway (port 8000)
│   ├── main.py            # FastAPI app
│   ├── router.py          # Route proxy to services
│   └── middleware.py       # Auth & rate limiting
├── services/
│   ├── auth-service/      # Authentication (port 8001)
│   ├── content-service/   # Content CRUD (port 8002)
│   ├── validation-service/ # Content validation (port 8003)
│   ├── ai-service/        # AI/NLP analysis (port 8004)
│   └── analytics-service/ # Metrics & dashboards (port 8005)
├── shared/                # Shared library
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── config.py          # Settings
│   ├── database.py        # Async DB engine
│   ├── broker.py          # RabbitMQ client
│   └── auth.py            # JWT utilities
├── frontend/              # Next.js 14 app
│   └── src/app/
│       ├── page.tsx        # Home page
│       ├── content/        # Content listing & detail
│       ├── login/          # Login page
│       ├── register/       # Registration page
│       └── admin/          # Admin dashboard
├── docker/
│   └── postgres/init.sql  # DB initialization
└── docker-compose.yml     # Full stack orchestration
```

## AI Workflow

1. **Content Created** → Content Service receives article
2. **Validation** → Sent to Validation Service via RabbitMQ
3. **AI Analysis** → If valid, sent to AI Service for NLP processing
4. **Results Stored** → Analysis results saved, article status updated to Published
5. **Available** → Content visible on public site with AI-generated summary

## API Endpoints

### Auth Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | User registration |
| POST | /login | User login (JWT) |
| GET | /google | Start Google OAuth |
| GET | /callback/google | Google OAuth callback (via gateway) |
| GET | /me | Current user profile |
| GET | /users | List users (admin) |

### OAuth setup

1. Copy `.env.example` to `.env` and fill `GOOGLE_*`.
2. **Google Cloud Console**:
   - **Authorized JavaScript origins:** `https://your-app.onrender.com`
   - **Authorized redirect URI:** `https://your-app.onrender.com/api/auth/callback/google`
3. Environment variables on **auth-service**:
   - `OAUTH_API_BASE_URL=https://your-api.onrender.com`
   - `OAUTH_REDIRECT_URI=https://your-frontend.onrender.com/oauth/callback`
5. On the **frontend** build: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`

If `OAUTH_API_BASE_URL` is unset, the auth service uses `X-Forwarded-Host` from the API gateway (Render sets this automatically).

### Content Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /content | Create article |
| GET | /content | List articles (search, filter) |
| GET | /content/{id} | Get article |
| PUT | /content/{id} | Update article |
| DELETE | /content/{id} | Delete article |

### Analytics Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dashboard | Full dashboard stats |
| GET | /stats/content | Content statistics |
| GET | /stats/users | User statistics |
| GET | /logs | System logs |
