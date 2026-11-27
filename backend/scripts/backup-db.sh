#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGDATABASE:?Set PGDATABASE and standard libpq connection environment}"
: "${BACKUP_DIR:?Set BACKUP_DIR to a protected directory}"
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp "$BACKUP_DIR/.backup-XXXXXXXX")"
trap 'rm -f "$tmp"' EXIT
pg_dump --format=custom --no-owner --no-acl --file="$tmp"
pg_restore --list "$tmp" >/dev/null
mv "$tmp" "$BACKUP_DIR/tradingbeast-$stamp.dump"
printf 'Backup created: %s\n' "$BACKUP_DIR/tradingbeast-$stamp.dump"
