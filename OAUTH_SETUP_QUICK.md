# Quick OAuth Setup Cheat Sheet

## For When You're Ready to Go Live

### Step 1: Prepare Your Domain

```
Frontend Domain:  https://app.example.com
API Domain:       https://api.example.com
(or same domain)  https://example.com/api
```

### Step 2: Google OAuth in 5 Minutes

```
1. Visit: https://console.cloud.google.com/
2. Create or select project
3. Enable "Google+ API"
4. Go to: APIs & Services → Credentials
5. Click "Create Credentials"
6. Select "OAuth 2.0 Client ID" → "Web Application"

Configuration:
┌─────────────────────────────────────────────────┐
│ Authorized JavaScript Origins:                   │
│  • https://app.example.com                      │
│  • https://www.app.example.com (if needed)      │
│                                                  │
│ Authorized Redirect URIs:                        │
│  • https://api.example.com/api/auth/callback/google │
│    (or https://app.example.com/api/auth/... if same)│
└─────────────────────────────────────────────────┘

Copy to .env:
  GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=your-secret
```

### Step 3: GitHub OAuth in 5 Minutes

```
1. Visit: https://github.com/settings/developers
2. Click "New OAuth App"

Configuration:
┌─────────────────────────────────────────────────┐
│ Application name: Your App Name                  │
│ Homepage URL: https://app.example.com           │
│                                                  │
│ Authorization callback URL:                      │
│  https://api.example.com/api/auth/callback/github │
│  (or https://app.example.com/api/auth/... if same)│
└─────────────────────────────────────────────────┘

Copy to .env:
  GITHUB_CLIENT_ID=your-client-id
  GITHUB_CLIENT_SECRET=your-client-secret
```

### Step 4: Update .env File

```bash
# Generate strong JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Edit .env file with:
JWT_SECRET_KEY=<strong-secret-from-above>

# Domains
CORS_ORIGINS=https://app.example.com,https://api.example.com
OAUTH_REDIRECT_URI=https://app.example.com/oauth/callback
OAUTH_API_BASE_URL=https://api.example.com

# Frontend build
NEXT_PUBLIC_API_URL=https://api.example.com

# Database & services (fill in your production hosts)
DB_HOST=your-production-db.example.com
REDIS_HOST=your-redis.example.com
RABBITMQ_HOST=your-rabbitmq.example.com
```

### Step 5: Build & Deploy

```bash
# Build frontend with production URL
cd frontend
npm install
npm run build
NEXT_PUBLIC_API_URL=https://api.example.com npm run build

# Deploy with docker-compose
docker-compose -f docker-compose.yml up -d

# Check services
curl https://api.example.com/health
```

## Debugging OAuth Errors

### Error: "failed to fetch" during OAuth

**Likely Cause:** Your domain is not in OAuth provider console

**Quick Fix:**
```bash
# Check which domain you're using
curl -v https://api.example.com/api/auth/google
# Look at Location header in response

# That domain MUST be registered in:
# Google: Authorized Redirect URIs
# GitHub: Authorization callback URL
```

### Error: CORS error when trying to log in

**Likely Cause:** Frontend domain not in CORS_ORIGINS

**Quick Fix:**
```bash
# In .env check:
CORS_ORIGINS=https://app.example.com,https://api.example.com

# Then restart:
docker-compose restart
```

### Error: "redirect_uri mismatch"

**Likely Cause:** Redirect URI in .env doesn't match OAuth console

**Check:**
- Exact match (protocol, domain, port, path)
- No trailing slashes unless in console
- Use HTTPS in production

## Testing Checklist

```bash
# 1. Health check
curl https://api.example.com/health
# Response: {"status": "healthy"}

# 2. Test OAuth endpoint exists
curl -I https://api.example.com/api/auth/google
# Response: 302 (redirect to Google login)

# 3. Test from browser
# Visit: https://app.example.com
# Click "Login with Google"
# Should redirect to Google login, not error

# 4. After login
# Should redirect back with token
# Should land on workspace page
```

## Common Settings by Provider

### AWS Deployment
```
Domain: https://your-app.elasticbeanstalk.com
Set X-Forwarded-* headers in load balancer
```

### Render.com Deployment
```
Domain: https://your-app.onrender.com
X-Forwarded-* headers automatically set
```

### Fly.io Deployment
```
Domain: https://your-app.fly.dev
Configure CORS_ORIGINS in dashboard
```

## When to Ask for Help

❌ "OAuth doesn't work"
✅ "I get error 'redirect_uri mismatch' when I click Google login"

Provide:
-[ ] Your domain name
- [ ] Full error message or screenshot
- [ ] `.env` file (without secrets)
- [ ] OAuth provider console settings (redacted)

---

**Remember:** After changing any OAuth settings in Google/GitHub console, 
wait 2-30 minutes before testing - changes take time to propagate!
