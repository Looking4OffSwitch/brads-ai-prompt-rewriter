# Deployment Guide - Coolify on VPS

This application is optimized for deployment on Coolify, a self-hosted deployment platform running on your own VPS.

## Prerequisites

- Coolify installed on your VPS (https://coolify.io)
- Docker and Docker Compose installed
- Anthropic API key from https://console.anthropic.com/settings/keys
- GitHub repository access

---

## Quick Start with Coolify

### 1. Add Project to Coolify

1. **Login to Coolify Dashboard**
   - Navigate to your Coolify instance (e.g., `https://coolify.yourdomain.com`)

2. **Create New Project**
   - Click "New Project"
   - Select "Git Repository"
   - Choose "GitHub" as source

3. **Connect Repository**
   - Repository: `Looking4OffSwitch/ai-prompt-optimizer`
   - Branch: `main`
   - Build Pack: **Dockerfile** (Coolify will auto-detect)

### 2. Configure Environment Variables

In Coolify's Environment Variables section, add:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
NODE_ENV=production
```

**IMPORTANT:** Never commit your actual API key to git. Use Coolify's secrets management.

### 3. Configure Build Settings

Coolify should auto-detect these from the Dockerfile, but verify:

- **Build Method:** Dockerfile
- **Dockerfile Path:** `./Dockerfile`
- **Port:** `3000`
- **Health Check Path:** `/api/health`

### 4. Deploy

Click **Deploy** button. Coolify will:
1. Clone the repository
2. Build the Docker image
3. Start the container
4. Map to your domain/subdomain

---

## Manual Docker Deployment (Without Coolify)

If you prefer manual Docker deployment on your VPS:

### 1. SSH into Your VPS

```bash
ssh user@your-vps-ip
```

### 2. Clone Repository

```bash
git clone https://github.com/Looking4OffSwitch/ai-prompt-optimizer.git
cd ai-prompt-optimizer
```

### 3. Create Environment File

```bash
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
NODE_ENV=production
EOF
```

### 4. Build and Run with Docker Compose

```bash
# Build the image
docker-compose build

# Start the container
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 5. Verify Deployment

```bash
# Check health
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","checks":{"apiKeyConfigured":true}}
```

---

## Nginx Reverse Proxy Setup

To expose your app via domain with HTTPS:

### 1. Install Nginx and Certbot

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/ai-prompt-optimizer
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

### 3. Enable Site and Get SSL

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/ai-prompt-optimizer /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key | `sk-ant-api03-...` |
| `NODE_ENV` | No | Node environment | `production` (default) |
| `PORT` | No | Application port | `3000` (default) |

---

## Health Checks

The application provides a health check endpoint for monitoring:

**Endpoint:** `GET /api/health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T...",
  "checks": {
    "apiKeyConfigured": true
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "degraded",
  "timestamp": "2026-02-10T...",
  "checks": {
    "apiKeyConfigured": false
  }
}
```

Configure Coolify or your monitoring tool to check this endpoint every 30 seconds.

---

## Docker Commands Reference

### Viewing Logs
```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker logs ai-prompt-optimizer
```

### Restarting Application
```bash
# Restart
docker-compose restart

# Stop
docker-compose stop

# Start
docker-compose start

# Full restart (rebuild)
docker-compose down && docker-compose up -d --build
```

### Updating to Latest Code
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Verify
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Issue: "Service configuration error"

**Cause:** `ANTHROPIC_API_KEY` not set or invalid

**Solution:**
```bash
# Check if env var is set in container
docker exec ai-prompt-optimizer printenv | grep ANTHROPIC_API_KEY

# If missing, add to .env.local or Coolify env vars
# Then restart
docker-compose restart
```

### Issue: Container keeps restarting

**Cause:** Build failure or missing dependencies

**Solution:**
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### Issue: "Cannot connect to API"

**Cause:** Firewall or port not exposed

**Solution:**
```bash
# Check if port is open
sudo ufw allow 3000/tcp

# Or if using Coolify, check port mapping in dashboard
```

### Issue: High memory usage

**Cause:** Next.js build cache or logs

**Solution:**
```bash
# Set memory limit in docker-compose.yml
services:
  ai-prompt-optimizer:
    deploy:
      resources:
        limits:
          memory: 512M

# Then restart
docker-compose up -d
```

---

## Production Checklist

Before going live:

- [ ] `ANTHROPIC_API_KEY` set in environment (Coolify secrets or .env.local)
- [ ] Domain configured with Nginx/Caddy/Traefik
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Health check endpoint responding
- [ ] Test full optimization flow
- [ ] Test rate limiting (11+ rapid requests)
- [ ] Test error handling (invalid inputs)
- [ ] Logs are being captured (docker logs or Coolify logs)
- [ ] Backups configured (optional but recommended)
- [ ] Monitoring/alerts set up (Uptime Kuma, etc.)

---

## Security Best Practices

### 1. Environment Variables
- ✅ Use Coolify's secrets management or .env.local
- ✅ Never commit `.env.local` to git (already in .gitignore)
- ✅ Rotate API keys periodically

### 2. Network Security
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Only expose 3000 if using direct access
# Otherwise, keep it internal and use Nginx
```

### 3. Docker Security
- Use non-root user (already configured in Dockerfile)
- Keep base images updated
- Scan for vulnerabilities:
  ```bash
  docker scan ai-prompt-optimizer
  ```

### 4. Rate Limiting
The app includes rate limiting (10 req/min per IP), but consider adding Nginx-level rate limiting:

```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/m;

server {
    location /api/optimize {
        limit_req zone=api_limit burst=5;
        proxy_pass http://localhost:3000;
    }
}
```

---

## Monitoring & Maintenance

### Log Monitoring
```bash
# Watch for errors
docker-compose logs -f | grep ERROR

# Monitor API calls
docker-compose logs -f | grep "Anthropic API"

# Track rate limiting
docker-compose logs -f | grep "Rate limit"
```

### Resource Monitoring
```bash
# Container stats
docker stats ai-prompt-optimizer

# Disk usage
docker system df
```

### Automated Backups (Optional)
```bash
# Create backup script
cat > /root/backup-ai-optimizer.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/ai-optimizer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cd /path/to/ai-prompt-optimizer

# Backup environment file
cp .env.local $BACKUP_DIR/.env.local.$DATE

# Backup docker volumes (if any)
docker-compose stop
tar -czf $BACKUP_DIR/data_$DATE.tar.gz .next

docker-compose start

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup-ai-optimizer.sh

# Add to cron (daily at 2am)
echo "0 2 * * * /root/backup-ai-optimizer.sh" | crontab -
```

---

## Performance Optimization

### 1. Enable Nginx Caching
```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache app_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_bypass $http_cache_control;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. Docker Resource Limits
```yaml
# In docker-compose.yml
services:
  ai-prompt-optimizer:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

---

## Scaling & High Availability

For high-traffic scenarios:

### Option 1: Multiple Containers (Docker Swarm/Kubernetes)
### Option 2: Load Balancer + Multiple Instances
### Option 3: Coolify's built-in scaling features

Coolify supports horizontal scaling. In the dashboard:
1. Go to your service
2. Scale replicas to desired number
3. Coolify handles load balancing

---

## Cost Estimation

### VPS Costs
- **Small (2GB RAM):** $5-10/month - Good for testing
- **Medium (4GB RAM):** $20-40/month - Suitable for production
- **Large (8GB RAM):** $40-80/month - High traffic

### Anthropic API Costs
- Model pricing: ~$3 per million input tokens, ~$15 per million output tokens
- Typical optimization: 500-2000 input tokens, 1000-5000 output tokens
- Estimated cost: $0.01-0.10 per optimization
- Monitor at: https://console.anthropic.com/settings/usage

---

## Alternative Deployment Methods

### Option 1: Coolify (Recommended)
- ✅ Easy web-based deployment
- ✅ Automatic SSL certificates
- ✅ Built-in monitoring
- ✅ Git integration

### Option 2: Manual Docker
- ✅ Full control
- ✅ No additional dependencies
- ⚠️ Requires manual SSL setup
- ⚠️ Manual monitoring setup

### Option 3: Docker Swarm
- ✅ Multi-node scaling
- ✅ High availability
- ⚠️ More complex setup

### Option 4: Kubernetes (Advanced)
- ✅ Enterprise-grade orchestration
- ✅ Auto-scaling
- ⚠️ Significant complexity

---

## Support & Resources

- **Coolify Documentation:** https://coolify.io/docs
- **Docker Documentation:** https://docs.docker.com
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Anthropic API:** https://docs.anthropic.com

---

## Quick Reference Commands

```bash
# Deploy/Update
git pull && docker-compose up -d --build

# View logs
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health

# Restart
docker-compose restart

# Stop
docker-compose down

# Clean up
docker system prune -a

# Monitor resources
docker stats

# Check API key
docker exec ai-prompt-optimizer printenv | grep ANTHROPIC_API_KEY
```

---

**Your AI Prompt Optimizer is now ready for production deployment on your VPS with Coolify! 🚀**
