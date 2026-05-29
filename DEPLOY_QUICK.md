# Production Deployment - Quick Start (5 Steps)

This is a condensed version of [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for experienced developers.

## Step 1: Prepare Environment (5 min)

```bash
# Copy production config
cp .env.production .env

# Edit with your values
nano .env
```

**Required values:**
```bash
# Security
JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Your domains
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
OAUTH_REDIRECT_URI=https://your-domain.com/oauth/callback
OAUTH_API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Database (use managed service)
DB_HOST=your-db-host
DB_PASSWORD=STRONG_PASSWORD_HERE

# OAuth (from provider consoles)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Step 2: Create OAuth Apps (10 min)

### Google
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins**: `https://your-domain.com`
5. Add to **Authorized redirect URIs**: `https://your-api-domain.com/api/auth/callback/google`
6. Copy Client ID & Secret to `.env`

### GitHub
1. [GitHub Settings → OAuth Apps](https://github.com/settings/developers)
2. New OAuth App
3. Set **Authorization callback URL**: `https://your-api-domain.com/api/auth/callback/github`
4. Copy Client ID & Secret to `.env`

## Step 3: Get SSL Certificate (5 min)

```bash
# Using Let's Encrypt + Certbot
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com

# Certificate at: /etc/letsencrypt/live/your-domain.com/
```

## Step 4: Setup Reverse Proxy (10 min)

**Nginx example:**
```nginx
# /etc/nginx/sites-available/your-domain.com

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend & API
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # API requests → API Gateway (localhost:8000)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Everything else → Frontend (localhost:3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable & test Nginx
sudo ln -s /etc/nginx/sites-available/your-domain.com \
  /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Deploy Docker (5 min)

```bash
# Pull latest code
git pull origin main

# Build & start
docker-compose -f docker-compose.prod.yml up --build -d

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Verify it's working
curl https://your-api-domain.com/health
```

## Testing

```bash
# 1. Health check
curl https://your-api-domain.com/health
# Response: {"status":"healthy"}

# 2. Test login page
curl https://your-domain.com/
# Response: HTML page

# 3. Test OAuth
# Visit https://your-domain.com
# Click "Login with Google" or "Login with GitHub"
# Should redirect to provider, not error
```

## Troubleshooting

### "failed to fetch" on OAuth login
→ Domain not in OAuth provider console + wait 2-30 minutes

### CORS error
→ Check `CORS_ORIGINS` in `.env` matches frontend domain

### Certificate warnings
→ Ensure `.crt` and `.key` files are valid and match domain

### Backups
```bash
# Setup automated daily backups
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > /backups/cms_$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart if needed
docker-compose -f docker-compose.prod.yml restart api-gateway

# Update code & services
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance

```bash
# Weekly: Check services
docker-compose -f docker-compose.prod.yml ps

# Monthly: Update dependencies
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Quarterly: Review logs & security
docker-compose -f docker-compose.prod.yml logs --since 90d
```

---

**For detailed information, see:**
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Full guide
- [OAUTH_SETUP_QUICK.md](./OAUTH_SETUP_QUICK.md) - OAuth details
- [SECURITY.md](./SECURITY.md) - Security checklist
