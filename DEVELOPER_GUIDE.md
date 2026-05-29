# Developer Guide - Getting Started

Welcome! This guide helps you understand the production-ready setup of this CMS microservice system.

## Quick Links

### 🚀 Want to Deploy to Production?
Start here: **[DEPLOY_QUICK.md](./DEPLOY_QUICK.md)**
- 5-step deployment guide
- Expected time: ~30 minutes

### 🔐 Need Complete Production Guide?
Read: **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)**
- Everything about production deployment
- Security, OAuth, CORS, monitoring, backups

### 🔑 Setting up OAuth?
Use: **[OAUTH_SETUP_QUICK.md](./OAUTH_SETUP_QUICK.md)**
- Google OAuth in 5 minutes
- GitHub OAuth in 5 minutes
- Common errors & fixes

### 🛡️ Security Questions?  
Check: **[SECURITY.md](./SECURITY.md)**
- Pre-launch security checklist
- Best practices
- Backup procedures
- Incident response

### 📋 What Changed?
Details: **[PRODUCTION_CHANGES.md](./PRODUCTION_CHANGES.md)**
- All modifications made
- Why each change was necessary
- Configuration examples

---

## Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Nginx Reverse Proxy (443)                       │
│  - SSL/TLS Termination                                      │
│  - Routes /api/* → API Gateway                              │
│  - Routes /* → Frontend                                     │
└─────────┬───────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬──────────────────┐
    │            │                  │
    ▼            ▼                  ▼
Frontend     API Gateway       (localhost)
(3000)       (8000)
    │            │                  
    │            │ (Internal Docker Network)
    │     ┌──────┴─────────┬──────────┬──────────┐
    │     │                │          │          │
    │     ▼                ▼          ▼          ▼
    │  Auth-Service   Content-Service  AI-Service  ...
    │  (8001)         (8002)           (8004)
    │     │                │          │          │
    │     └──────┬─────────┴──────────┴──────────┘
    │            │
    │     ┌──────┴─────────┬──────────┬──────────┐
    │     │                │          │          │
    │     ▼                ▼          ▼          ▼
    │  PostgreSQL       Redis      RabbitMQ
    │  (Database)       (Cache)    (Messages)
    │
    ▼
Static Files
```

## Environment Files

### Development (local with docker-compose)
```bash
# Use default docker-compose.yml
# Automatically reads .env.local

docker-compose up --build
# Services available at:
# - Frontend: http://localhost:3000
# - API: http://localhost:8000
```

### Production (production servers)
```bash
# Use docker-compose.prod.yml
# Reads .env with production values

# 1. Copy and configure
cp .env.production .env
nano .env  # Edit with production values

# 2. Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration Flow

```
1. Environment Variables (.env file)
   - Set via: export VAR_NAME=value
   - Or in .env file in project root
   
2. Pydantic Settings (shared/config.py)
   - Reads from .env automatically
   - AppSettings object is singleton
   - settings.VARIABLE_NAME in code
   
3. Services (all microservices)
   - Import: from shared.config import settings
   - Use: settings.JWT_SECRET_KEY, settings.CORS_ORIGINS, etc.
   
4. Environment-based behavior
   - DEBUG=true → verbose logging
   - DEBUG=false → silent operation
   - CORS_ORIGINS → specific domains only
   - JWT_SECRET_KEY → encryption key
```

## Security Best Practices (Summary)

### Never Do This ❌
```python
allow_origins = ["*"]  # Don't - exposes to CSRF
DEBUG = True  # Don't - exposes stack traces
JWT_SECRET_KEY = "my-secret"  # Don't - hardcoded
```

### Always Do This ✅
```python
# In code:
allow_origins = settings.allowed_origins_list  # From .env
DEBUG = settings.DEBUG  # From .env
JWT_SECRET_KEY = settings.JWT_SECRET_KEY  # From .env

# In .env:
CORS_ORIGINS=https://app.example.com,https://api.example.com
DEBUG=false
JWT_SECRET_KEY=<generated-strong-secret>
```

### .env File Security
```bash
# ✅ DO
# Keep .env ONLY on production server
# Never commit to git (it's in .gitignore)
# Use strong, unique passwords
# Rotate secrets monthly

# ❌ DON'T  
# Share .env file in Slack/Email
# Commit .env to git
# Use default passwords
# Hardcode secrets in code
```

## Common Tasks

### Adding a New Endpoint

```python
# 1. Add to service (e.g., content-service/main.py)
@app.post("/api/items")
async def create_item(item: ItemCreate):
    return {"item": item}

# 2. The API Gateway automatically proxies to it
# GET /api/items → content-service:8002/api/items

# 3. Frontend uses api.ts to access it
const response = await fetch(`${API_URL}/api/items`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(item)
});
```

### Debugging OAuth Errors

```bash
# 1. Check endpoints exist
curl -I https://your-domain.com/api/auth/google
# Should return 302 (redirect), not 404

# 2. Check configuration
cat .env | grep OAUTH
# Verify OAUTH_API_BASE_URL, OAUTH_REDIRECT_URI, Google/GitHub keys

# 3. Check provider console
# Google: Cloud Console → OAuth 2.0 Client ID
# GitHub: Settings → OAuth Apps
# EXACT match required on Authorized Redirect URIs

# 4. Check logs
docker-compose -f docker-compose.prod.yml logs auth-service
# Look for: "redirect_uri mismatch", "client_id not found", etc.

# 5. Wait and retry
# OAuth provider changes can take 2-30 minutes
```

### Monitoring Services

```bash
# Check all services running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Check specific service
docker-compose -f docker-compose.prod.yml logs auth-service --tail 100

# Watch logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart auth-service

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backup

```bash
# Automated backup (set up in crontab)
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > /backups/cms_$(date +\%Y\%m\%d).sql.gz

# Manual backup
pg_dump -h localhost -U postgres cms_db | gzip > backup.sql.gz

# Restore from backup
gunzip -c backup.sql.gz | psql -h localhost -U postgres cms_db
```

## Important Files & Locations

| File | Purpose |
|------|---------|
| `.env` | Production secrets (not in git) |
| `.env.production` | Template (in git) |
| `.env.local` | Development config (in git) |
| `shared/config.py` | All settings management |
| `docker-compose.yml` | Development setup |
| `docker-compose.prod.yml` | Production setup |
| `PRODUCTION_SETUP.md` | Full guide |
| `SECURITY.md` | Security checklist |
| `OAUTH_SETUP_QUICK.md` | OAuth guide |

## Useful Commands

```bash
# Start development environment
docker-compose up --build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Reset database (dev only!)
docker-compose down -v
docker-compose up

# SSH into container
docker-compose exec api-gateway bash

# Check service health
curl http://localhost:8000/health

# Build specific service
docker-compose build api-gateway

# Push latest code
git add .
git commit -m "message"
git push origin main
```

## Architecture Decision Log

### Why Microservices?
- Scalability: Services scale independently
- Resilience: One service failing doesn't break others
- Development: Teams work independently on services
- Deployment: Update one service without full restart

### Why Docker?
- Consistency: Runs same everywhere (dev/prod/ci)
- Isolation: Services don't interfere with each other
- Easy deployment: Single `docker-compose up` command
- Resource efficiency: Lighter than VMs

### Why API Gateway?
- Single entry point
- Rate limiting & CORS centrally managed
- Request routing logic in one place
- Easier to add authentication middleware

### Why JWT?
- Stateless: No server-side session storage needed
- Scalable: Works across multiple API servers
- Secure: Cryptographically signed tokens
- Standardized: Used industry-wide

## Performance Tips

```python
# 1. Use connection pooling (already configured)
# Don't create new DB connection per request

# 2. Cache frequently accessed data
# Redis is available for caching

# 3. Use async/await everywhere
# Avoid blocking operations

# 4. Monitor query performance
# Use database slow query logs

# 5. Set appropriate timeouts
# httpx.AsyncClient(timeout=30.0)
```

## Getting Help

### Found a Bug?
1. Check [SECURITY.md](./SECURITY.md) - might be security issue
2. Check logs: `docker-compose logs -f`
3. Check [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - might be config issue
4. Create GitHub issue with:
   - What you did
   - What you expected
   - What actually happened
   - Relevant error messages

### OAuth Not Working?
→ See [OAUTH_SETUP_QUICK.md](./OAUTH_SETUP_QUICK.md)

### Production Deployment Questions?
→ See [DEPLOY_QUICK.md](./DEPLOY_QUICK.md)

### Security Concerns?
→ Email: security@your-domain.com (setup dedicated address)

---

**Remember:** This is a production-grade system. Changes should be:
- Tested in development first
- Reviewed by team
- Deployed to staging before production
- Backed up before major changes
