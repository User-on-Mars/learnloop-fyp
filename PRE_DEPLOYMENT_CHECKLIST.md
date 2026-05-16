# 🚀 Pre-Deployment Checklist

## Overview
Complete this checklist before deploying LearnLoop to production. Each section must be verified and checked off.

---

## 1. ✅ Security Configuration

### Environment Variables
- [ ] `JWT_SECRET` is set and cryptographically random (64+ characters)
  ```bash
  # Verify length
  echo -n "$JWT_SECRET" | wc -c
  # Should output: 128 or more
  ```

- [ ] `FIREBASE_PROJECT_ID` matches your Firebase console
  ```bash
  echo $FIREBASE_PROJECT_ID
  # Should output: learnloop-ab17a
  ```

- [ ] All sensitive credentials are in `.env` files (NOT in code)
  ```bash
  # Check for hardcoded secrets
  grep -r "password\|secret\|key" backend/src --exclude-dir=node_modules
  ```

- [ ] `.gitignore` includes all sensitive files
  ```bash
  cat .gitignore | grep -E "\.env|credentials|secrets"
  ```

### Firebase Security
- [ ] Firebase Admin SDK is configured
  ```bash
  grep -r "firebase-admin" backend/src/config
  ```

- [ ] Firebase service account key is secure (not in git)
  ```bash
  git log --all --full-history -- "*credentials*" "*serviceAccount*"
  # Should return nothing
  ```

### CORS Configuration
- [ ] CORS is configured for production domain only
  ```bash
  grep "FRONTEND_URL" backend/.env.production
  # Should show your production domain
  ```

- [ ] No wildcard CORS in production
  ```bash
  grep "origin.*\*" backend/src/server.js
  # Should return nothing or be conditional
  ```

### Rate Limiting
- [ ] Rate limiting is enabled
  ```bash
  grep -A 5 "rateLimit" backend/src/server.js
  ```

- [ ] Auth endpoints have stricter limits
  ```bash
  grep -A 5 "AUTH_RATE_LIMIT" backend/src/middleware
  ```

---

## 2. 🗄️ Database Configuration

### MongoDB
- [ ] Production database is created
  ```bash
  mongo "$MONGODB_URI" --eval "db.stats()"
  ```

- [ ] Database user has appropriate permissions (not admin)
  ```bash
  mongo "$MONGODB_URI" --eval "db.runCommand({connectionStatus: 1})"
  ```

- [ ] Connection string uses SSL/TLS
  ```bash
  echo $MONGODB_URI | grep "ssl=true"
  ```

- [ ] Database indexes are created
  ```bash
  node backend/scripts/createIndexes.js
  ```

### Redis
- [ ] Redis is running
  ```bash
  redis-cli ping
  # Should output: PONG
  ```

- [ ] Redis password is set (if applicable)
  ```bash
  echo $REDIS_PASSWORD
  ```

- [ ] Redis persistence is configured
  ```bash
  redis-cli CONFIG GET save
  ```

### Backup Strategy
- [ ] Automated backups are configured
- [ ] Backup retention policy is set (30 days recommended)
- [ ] Backup restoration has been tested

---

## 3. 🧪 Testing

### Automated Tests
- [ ] All unit tests pass
  ```bash
  cd backend && npm test
  ```

- [ ] Test coverage is adequate (>80%)
  ```bash
  npm test -- --coverage
  ```

- [ ] No skipped critical tests
  ```bash
  grep -r "test.skip\|it.skip" backend/src --exclude-dir=node_modules
  ```

### Manual Testing
- [ ] Authentication flow works (signup, login, logout)
- [ ] Skill map creation and editing works
- [ ] Learning sessions work end-to-end
- [ ] Reflections are saved correctly
- [ ] Room creation and invitations work
- [ ] Payment flow completes successfully
- [ ] Admin panel is accessible and functional

### Performance Testing
- [ ] API response times are acceptable (<500ms)
  ```bash
  curl -w "@curl-format.txt" -o /dev/null -s https://api.your-domain.com/api/health
  ```

- [ ] Frontend loads in <3 seconds
- [ ] No memory leaks detected
- [ ] Database queries are optimized

---

## 4. 🏗️ Build Verification

### Backend
- [ ] No build errors
  ```bash
  cd backend
  npm install
  node src/server.js --check
  ```

- [ ] All dependencies are installed
  ```bash
  npm list --depth=0
  ```

- [ ] No security vulnerabilities
  ```bash
  npm audit
  # Fix critical/high vulnerabilities
  npm audit fix
  ```

### Frontend
- [ ] Build completes successfully
  ```bash
  cd frontend
  npm run build
  ```

- [ ] Build size is reasonable (<2MB)
  ```bash
  du -sh dist/
  ```

- [ ] No TypeScript errors
  ```bash
  npm run type-check
  ```

- [ ] No console errors in production build
  ```bash
  # Check for console.log statements
  grep -r "console.log" src --exclude-dir=node_modules
  ```

---

## 5. 🔧 Configuration Files

### Backend `.env.production`
- [ ] `NODE_ENV=production`
- [ ] `PORT` is set (default: 4000)
- [ ] `MONGODB_URI` points to production database
- [ ] `REDIS_URL` points to production Redis
- [ ] `JWT_SECRET` is set
- [ ] `FIREBASE_PROJECT_ID` is set
- [ ] `FRONTEND_URL` is set to production domain
- [ ] `SMTP_*` credentials are set for email
- [ ] `ESEWA_ENV` is set (test or production)
- [ ] `ESEWA_*` credentials are correct
- [ ] `LOG_LEVEL=info` (not debug)

### Frontend `.env.production`
- [ ] `VITE_API_URL` points to production backend
- [ ] `VITE_FIREBASE_*` credentials are set
- [ ] No development URLs remain

### Nginx Configuration (if applicable)
- [ ] Server name matches domain
- [ ] SSL certificate is configured
- [ ] Proxy pass to backend is correct
- [ ] Static files are served efficiently
- [ ] Gzip compression is enabled

---

## 6. 📦 Deployment Preparation

### Git Repository
- [ ] All changes are committed
  ```bash
  git status
  # Should show: nothing to commit, working tree clean
  ```

- [ ] No sensitive files in git history
  ```bash
  git log --all --full-history -- "*.env" "*credentials*"
  ```

- [ ] Latest code is pushed to remote
  ```bash
  git push origin main
  ```

- [ ] Git tags are created for version
  ```bash
  git tag -a v1.0.0 -m "Initial production release"
  git push origin v1.0.0
  ```

### Documentation
- [ ] README is up to date
- [ ] API documentation is complete
- [ ] Deployment guide is ready
- [ ] Environment variables are documented
- [ ] Troubleshooting guide is available

### Monitoring Setup
- [ ] Error tracking is configured (Sentry, etc.)
- [ ] Performance monitoring is set up
- [ ] Log aggregation is configured
- [ ] Uptime monitoring is enabled
- [ ] Alert notifications are configured

---

## 7. 🌐 Domain & SSL

### Domain Configuration
- [ ] Domain is registered
- [ ] DNS records are configured
  - [ ] A record points to server IP
  - [ ] CNAME for www (if applicable)
  - [ ] MX records for email (if applicable)

- [ ] DNS propagation is complete
  ```bash
  nslookup your-domain.com
  dig your-domain.com
  ```

### SSL Certificate
- [ ] SSL certificate is installed
  ```bash
  curl -vI https://your-domain.com 2>&1 | grep "SSL certificate"
  ```

- [ ] Certificate is valid and not expired
  ```bash
  echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
  ```

- [ ] HTTPS redirect is configured
  ```bash
  curl -I http://your-domain.com
  # Should show: 301 Moved Permanently
  ```

- [ ] Auto-renewal is set up (Let's Encrypt)
  ```bash
  sudo certbot renew --dry-run
  ```

---

## 8. 🔐 Security Hardening

### Server Security
- [ ] Firewall is configured
  ```bash
  sudo ufw status
  # Should show: Status: active
  ```

- [ ] Only necessary ports are open (80, 443, 22)
  ```bash
  sudo netstat -tulpn | grep LISTEN
  ```

- [ ] SSH key authentication is enabled
- [ ] Root login is disabled
  ```bash
  grep "PermitRootLogin" /etc/ssh/sshd_config
  # Should show: PermitRootLogin no
  ```

- [ ] Fail2ban is installed and configured
  ```bash
  sudo systemctl status fail2ban
  ```

### Application Security
- [ ] Security headers are configured
  ```bash
  curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
  ```

- [ ] HTTPS is enforced
- [ ] XSS protection is enabled
- [ ] CSRF protection is implemented
- [ ] Input validation is in place
- [ ] SQL injection prevention (parameterized queries)

---

## 9. 📊 Performance Optimization

### Backend
- [ ] Compression middleware is enabled
  ```bash
  grep "compression" backend/src/server.js
  ```

- [ ] Database queries are indexed
  ```bash
  mongo "$MONGODB_URI" --eval "db.skills.getIndexes()"
  ```

- [ ] Redis caching is enabled
  ```bash
  grep "redis" backend/src/config
  ```

- [ ] Connection pooling is configured
  ```bash
  grep "maxPoolSize" backend/.env.production
  ```

### Frontend
- [ ] Code splitting is enabled
- [ ] Lazy loading is implemented
- [ ] Images are optimized
- [ ] Bundle size is minimized
- [ ] CDN is configured (if applicable)

---

## 10. 🚨 Rollback Plan

### Backup Current State
- [ ] Database backup is created
  ```bash
  mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)
  ```

- [ ] Current code is tagged
  ```bash
  git tag -a v1.0.0-pre-deploy -m "Pre-deployment backup"
  ```

- [ ] Environment variables are backed up
  ```bash
  cp backend/.env.production backend/.env.production.backup
  ```

### Rollback Procedure
- [ ] Rollback steps are documented
- [ ] Database restore procedure is tested
- [ ] Previous version can be deployed quickly
- [ ] Team knows how to execute rollback

---

## 11. 📞 Support & Monitoring

### Contact Information
- [ ] Support email is set up
- [ ] Emergency contact list is ready
- [ ] On-call schedule is defined (if applicable)

### Monitoring Dashboards
- [ ] Server monitoring dashboard is accessible
- [ ] Application monitoring dashboard is set up
- [ ] Database monitoring is configured
- [ ] Error tracking dashboard is ready

### Alerts
- [ ] High error rate alerts
- [ ] Server down alerts
- [ ] Database connection alerts
- [ ] High memory/CPU usage alerts
- [ ] SSL certificate expiry alerts

---

## 12. 🎯 Final Verification

### Pre-Deployment Tests
- [ ] Health endpoint responds
  ```bash
  curl https://api.your-domain.com/api/health
  ```

- [ ] Authentication works
  ```bash
  curl -X POST https://api.your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}'
  ```

- [ ] Frontend loads
  ```bash
  curl -I https://your-domain.com
  # Should show: 200 OK
  ```

- [ ] WebSocket connection works
- [ ] Payment gateway is accessible

### Smoke Tests
- [ ] Can create an account
- [ ] Can login
- [ ] Can create a skill map
- [ ] Can start a session
- [ ] Can submit a reflection
- [ ] Can make a payment (test mode)
- [ ] Admin can access admin panel

---

## 13. 📝 Deployment Checklist

### Deployment Day
- [ ] Team is notified of deployment
- [ ] Maintenance window is scheduled (if needed)
- [ ] Users are notified (if applicable)
- [ ] Backup is created
- [ ] Deployment script is ready

### During Deployment
- [ ] Monitor logs in real-time
  ```bash
  pm2 logs --lines 100
  ```

- [ ] Watch for errors
  ```bash
  tail -f /var/log/nginx/error.log
  ```

- [ ] Monitor server resources
  ```bash
  htop
  ```

### Post-Deployment
- [ ] Run smoke tests
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Verify all services are running
  ```bash
  pm2 status
  docker ps
  ```

- [ ] Test critical user flows
- [ ] Announce successful deployment

---

## 14. 🎉 Go-Live Checklist

### Final Checks
- [ ] All items above are completed
- [ ] Team is ready for support
- [ ] Monitoring is active
- [ ] Rollback plan is ready
- [ ] Documentation is accessible

### Launch
- [ ] Deploy to production
- [ ] Verify deployment success
- [ ] Run post-deployment tests
- [ ] Monitor for 1 hour
- [ ] Announce to users

### Post-Launch
- [ ] Monitor error rates (first 24 hours)
- [ ] Collect user feedback
- [ ] Address critical issues immediately
- [ ] Plan for next iteration

---

## 📊 Deployment Readiness Score

Count your checkmarks:

- **90-100%**: ✅ Ready to deploy
- **80-89%**: ⚠️ Address remaining items first
- **<80%**: ❌ Not ready - complete more items

---

## 🆘 Emergency Contacts

```
Technical Lead: [Name] - [Email] - [Phone]
DevOps: [Name] - [Email] - [Phone]
Database Admin: [Name] - [Email] - [Phone]
Support Team: [Email]
```

---

## 📅 Deployment Timeline

```
T-7 days: Complete all checklist items
T-3 days: Final testing and verification
T-1 day: Create backups, notify team
T-0: Deploy to production
T+1 hour: Verify deployment, monitor
T+24 hours: Review metrics, address issues
T+7 days: Post-deployment review
```

---

**Last Updated**: May 16, 2026
**Version**: 1.0.0
**Status**: Ready for Production ✅
