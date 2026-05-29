# Production Deployment Guide

This guide covers everything needed to deploy this CMS microservice system to production with a focus on authentication, authorization, and security.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Database Configuration](#database-configuration)
3. [Security & JWT](#security--jwt)
4. [OAuth 2.0 Setup](#oauth-20-setup)
5. [CORS Configuration](#cors-configuration)
6. [Frontend Configuration](#frontend-configuration)
7. [API Gateway Setup](#api-gateway-setup)
8. [Docker Deployment](#docker-deployment)
9. [SSL/HTTPS](#ssltls)
10. [Monitoring & Logging](#monitoring--logging)

---

## Environment Setup

### 1. Prepare Production Environment Variables

Create a `.env` file in the project root with production values:

```bash
# Copy template to production config
cp .env.production .env

# Edit with your production values
nano .env
```

### 2. Critical Variables for Production

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET_KEY` | JWT signing key - **MUST BE STRONG** | `$(python -c "import secrets; print(secrets.token_urlsafe(32))")` |
| `DB_HOST` | PostgreSQL hostname | `prod-db.example.com` |
| `DB_PASSWORD` | Database password - **USE STRONG PASSWORD** | Generated secure password |
| `REDIS_HOST` | Redis hostname | `prod-redis.example.com` |
| `RABBITMQ_HOST` | RabbitMQ hostname | `prod-mq.example.com` |
| `DEBUG` | Debug mode | `false` |
| `CORS_ORIGINS` | Allowed domains | `https://app.example.com,https://api.example.com` |

### 3. Generate Secure JWT Secret

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output to `JWT_SECRET_KEY` in your `.env` file.

---

## Database Configuration

### PostgreSQL Setup (Production)

1. **Use Managed Service** (AWS RDS, Google Cloud SQL, Azure Database, etc.)
   - Benefits: Automated backups, replication, monitoring
   - Recommended for production

2. **Connection Pool**
   ```python
   # Already configured in shared/database.py with asyncpg
   # Connection pool automatically handles multiple connections
   ```

3. **Database Initialization**
   ```bash
   # Run migrations using Alembic
   alembic upgrade head
   
   # Create admin user
   python create_admin.py
   ```

### Backup Strategy

```bash
# Automated daily backups (recommended)
# Setup in your database provider dashboard

# Manual backup
pg_dump -h prod-db.example.com -U postgres cms_prod_db > backup_$(date +%Y%m%d).sql
```

---

## Security & JWT

### JWT Configuration

The system uses **JWT (JSON Web Tokens)** for stateless authentication.

**Key Points:**
- JWTs are signed with `JWT_SECRET_KEY`
- **NEVER** use the default secret in production
- Token expiration: 30 minutes (configurable via `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`)
- Algorithm: HS256 (HMAC with SHA-256)

### Password Hashing

Passwords are hashed using **bcrypt** with strong salting:
- Rounds: 10 (default, can be increased)
- Stored securely in database
- Never stored in logs or environment

### Token Refresh Strategy

**Current Implementation:**
- Access tokens: 30 minutes
- After expiration: user must log in again

**Future Enhancement (Optional):**
```python
# Consider adding refresh tokens for better UX
# Requires additional database table and endpoint
# Implementation in future version
```

---

## OAuth 2.0 Setup

This is the **MOST CRITICAL** part for production. Google and GitHub OAuth require specific domain whitelist configuration.

### Google OAuth Configuration

#### 1. Create OAuth 2.0 Credentials in Google Cloud Console

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select or create a project
- Enable **Google+ API**
- Navigate to **APIs & Services → Credentials**
- Click **Create Credentials → OAuth 2.0 Client ID**
- Select **Web Application**

#### 2. Configure Application Name & Consent Screen

- Go to **OAuth consent screen**
- Fill in:
  - **App name**: Your app name
  - **User support email**: Your support email
  - **Developer contact**: Your contact email
- Add scopes: `openid`, `email`, `profile`

#### 3. Add Production Domain to Authorized JavaScript Origins

**This is where the "failed to fetch" error usually comes from:**

```
Authorized JavaScript origins:
  https://your-domain.com
  https://www.your-domain.com
  https://api.your-domain.com  (if on separate domain)
```

**Important:** These must be HTTPS in production (not http://)

#### 4. Add Authorized Redirect URIs

```
Authorized redirect URIs:
  https://your-api-domain.com/api/auth/callback/google
  
OR if frontend and API are on same domain:
  https://your-domain.com/api/auth/callback/google
```

#### 5. Set Environment Variables

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH_API_BASE_URL=https://your-api-domain.com
```

### GitHub OAuth Configuration

#### 1. Create OAuth App in GitHub Settings

- Go to GitHub Settings → Developer settings → OAuth Apps
- Click **New OAuth App**

#### 2. Register Application

**Homepage URL:**
```
https://your-domain.com
```

**Authorization callback URL:**
```
https://your-api-domain.com/api/auth/callback/github

OR if same domain:
https://your-domain.com/api/auth/callback/github
```

**Important:** Use HTTPS URLs. GitHub will reject HTTP URLs.

#### 3. Set Environment Variables

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Testing OAuth URLs (Before Going Live)

```bash
# Test Google callback URL
curl -I https://your-api-domain.com/api/auth/callback/google?code=test
# Should return 400 (bad code) not 404

# Test GitHub callback URL
curl -I https://your-api-domain.com/api/auth/callback/github?code=test
# Should return 400 (bad code) not 404
```

### OAuth Flow in Production

```
1. User clicks "Login with Google/GitHub"
   ↓
2. Frontend redirects to: 
   https://your-api-domain.com/api/auth/{provider}
   ↓
3. Gateway forwards to Auth Service
   ↓
4. Auth Service generates OAuth URL with:
   - client_id
   - redirect_uri (must match console settings)
   - state (for CSRF protection)
   ↓
5. User redirected to Google/GitHub login
   ↓
6. After auth, provider redirects to:
   https://your-api-domain.com/api/auth/callback/{provider}?code=...
   ↓
7. Auth Service exchanges code for token
   ↓
8. User redirected to frontend with JWT:
   https://your-domain.com/oauth/callback?token=...
   ↓
9. Frontend stores JWT and user is logged in
```

---

## CORS Configuration

### What is CORS?

**CORS (Cross-Origin Resource Sharing)** controls which domains can make requests to your API.

### Production CORS Setup

Edit `.env` file:

```bash
# Allow only specific domains (production)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# If API is on separate domain/subdomain
CORS_ORIGINS=https://app.example.com,https://api.example.com
```

### CORS Configuration Details

```python
# In all services (api-gateway, auth-service, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,        # Specific domains only
    allow_credentials=True,                              # Allow cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],      # Specific methods
    allow_headers=["Content-Type", "Authorization", ...] # Specific headers
)
```

**Benefits of Specific CORS Origins:**
- ✅ Prevents CSRF attacks
- ✅ Prevents unauthorized domains from accessing your API
- ✅ Complies with security best practices
- ✅ Required by OAuth providers

---

## Frontend Configuration

### Build-time Environment Variables

The frontend is built with Next.js 14 and uses build-time environment variables.

### 1. Set Frontend Environment Variables

```bash
# In .env file at root (used by all services)
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

**Important:** Must start with `NEXT_PUBLIC_` to be available in browser

### 2. Build Frontend for Production

```bash
# Build command (usually runs in CI/CD)
cd frontend
npm install
npm run build

# The build includes NEXT_PUBLIC_API_URL at build time
```

### 3. Frontend API Configuration

File: `frontend/src/lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// All API requests use this URL
class ApiClient {
    private baseUrl: string = API_URL;
    // ...
}
```

### 4. OAuth Redirect Handling

File: `frontend/src/app/oauth/callback/page.tsx`

The frontend OAuth callback page:
1. Receives JWT token in URL query parameter
2. Stores token in localStorage
3. Redirects to workspace

```typescript
// Example OAuth callback flow
const token = searchParams.get('token');
if (token) {
    api.setToken(token);
    redirect('/workspace');
}
```

---

## API Gateway Setup

### What is the API Gateway?

The API Gateway (port 8000) is a FastAPI proxy that:
- Routes requests to microservices
- Handles CORS for all services
- Enforces rate limiting
- Adds logging

### Gateway Configuration

File: `api-gateway/main.py`

**Key Settings:**
```python
# Service URL mapping (internal Docker network)
SERVICE_MAP = {
    "auth": "http://auth-service:8001",         # Auth & OAuth
    "content": "http://content-service:8002",    # Content CRUD
    "validation": "http://validation-service:8003",
    "ai": "http://ai-service:8004",              # NLP analysis
    "analytics": "http://analytics-service:8005",
    "user": "http://user-service:8006",
    "transcription": "http://transcription-service:8007",
}
```

**In Docker Compose:**
- Services communicate internally via DNS names
- No need for IP addresses
- Automatically resolves to running containers

### Public Gateway URL

**Production URL (what clients see):**
```
https://your-api-domain.com/
```

**Internal Services (Docker network):**
```
http://auth-service:8001/
(not accessible from internet)
```

---

## Docker Deployment

### Building Docker Images

```bash
# Build all services
docker-compose build

# Or build specific service
docker-compose build api-gateway
docker-compose build auth-service
```

### Running in Production

```bash
# Using docker-compose (simple deployment)
docker-compose up -d

# Services will be available at:
# Frontend:     http://your-domain.com
# API Gateway:  http://your-api-domain.com
# API Docs:     http://your-api-domain.com/docs
```

### Production Docker Compose Configuration

File: `docker-compose.yml` (already configured)

**Key Production Considerations:**
- Services restart automatically: `restart_policy: always`
- Health checks enabled
- Resource limits set
- Logging configured

### Environment Variables in Docker Compose

The `.env` file is automatically loaded by docker-compose:

```bash
# .env file at project root
# docker-compose reads this automatically
docker-compose up -d
```

---

## SSL/TLS

### Why SSL/TLS is Required

- 🔒 Encrypts data in transit
- 🔐 OAuth providers require HTTPS
- ✅ Browser security (mixed content warnings)
- 📋 Compliance (GDPR, PCI-DSS, etc.)

### Getting SSL Certificate

**Option 1: Let's Encrypt (Free, Recommended)**

Using Certbot:
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificates stored in: /etc/letsencrypt/live/your-domain.com/
```

**Option 2: AWS/Cloud Provider**
- AWS Certificate Manager (free for AWS resources)
- Google Cloud Managed Certificates
- Azure App Service Managed Certificates

### Using SSL in Nginx/Reverse Proxy

```nginx
# /etc/nginx/sites-available/your-domain.com

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Redirect API requests to API Gateway
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve frontend
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Important Headers for Security

The Nginx configuration above sets:
- `X-Forwarded-Host`: Used by Auth Service for OAuth URLs
- `X-Forwarded-Proto`: Used to detect HTTPS
- `X-Forwarded-For`: Preserves client IP

These are used by the application to generate correct OAuth redirect URIs.

---

## Authentication & Registration Flow

### Registration Flow

```
1. User fills registration form
   ↓
2. Frontend POST to: /api/register
   ├─ email
   ├─ password (plain text - will be hashed)
   └─ username
   ↓
3. Auth Service:
   - Validates email format
   - Checks if email already exists
   - Hashes password with bcrypt
   - Creates user in database
   ↓
4. Returns success or error
   ├─ Success: {user: {...}, access_token: "jwt_token"}
   └─ Error: {detail: "Email already registered"}
```

### Login Flow

```
1. User enters email/password
   ↓
2. Frontend POST to: /api/login
   ├─ email
   └─ password
   ↓
3. Auth Service:
   - Finds user by email
   - Verifies password with bcrypt
   - Generates JWT token (valid for 30 min)
   ↓
4. Returns JWT token
   ├─ Success: {access_token: "jwt_token", ...}
   └─ Error: {detail: "Invalid credentials"}

5. Frontend stores token in localStorage
   - All future requests include: Authorization: Bearer {token}
```

### OAuth Login Flow (Google/GitHub)

See [OAuth Flow in Production](#oauth-flow-in-production) section above.

### Token Expiration & Refresh

**Current Implementation:**
- Tokens expire after 30 minutes
- When expired: User must log in again
- Simple but user-friendly enough for most apps

**Token Validation:**
```python
# Every protected endpoint checks:
# 1. Token is present in Authorization header
# 2. Token signature is valid (signed with JWT_SECRET_KEY)
# 3. Token is not expired
# 4. User account still exists
```

---

## Monitoring & Logging

### Application Logs

**Location:**
```bash
# In docker-compose setup
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
docker-compose logs -f content-service
```

**Log Format:**
```
[INFO] 2024-01-15 10:30:45 | POST /api/login → 200 (0.125s)
[ERROR] 2024-01-15 10:31:00 | Google OAuth: Failed to exchange code
[DEBUG] 2024-01-15 10:31:01 | User created: user@example.com
```

### Health Checks

```bash
# API Gateway
curl https://your-api-domain.com/health
# Response: {"status": "healthy", "service": "api-gateway"}

# Auth Service
curl https://your-api-domain.com/auth/health
# Response: {"status": "healthy"}

# Database Connection
curl https://your-api-domain.com/services/health
# Shows status of all services
```

### Metrics & Performance

**Recommended Tools:**
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **ELK Stack** - Log aggregation
- **Sentry** - Error tracking

### Backup & Recovery

```bash
# Daily database backups
0 2 * * * pg_dump -h prod-db.example.com -U postgres cms_prod_db | gzip > /backups/cms_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days of backups
find /backups -name "cms_*.sql.gz" -mtime +30 -delete
```

---

## Troubleshooting Production Issues

### Issue: "failed to fetch" on OAuth login

**Cause:** Domain not registered in Google/GitHub OAuth console

**Fix:**
1. Go to Google Cloud Console / GitHub Settings
2. Add your domain to Authorized JavaScript origins
3. Add correct callback URL to Authorized redirect URIs
4. Wait 2-30 minutes for changes to propagate

### Issue: CORS error when login fails

**Cause:** `CORS_ORIGINS` environment variable doesn't match frontend domain

**Fix:**
```bash
# Check .env file
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Restart services
docker-compose restart
```

### Issue: JWT token invalid/expired

**Cause:** Token has expired or `JWT_SECRET_KEY` was changed

**Fix:**
- Tokens are valid for 30 minutes after creation
- User must log in again after expiration
- If secret key changed, all existing tokens become invalid

### Issue: Users can't register - "Email already exists"

**Cause:** Email is already in database

**Fix:**
```bash
# Option 1: Use different email
# Option 2: Delete user from database (admin only)
# Option 3: Reset email field to NULL (for testing)
```

### Issue: Authorization header not sent

**Cause:** Frontend token not stored/sent properly

**Check:**
```javascript
// In browser console
localStorage.getItem('auth_token')  // Should show JWT token
```

---

## Pre-Launch Checklist

- [ ] JWT_SECRET_KEY is strong and not default
- [ ] Database backed up daily
- [ ] HTTPS/SSL certificate installed
- [ ] OAuth apps registered in Google/GitHub consoles
- [ ] Callback URLs configured in OAuth consoles
- [ ] CORS_ORIGINS points to production domains
- [ ] NEXT_PUBLIC_API_URL points to production API
- [ ] Database credentials are strong
- [ ] Redis/RabbitMQ passwords changed
- [ ] Rate limiting configured appropriately
- [ ] Email notifications working (if applicable)
- [ ] Error tracking (Sentry) enabled
- [ ] Analytics configured
- [ ] Backups tested and automated
- [ ] Health check endpoints working
- [ ] Load testing completed
- [ ] Security audit performed

---

## Support & Documentation

For additional help:
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Docker Compose Documentation](https://docs.docker.com/compose)
