#!/bin/bash
set -euo pipefail

# Session Focus Radar - SSL Certificate Setup Script

DOMAIN="${1:-your-domain.com}"
ADMIN_DOMAIN="admin.${DOMAIN}"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

echo "🔒 Setting up SSL certificates for ${DOMAIN} and ${ADMIN_DOMAIN}..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check if domain resolves to this server
log_info "Checking DNS resolution..."
DOMAIN_IP=$(dig +short ${DOMAIN} | tail -1)
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)

if [[ "$DOMAIN_IP" != "$SERVER_IP" ]]; then
    log_warn "Domain ${DOMAIN} resolves to ${DOMAIN_IP}, but server IP is ${SERVER_IP}"
    log_warn "SSL certificate may fail. Ensure DNS A record points to this server."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Obtain certificates
log_info "Obtaining SSL certificates..."
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} \
    --non-interactive --agree-tos --email ${EMAIL} \
    --redirect --hsts --staple-ocsp

if [[ $? -eq 0 ]]; then
    log_info "✅ SSL certificates obtained successfully"
else
    log_error "Failed to obtain SSL certificates"
    exit 1
fi

# Test auto-renewal
log_info "Testing certificate auto-renewal..."
certbot renew --dry-run

if [[ $? -eq 0 ]]; then
    log_info "✅ Auto-renewal test passed"
else
    log_warn "Auto-renewal test failed - check certbot timer"
fi

# Setup auto-renewal cron (backup to systemd timer)
cat > /etc/cron.d/certbot-renewal <<EOF
# Certbot auto-renewal - runs twice daily
0 */12 * * * root certbot renew --quiet --nginx --deploy-hook "systemctl reload nginx"
EOF

log_info "✅ SSL setup complete for ${DOMAIN} and ${ADMIN_DOMAIN}"
echo ""
echo "Certificates will auto-renew via systemd timer and cron backup"
echo "Test renewal: certbot renew --dry-run"