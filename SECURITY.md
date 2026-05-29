# Security Checklist & Best Practices

## Pre-Launch Security Checklist

### Environment & Secrets
- [ ] **JWT_SECRET_KEY** - Changed from default value (use `secrets.token_urlsafe(32)`)
- [ ] **Database Password** - Strong, randomly generated password
- [ ] **Redis Password** - Set and not default "guest"
- [ ] **RabbitMQ Password** - Set and not default "guest"
- [ ] **.env file** - Added to `.gitignore` and NOT committed to git
- [ ] **.env.production** - Stored securely (not in git, only on production server)
- [ ] **API Keys** - All API keys (Google, GitHub, DeepSeek) are production keys
- [ ] **DEBUG mode** - Set to `false` in production

### Authentication & Authorization
- [ ] **OAuth Clients Registered** - Google and GitHub OAuth apps created
- [ ] **Callback URLs Configured** - Exact URLs added to OAuth provider consoles
- [ ] **CORS Origins Set** - Only production domains allowed
- [ ] **Token Expiration** - Set to 30 minutes (configurable)
- [ ] **Password Hashing** - Using bcrypt with 10+ rounds
- [ ] **SSL Certificates** - Valid HTTPS certificate obtained

### Database Security
- [ ] **Database Backups** - Automated daily backups configured
- [ ] **Connection Encryption** - Using SSL/TLS for database connections
- [ ] **Access Control** - Database user with limited privileges
- [ ] **Admin Password** - Changed from default
- [ ] **Backup Location** - Stored securely, separate from application

### API Gateway Security
- [ ] **Rate Limiting** - Enabled (100 requests per minute)
- [ ] **CORS Headers** - Properly configured, no wildcards
- [ ] **Request Headers** - Validated and sanitized
- [ ] **HTTPS Only** - All traffic encrypted
- [ ] **Health Checks** - Enabled for monitoring

### Docker Security
- [ ] **Image Scanning** - Check for vulnerable packages
- [ ] **Container Secrets** - Using environment variables, not hardcoded
- [ ] **Resource Limits** - Set memory and CPU limits per container
- [ ] **User Privileges** - Containers not running as root
- [ ] **Network Isolation** - Using custom bridge network

### Monitoring & Logging
- [ ] **Error Tracking** - Sentry or similar configured
- [ ] **Application Logs** - Centralized and monitored
- [ ] **Database Logs** - PostgreSQL logs monitored
- [ ] **Access Logs** - API Gateway logs collected
- [ ] **Alert System** - Notifications for errors/failures

### Third-party Services
- [ ] **AI Service APIs** - Rate limits configured
- [ ] **Email Provider** - (if using) Credentials secure
- [ ] **Storage Service** - (if using S3/Minio) Access keys rotated
- [ ] **DNS Records** - Updated to production IP/domain

---

## Common Security Mistakes to Avoid

### ❌ DON'T

```python
# ❌ WRONG - Default secret key
JWT_SECRET_KEY = "super-secret-key-change-in-production"

# ❌ WRONG - Hardcoded credentials
DB_PASSWORD = "postgres"

# ❌ WRONG - Allow all origins
allow_origins = ["*"]

# ❌ WRONG - Debug mode on
DEBUG = True

# ❌ WRONG - Logging secrets
logger.info(f"API Key: {api_key}")

# ❌ WRONG - Committing .env file
git add .env
```

### ✅ DO

```python
# ✅ CORRECT - Strong generated secret
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
# Value from: secrets.token_urlsafe(32)

# ✅ CORRECT - From environment
DB_PASSWORD = os.getenv("DB_PASSWORD")

# ✅ CORRECT - Specific origins only
allowed_origins = ["https://app.example.com", "https://api.example.com"]

# ✅ CORRECT - Debug off in production
DEBUG = os.getenv("DEBUG", "false") == "true"

# ✅ CORRECT - Don't log sensitive data
logger.debug("User login attempt", extra={"user_id": user_id})

# ✅ CORRECT - Git ignores .env
# .env is in .gitignore
```

---

## OAuth Security Best Practices

### 1. State Parameter
✅ Already implemented - prevents CSRF attacks
```python
# In oauth.py
state = _make_state("google")  # CSRF token included
_verify_state(state, "google")  # Verified on callback
```

### 2. Scopes
✅ Minimal scopes requested:
- Google: `openid email profile`
- GitHub: `user:email`

### 3. PKCE (OAuth 2.1)
⚠️ Not currently implemented - optional but recommended for future:
```python
# Future enhancement: Add proof key for code exchange
code_challenge = base64urlsafe(sha256(code_verifier))
```

### 4. Redirect URI Matching
✅ Must be exact match - already validated by providers

---

## Password Security

### Current Implementation
- Algorithm: bcrypt with 10 rounds (0.1-0.2 seconds per hash)
- Storage: bcrypt hash in database
- Transmission: HTTPS only

### Strengthening (Optional)
```python
# Consider increasing rounds for slower hashing (vs brute force)
# Default: 10, Recommended for production: 12
# Trade-off: Login takes 0.2-0.4 seconds vs 0.1-0.2
```

---

## Rate Limiting

### Current Configuration
```python
# In api-gateway/middleware.py
RateLimitMiddleware(max_requests=100, window_seconds=60)
# = 100 requests per minute = ~1.67 per second
```

### Recommended Adjustments
```
Login endpoint:        5 requests / 15 minutes (prevent brute force)
OAuth endpoints:       10 requests / minute (normal flow)
API endpoints:         100 requests / minute (normal usage)
Registration endpoint: 3 requests / hour (prevent spam)
Password reset:        3 requests / hour (prevent abuse)
```

---

## Backup & Disaster Recovery

### Backup Strategy
```bash
# Automated daily backup
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > /backups/cms_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days of backups
*/6 * * * * find /backups -name "*.sql.gz" -mtime +30 -delete

# First day of month - archive to cold storage
0 0 1 * * aws s3 cp /backups/ s3://cms-backups-archive/$(date +\%Y\%m)/ --recursive
```

### Restore Procedure
```bash
# Restore from backup
gzip -dc /backups/cms_20240115.sql.gz | psql -h $DB_HOST -U $DB_USER $DB_NAME
```

### Test Backups Regularly
```bash
# Weekly test restore to temp database
0 3 * * 0 /scripts/test-backup-restore.sh
```

---

## SSL/TLS Certificate Management

### Auto-renewal with Certbot
```bash
# Install renewal timer
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Manual renewal
certbot renew --dry-run  # Test
certbot renew            # Actual renewal
```

### Certificate Pinning (Advanced)
⚠️ Only recommended for high-security applications - can break if cert changes

---

## Dependency Updates

### Keep Dependencies Up-to-Date
```bash
# Check for vulnerabilities
pip audit
npm audit

# Update packages
pip install --upgrade pip
npm update
```

### Schedule Updates
- Weekly check for security updates
- Monthly full updates
- Test in staging before production

---

## Incident Response

### If OAuth Credentials Compromised
```
1. Immediately rotate Client ID and Client Secret in:
   - .env file
   - Provider console (Google/GitHub)
   - All production servers
2. Restart all services
3. Review OAuth logs for abuse
4. Notify all users if data potentially accessed
```

### If Database Compromised
```
1. Stop all services immediately
2. Take snapshot for forensics
3. Restore from clean backup
4. Force all users to change passwords
5. Audit access logs
6. Enable additional monitoring
```

### If Server Compromised
```
1. Isolate server from network
2. Capture forensic image
3. Review all access logs
4. Regenerate all security credentials
5. Deploy from clean backup
6. Add intrusion detection
```

---

## Monitoring & Alerts

### Key Metrics to Monitor
```
✅ API response time (should be < 500ms)
✅ Error rate (should be < 0.1%)
✅ Database connection pool usage
✅ Disk usage (alert at 80%)
✅ Memory usage (alert at 85%)
✅ CPU usage (alert at 75%)
✅ OAuth failure rate
✅ Failed login attempts
✅ Backup completion status
```

### Alert Rules
```
Critical (page on-call):
- Service down
- Database unreachable
- Out of disk space

High (email/slack):
- High error rate (> 1%)
- Slow response times
- Backup failed

Medium (logged):
- Unusual traffic patterns
- Deployment issues
```

---

## Compliance Considerations

### GDPR
- ✅ User registration/consent tracking
- ✅ Data deletion capability (future: implement)
- ✅ Privacy policy required
- ✅ Terms of service required

### CCPA (California)
- ✅ User data access requests
- ✅ Data deletion requests (future)

### PCI-DSS (if handling payments)
- ⚠️ Not currently applicable (no payment processing)
- If adding payments: require PCI-DSS compliance

---

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/advanced/security/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security.html)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

---

## Getting Help

If you encounter security issues:
1. **Do NOT** disclose publicly
2. Email: security@your-domain.com (set up dedicated email)
3. Report through responsible disclosure program
4. Allow time for fix before public announcement
