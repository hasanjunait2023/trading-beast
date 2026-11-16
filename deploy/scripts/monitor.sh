#!/bin/bash
set -euo pipefail

# Session Focus Radar - Monitoring Script
# Run via cron every 5 minutes

PROJECT_DIR="/opt/session-focus-radar"
LOG_FILE="/var/log/sfr-monitor.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE; }
alert() {
    log "ALERT: $1"
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -s -X POST -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 SFR Alert: $1\"}" \
            "$ALERT_WEBHOOK" &>/dev/null
    fi
}

check_service() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [[ "$response" == "$expected_code" ]]; then
            log "✅ $name: HTTP $response"
            return 0
        else
            alert "$name returned HTTP $response (expected $expected_code)"
            return 1
        fi
    else
        alert "$name is unreachable"
        return 1
    fi
}

check_docker_container() {
    local container=$1
    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        log "✅ Docker container $container: running"
        return 0
    else
        alert "Docker container $container is not running"
        return 1
    fi
}

check_disk_space() {
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $usage -gt 85 ]]; then
        alert "Disk usage critical: ${usage}%"
        return 1
    elif [[ $usage -gt 70 ]]; then
        log "⚠️ Disk usage: ${usage}%"
    else
        log "✅ Disk usage: ${usage}%"
    fi
}

check_memory() {
    local usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [[ $usage -gt 90 ]]; then
        alert "Memory usage critical: ${usage}%"
        return 1
    elif [[ $usage -gt 80 ]]; then
        log "⚠️ Memory usage: ${usage}%"
    else
        log "✅ Memory usage: ${usage}%"
    fi
}

# Main checks
log "=== Starting health check ==="

# System resources
check_disk_space
check_memory

# Docker containers
check_docker_container "sfr-postgres"
check_docker_container "sfr-quickchart"
check_docker_container "sfr-backend"
check_docker_container "sfr-user-frontend"
check_docker_container "sfr-admin-frontend"

# HTTP endpoints
check_service "Backend API" "http://localhost:3000/health"
check_service "User Portal" "http://localhost:5173"
check_service "Admin Portal" "http://localhost:5174"
check_service "QuickChart" "http://localhost:3400"

# Database connectivity
if docker exec sfr-postgres pg_isready -U postgres &>/dev/null; then
    log "✅ PostgreSQL: accepting connections"
else
    alert "PostgreSQL not accepting connections"
fi

# SSL certificate expiry (if certbot is used)
if command -v certbot &>/dev/null; then
    certbot certificates 2>/dev/null | grep -A1 "VALID" | while read -r line; do
        if echo "$line" | grep -q "VALID"; then
            expiry=$(echo "$line" | grep -oP '(?<=VALID: )\d{4}-\d{2}-\d{2}')
            if [[ -n "$expiry" ]]; then
                days_left=$(( ( $(date -d "$expiry" +%s) - $(date +%s) ) / 86400 ))
                if [[ $days_left -lt 30 ]]; then
                    alert "SSL certificate expires in $days_left days"
                else
                    log "✅ SSL certificate valid for $days_left days"
                fi
            fi
        fi
    done
fi

log "=== Health check complete ==="