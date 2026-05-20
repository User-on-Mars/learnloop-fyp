# 🚀 LearnLoop Deployment Checklist

**Final checklist before deploying to production**

---

## ✅ Pre-Deployment Checklist

### 1. Security ✅
- [x] Security audit completed
- [x] No secrets in git repository
- [x] .gitignore properly configured
- [ ] Generate new JWT_SECRET for production
- [ ] Update all production environment variables
- [ ] Run `npm audit` and fix vulnerabilities

### 2. Testing ✅
- [x] 475 automated tests passing (79.6% pass rate)
- [x] 94.73% code coverage on core logic
- [x] 8 API endpoints tested successfully
- [ ] Manual testing completed
- [ ] Performance testing completed

### 3. Environment Configuration ⏳
- [ ] Production `.env` files configured
- [ ] Firebase production project created
- [ ] MongoDB production database set up
- [ ] Redis production instance configured (optional)
- [ ] SMTP email service configured
- [ ] eSewa payment gateway switched to production

### 4. Database ⏳
- [ ] Production MongoDB instance created
- [ ] Database authentication enabled
- [ ] Database backups configured
- [ ] Database indexes created
- [ ] Initial admin user created

### 5. Frontend Build ⏳
- [ ] Update `VITE_API_URL` to production API
- [ ] Update `VITE_WEBSOCKET_URL` to production WebSocket
- [ ] Run `npm run build` successfully
- [ ] Test production build locally
- [ ] Optimize assets and images

### 6. Backend Configuration ⏳
- [ ] Update `MONGODB_URI` to production
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Update `WEBSOCKET_CORS_ORIGIN` to production domain
- [ ] Enable production logging
- [ ] Configure error reporting (Sentry, etc.)

### 7. Server Setup ⏳
- [ ] Server provisioned (VPS, cloud, etc.)
- [ ] Node.js installed (v18+)
- [ ] MongoDB installed/connected
- [ ] Nginx/Apache configured as reverse proxy
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured
- [ ] PM2 or similar process manager installed

### 8. Domain & DNS ⏳
- [ ] Domain name registered
- [ ] DNS A records configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] HTTPS enabled and working

### 9. Monitoring & Logging ⏳
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring set up
- [ ] Log aggregation configured
- [ ] Uptime monitoring configured
- [ ] Backup monitoring configured

### 10. Documentation ✅
- [x] README.md updated
- [x] API documentation complete
- [x] Testing documentation complete
- [x] Security audit complete
- [ ] Deployment guide written

---

## 📋 Environment Variables Checklist

### Backend Production Variables

**Required:**
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000`
- [ ] `MONGODB_URI=mongodb://...` (production)
- [ ] `JWT_SECRET=...` (NEW, 64+ chars)
- [ ] `FRONTEND_URL=https://your-domain.com`
- [ ] `WEBSOCKET_CORS_ORIGIN=https://your-domain.com`
- [ ] `FIREBASE_PROJECT_ID=...` (production)

**Optional but Recommended:**
- [ ] `REDIS_URL=redis://...` (if using Redis)
- [ ] `SMTP_HOST=...` (for email notifications)
- [ ] `SMTP_USER=...`
- [ ] `SMTP_PASS=...`
- [ ] `ESEWA_ENV=production`
- [ ] `ESEWA_SECRET_KEY=...` (production key)
- [ ] `ERROR_REPORTING_DSN=...` (Sentry, etc.)

### Frontend Production Variables

**Required:**
- [ ] `VITE_API_URL=https://api.your-domain.com/api`
- [ ] `VITE_WEBSOCKET_URL=https://api.your-domain.com`
- [ ] `VITE_APP_ENVIRONMENT=production`

---

## 🔒 Security Pre-Deployment

### Generate New Secrets

```bash
# Generate new JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Run Security Audit

```bash
# Check for vulnerabilities
cd backend
npm audit

cd ../frontend
npm audit

# Fix vulnerabilities
npm audit fix
```

### Verify No Secrets in Git

```bash
# Check for accidentally committed secrets
git log --all --full-history -- "*.env"
git log --all --full-history -- "*credentials*"
git log --all --full-history -- "*serviceAccount*"
```

---

## 🏗️ Build & Deploy Steps

### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

### 2. Test Backend

```bash
cd backend
npm install
npm test
# Ensure all tests pass
```

### 3. Deploy to Server

**Option A: Manual Deployment**
```bash
# On server
git clone https://github.com/your-username/learnloop.git
cd learnloop

# Backend
cd backend
npm install --production
cp .env.example .env
# Edit .env with production values
npm start

# Frontend (serve with Nginx)
cd ../frontend
npm install
npm run build
# Copy dist/ to Nginx web root
```

**Option B: Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### 4. Configure Nginx

```nginx
# /etc/nginx/sites-available/learnloop
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/learnloop/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Set Up Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start src/server.js --name learnloop-backend

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

---

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://your-domain.com/api/health
# Should return: {"status":"healthy"}
```

### 2. Test Authentication
- [ ] Sign up with new account
- [ ] Login with email/password
- [ ] Login with Google
- [ ] Logout

### 3. Test Core Features
- [ ] Create skill map
- [ ] Add nodes
- [ ] Complete a node
- [ ] View leaderboard
- [ ] Create room
- [ ] Invite user

### 4. Test API Endpoints
- [ ] Run Postman collection against production
- [ ] Verify all endpoints return 200 OK
- [ ] Check response times

### 5. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] WebSocket connection stable
- [ ] No memory leaks

---

## 📊 Monitoring Setup

### 1. Error Tracking (Sentry)
```bash
# Install Sentry
npm install @sentry/node @sentry/integrations

# Configure in backend/src/server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.ERROR_REPORTING_DSN,
  environment: process.env.NODE_ENV
});
```

### 2. Uptime Monitoring
- [ ] Set up UptimeRobot or similar
- [ ] Monitor: https://your-domain.com/api/health
- [ ] Alert on downtime

### 3. Log Monitoring
```bash
# View PM2 logs
pm2 logs learnloop-backend

# Set up log rotation
pm2 install pm2-logrotate
```

---

## 🔄 Backup Strategy

### Database Backups
```bash
# Daily MongoDB backup
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Set up cron job
0 2 * * * /path/to/backup-script.sh
```

### Code Backups
- [ ] Git repository backed up
- [ ] Environment files backed up securely
- [ ] Firebase service account backed up securely

---

## 📝 Final Checks

### Before Going Live
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Backups configured
- [ ] Monitoring configured
- [ ] Error tracking configured
- [ ] SSL certificate valid
- [ ] Domain DNS propagated
- [ ] Admin user created
- [ ] Documentation complete

### After Going Live
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Check user feedback
- [ ] Monitor server resources
- [ ] Verify backups working
- [ ] Test disaster recovery

---

## 🚨 Rollback Plan

If deployment fails:

1. **Revert to previous version**
   ```bash
   git checkout <previous-commit>
   pm2 restart learnloop-backend
   ```

2. **Restore database backup**
   ```bash
   mongorestore --uri="mongodb://..." /backups/latest
   ```

3. **Check logs**
   ```bash
   pm2 logs learnloop-backend --lines 100
   ```

4. **Notify users** (if necessary)

---

## 📞 Support Contacts

- **Developer:** [Your Name]
- **Email:** [Your Email]
- **Emergency:** [Emergency Contact]

---

## ✅ Deployment Complete!

Once all items are checked:

1. ✅ Application is live
2. ✅ Monitoring is active
3. ✅ Backups are running
4. ✅ Documentation is complete
5. ✅ Team is notified

**Congratulations! LearnLoop is now in production!** 🎉

