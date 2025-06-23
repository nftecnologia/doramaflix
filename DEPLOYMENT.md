# 🚀 DoramaFlix - Deployment Guide

Complete production deployment guide for the DoramaFlix streaming platform.

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- SSL certificates
- Domain name configured

## 🏗️ Infrastructure Overview

### Architecture Components

- **Frontend**: Next.js 14 (React 18)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache**: Redis 7
- **Queue**: RabbitMQ
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Logging**: Winston + Loki

### Deployment Options

1. **Railway Cloud** (Recommended for MVP)
2. **AWS ECS** (Production scale)
3. **Docker Compose** (Self-hosted)

## 🔧 Environment Setup

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/doramaflix.git
cd doramaflix
cp .env.example .env
```

### 2. Update Environment Variables

Edit `.env` with your production values:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/doramaflix
DB_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_32_chars

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project

# Storage (choose one)
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=your_vercel_token
```

## 🚀 Deployment Methods

### Method 1: Railway Deployment (Fastest)

#### Backend Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
cd backend
railway up

# Run migrations
railway run npm run db:migrate:prod
```

#### Frontend Deployment

```bash
cd frontend
railway up
```

#### Environment Variables in Railway

Set these in Railway dashboard:
- `DATABASE_URL`
- `REDIS_URL` 
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SENTRY_DSN`
- `NEXT_PUBLIC_API_URL`

### Method 2: AWS ECS Deployment

#### Prerequisites

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### Deploy to AWS

```bash
# Create ECR repositories
aws ecr create-repository --repository-name doramaflix/backend
aws ecr create-repository --repository-name doramaflix/frontend

# Trigger deployment workflow
gh workflow run deploy-aws.yml -f environment=production
```

### Method 3: Docker Compose (Self-hosted)

#### Production Deployment

```bash
# Generate SSL certificates
sudo certbot certonly --standalone -d doramaflix.com -d www.doramaflix.com -d api.doramaflix.com

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run db:migrate:prod

# Setup monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

#### SSL Certificate Setup

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/doramaflix.com/fullchain.pem /etc/nginx/ssl/doramaflix.com.crt
sudo cp /etc/letsencrypt/live/doramaflix.com/privkey.pem /etc/nginx/ssl/doramaflix.com.key

# Generate DH parameters
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
```

## 📊 Monitoring Setup

### Prometheus & Grafana

Access monitoring dashboards:
- Prometheus: `http://your-domain:9090`
- Grafana: `http://your-domain:3000`
- Default credentials: `admin/admin123`

### Sentry Integration

1. Create Sentry project
2. Copy DSN to environment variables
3. Deploy with Sentry integration enabled

### Log Aggregation

Logs are aggregated using Loki and accessible through Grafana.

## 🔒 Security Configuration

### SSL/TLS Setup

```bash
# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

### Security Headers

All security headers are configured in Nginx:
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options

## 💾 Backup Strategy

### Automated Backups

```bash
# Setup automated backups
cd scripts/backup
chmod +x *.sh
./setup-cron.sh
```

### Manual Backup

```bash
# Database backup
./scripts/backup/backup-database.sh

# File backup
./scripts/backup/backup-files.sh
```

### Backup Schedule

- **Database**: Daily at 2 AM
- **Files**: Weekly on Sunday at 3 AM
- **Retention**: 30 days
- **Storage**: S3 + Local

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Code quality checks
   - Security scanning
   - Automated testing
   - Docker builds
   - Deployment

2. **Security Scanning** (`.github/workflows/security.yml`)
   - Dependency vulnerabilities
   - Container scanning
   - Secret detection
   - Compliance checks

### Required Secrets

Configure in GitHub repository settings:

```
# Railway
RAILWAY_TOKEN
RAILWAY_BACKEND_PROJECT_ID
RAILWAY_FRONTEND_PROJECT_ID

# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
CLOUDFRONT_DISTRIBUTION_ID

# Notifications
SLACK_WEBHOOK
SLACK_SECURITY_WEBHOOK

# Database
RAILWAY_DATABASE_URL
AWS_DATABASE_URL
```

## 📈 Scaling Considerations

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up --scale backend=3

# Update Nginx upstream configuration
# Add new instances to docker/nginx/upstream.conf
```

### Database Scaling

- Use read replicas for read-heavy workloads
- Implement connection pooling with PgBouncer
- Consider database sharding for massive scale

### CDN Setup

Configure CloudFront or Cloudflare for:
- Static asset delivery
- Video streaming optimization
- Global edge caching

## 🛠️ Maintenance

### Regular Tasks

```bash
# Update dependencies
npm audit fix

# Database maintenance
docker-compose exec postgres psql -U postgres -c "VACUUM ANALYZE;"

# Log rotation
logrotate /etc/logrotate.d/doramaflix

# SSL certificate renewal
certbot renew
```

### Health Checks

Monitor these endpoints:
- Frontend: `https://doramaflix.com/health`
- Backend: `https://api.doramaflix.com/health`
- Database: Check through backend health endpoint

## 🚨 Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs backend
   ```

2. **Database Connection Issues**
   ```bash
   # Test connection
   docker-compose exec postgres psql -U postgres -d doramaflix -c "SELECT 1;"
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/nginx/ssl/doramaflix.com.crt -text -noout
   ```

### Log Locations

- Application logs: `/app/logs/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`
- Docker logs: `docker-compose logs [service]`

## 🔗 Useful Commands

```bash
# View all services status
docker-compose ps

# Follow logs
docker-compose logs -f backend

# Execute commands in containers
docker-compose exec backend npm run db:seed

# Backup database manually
docker-compose exec postgres pg_dump -U postgres doramaflix > backup.sql

# Restore database
docker-compose exec postgres psql -U postgres doramaflix < backup.sql

# Update single service
docker-compose up -d --no-deps backend

# Scale services
docker-compose up -d --scale backend=3
```

## 📞 Support

- **Documentation**: [Internal Wiki]
- **Monitoring**: Grafana dashboards
- **Alerts**: Slack #ops-alerts
- **Logs**: Grafana Loki queries

---

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations run
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Error tracking setup
- [ ] Health checks responding
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on operations

---

**Ready for production!** 🚀

For any issues, check the monitoring dashboards first, then consult the troubleshooting section above.