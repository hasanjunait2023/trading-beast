#!/bin/bash
set -euo pipefail

# Session Focus Radar - Application Setup Script
# Run after base system deployment

PROJECT_DIR="/opt/session-focus-radar"
SERVICE_USER="sfr"

echo "📦 Setting up Session Focus Radar application..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

cd $PROJECT_DIR

# Clone or update repository
if [[ -d ".git" ]]; then
    log_info "Updating existing repository..."
    sudo -u $SERVICE_USER git pull
else
    log_info "Cloning repository..."
    # Replace with your actual repo URL
    sudo -u $SERVICE_USER git clone https://github.com/your-username/session-focus-radar.git .
fi

# Create .env if not exists
if [[ ! -f ".env" ]]; then
    log_warn ".env not found. Creating from example..."
    sudo -u $SERVICE_USER cp .env.example .env
    log_error "⚠️  EDIT .env WITH PRODUCTION VALUES BEFORE CONTINUING!"
    log_error "Required: DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME"
    exit 1
fi

# Load environment
set -a
source .env
set +a

# Validate required env vars
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "TELEGRAM_BOT_TOKEN" "TELEGRAM_BOT_USERNAME")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log_error "Missing required environment variable: $var"
        exit 1
    fi
done

# Generate strong JWT secret if placeholder
if [[ "$JWT_SECRET" == "your-super-secret-jwt-key-change-in-production-min-32-chars" ]]; then
    log_warn "Generating new JWT secret..."
    NEW_SECRET=$(openssl rand -base64 48 | tr -d '\n')
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$NEW_SECRET|" .env
    export JWT_SECRET=$NEW_SECRET
    log_info "JWT secret updated in .env"
fi

# Build and start PostgreSQL first
log_info "Starting PostgreSQL..."
sudo -u $SERVICE_USER docker compose up -d postgres

# Wait for PostgreSQL to be healthy
log_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if sudo -u $SERVICE_USER docker compose exec -T postgres pg_isready -U postgres &>/dev/null; then
        log_info "PostgreSQL is ready"
        break
    fi
    sleep 2
done

# Run Prisma migrations
log_info "Running database migrations..."
cd $PROJECT_DIR/backend
sudo -u $SERVICE_USER pnpm exec prisma migrate deploy

# Build backend
log_info "Building backend..."
sudo -u $SERVICE_USER pnpm run build

# Build frontend portals
log_info "Building user portal..."
cd $PROJECT_DIR/frontend/user-portal
sudo -u $SERVICE_USER pnpm run build

log_info "Building admin portal..."
cd $PROJECT_DIR/frontend/admin-portal
sudo -u $SERVICE_USER pnpm run build

# Start all services
log_info "Starting all services..."
cd $PROJECT_DIR
sudo -u $SERVICE_USER docker compose up -d --build

# Wait for services
log_info "Waiting for services to be healthy..."
sleep 10

# Health checks
log_info "Running health checks..."
for i in {1..10}; do
    if curl -sf http://localhost:3000/health &>/dev/null; then
        log_info "Backend health check passed"
        break
    fi
    sleep 3
done

if curl -sf http://localhost:5173 &>/dev/null; then
    log_info "User portal accessible"
else
    log_warn "User portal not yet accessible"
fi

if curl -sf http://localhost:5174 &>/dev/null; then
    log_info "Admin portal accessible"
else
    log_warn "Admin portal not yet accessible"
fi

# Set up systemd services
log_info "Setting up systemd services..."
cp $PROJECT_DIR/deploy/systemd/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable sfr-backend sfr-user-frontend sfr-admin-frontend

# Start systemd services
systemctl start sfr-backend sfr-user-frontend sfr-admin-frontend

log_info "✅ Application setup complete!"
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:3000"
echo "  - User Portal: http://localhost:5173"
echo "  - Admin Portal: http://localhost:5174"
echo "  - QuickChart: http://localhost:3400"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo "Next: Run setup-nginx.sh and setup-ssl.sh"