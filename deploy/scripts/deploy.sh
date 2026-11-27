#!/bin/bash
set -euo pipefail

# Session Focus Radar - VPS Deployment Script
# Run on target VPS (IP starting with 72.x.x.x)

PROJECT_DIR="/opt/session-focus-radar"
BACKUP_DIR="/opt/backups/session-focus-radar"
SERVICE_USER="sfr"
DOMAIN="${DOMAIN:-your-domain.com}"

echo "🚀 Starting Session Focus Radar deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Create service user
if ! id "$SERVICE_USER" &>/dev/null; then
    log_info "Creating service user: $SERVICE_USER"
    useradd -r -s /bin/bash -d /home/$SERVICE_USER -m $SERVICE_USER
    usermod -aG docker $SERVICE_USER
fi

# Create directories
log_info "Creating project directories..."
mkdir -p $PROJECT_DIR $BACKUP_DIR
chown -R $SERVICE_USER:$SERVICE_USER $PROJECT_DIR $BACKUP_DIR

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose if not present
if ! docker compose version &> /dev/null; then
    log_info "Installing Docker Compose..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install Node.js 20 (for Prisma migrations)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    log_info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    log_info "Installing pnpm..."
    npm install -g pnpm
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    log_info "Installing Nginx..."
    apt-get update && apt-get install -y nginx
    systemctl enable nginx
fi

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    log_info "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Setup firewall
log_info "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

log_info "✅ Base system setup complete"
echo ""
echo "Next steps:"
echo "1. Copy project files to $PROJECT_DIR"
echo "2. Configure .env with production values"
echo "3. Run: $PROJECT_DIR/deploy/scripts/setup-app.sh"
echo "4. Run: $PROJECT_DIR/deploy/scripts/setup-nginx.sh"
echo "5. Run: $PROJECT_DIR/deploy/scripts/setup-ssl.sh $DOMAIN"