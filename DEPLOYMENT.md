# VPS Deployment Guide — Session Focus Radar

**Target:** VPS with IP starting with `72.x.x.x` (SSH access confirmed)

## Quick Start (Run on VPS as root)

```bash
# 1. Clone repository
git clone https://github.com/your-username/session-focus-radar.git /opt/session-focus-radar
cd /opt/session-focus-radar

# 2. Run base system setup
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy.sh

# 3. Configure production environment
cp deploy/.env.production .env
# EDIT .env with all production values (see required vars below)

# 4. Run application setup
./deploy/scripts/setup-app.sh

# 5. Configure Nginx (after DNS is ready)
DOMAIN=your-domain.com ./deploy/scripts/setup-nginx.sh

# 6. Setup SSL (after DNS propagates)
DOMAIN=your-domain.com SSL_EMAIL=admin@your-domain.com ./deploy/scripts/setup-ssl.sh

# 7. Verify everything
curl https://your-domain.com/health
curl https://your-domain.com
curl https://admin.your-domain.com
```

## Required Environment Variables (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:password@postgres:5432/session_focus_radar` |
| `JWT_SECRET` | **Generate: `openssl rand -base64 48`** | `abc123...` |
| `TELEGRAM_BOT_TOKEN` | From @BotFather | `123456:ABC-DEF...` |
| `TELEGRAM_BOT_USERNAME` | Your bot username | `YourBot` |
| `FRONTEND_URL` | Production domain | `https://your-domain.com` |
| `ADMIN_FRONTEND_URL` | Admin subdomain | `https://admin.your-domain.com` |
| `FINNHUB_API_KEY` | Optional Yahoo fallback | `your_key` |
| `QUICKCHART_URL` | Self-hosted chart service | `http://quickchart:3400` |
| `BKASH_MERCHANT_NUMBER` | Your bKash number | `+8801XXXXXXXXX` |
| `NAGAD_MERCHANT_NUMBER` | Your Nagad number | `+8801XXXXXXXXX` |
| `USDT_TRC20_ADDRESS` | Your USDT wallet | `TXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `SSL_EMAIL` | For Certbot | `admin@your-domain.com` |

## DNS Configuration

Before running SSL setup, ensure these A records point to your VPS IP (72.x.x.x):

| Type | Name | Value |
|------|------|-------|
| A | @ | 72.x.x.x |
| A | www | 72.x.x.x |
| A | admin | 72.x.x.x |

## Service Management

```bash
# Check status
systemctl status sfr-backend sfr-user-frontend sfr-admin-frontend

# View logs
journalctl -u sfr-backend -f
journalctl -u sfr-user-frontend -f
docker logs sfr-postgres -f

# Restart services
systemctl restart sfr-backend sfr-user-frontend sfr-admin-frontend

# Docker compose commands
cd /opt/session-focus-radar
docker compose ps
docker compose logs -f backend
docker compose restart backend
```

## Monitoring

```bash
# Manual health check
/opt/session-focus-radar/deploy/scripts/monitor.sh

# Setup cron (runs every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/session-focus-radar/deploy/scripts/monitor.sh

# View monitor logs
tail -f /var/log/sfr-monitor.log
```

## Backup Strategy

```bash
# Database backup (run daily via cron)
docker exec sfr-postgres pg_dump -U postgres session_focus_radar > /opt/backups/session-focus-radar/db_$(date +%F).sql

# Full backup script
cat > /opt/session-focus-radar/deploy/scripts/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%F_%H-%M)
BACKUP_DIR="/opt/backups/session-focus-radar"
mkdir -p $BACKUP_DIR

# Database
docker exec sfr-postgres pg_dump -U postgres session_focus_radar | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Config
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C /opt/session-focus-radar .env docker-compose.yml

# Keep last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF
chmod +x /opt/session-focus-radar/deploy/scripts/backup.sh
```

## Telegram Webhook Setup

After deployment with SSL:

```bash
# Set webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook", "allowed_updates": ["message", "callback_query"]}'

# Verify
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## Firewall (Already configured by deploy.sh)

```bash
ufw status
# Should show: 22/tcp (SSH), 80/443 (Nginx)
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| Backend not starting | `docker logs sfr-backend` |
| Database connection failed | `docker logs sfr-postgres` |
| Nginx 502 | `systemctl status nginx`, check upstream ports |
| SSL not working | `certbot certificates`, check DNS |
| Telegram webhook fails | Check `/api/telegram/webhook` endpoint accessible |

## Security Checklist

- [ ] Strong JWT_SECRET (48+ chars)
- [ ] PostgreSQL password changed from default
- [ ] Firewall only allows 22, 80, 443
- [ ] SSH key-only auth (disable password)
- [ ] Fail2ban installed for SSH
- [ ] Regular updates: `apt update && apt upgrade -y`
- [ ] Database backups verified
- [ ] SSL auto-renewal tested

## Rollback Procedure

```bash
# Quick rollback to previous Docker images
cd /opt/session-focus-radar
docker compose pull
docker compose up -d --force-recreate

# Database rollback (if migration broke)
docker exec sfr-postgres psql -U postgres -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
# Then manually revert if needed
```