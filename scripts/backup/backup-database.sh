#!/bin/bash

# =============================================
# DORAMAFLIX - DATABASE BACKUP SCRIPT
# Automated PostgreSQL backup with retention policy
# =============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/doramaflix/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="doramaflix_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-doramaflix}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"

# AWS S3 configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-database-backups}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

setup_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

validate_config() {
    if [[ -z "$DB_PASSWORD" ]]; then
        error "DB_PASSWORD environment variable is required"
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump command not found. Please install PostgreSQL client tools."
    fi
}

test_connection() {
    log "Testing database connection..."
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database"
    fi
    log "Database connection successful"
}

create_backup() {
    log "Starting database backup..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup with verbose output
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-owner \
        --no-privileges \
        --file="$BACKUP_DIR/$BACKUP_FILE"; then
        
        log "Database backup created: $BACKUP_FILE"
    else
        error "Failed to create database backup"
    fi
    
    unset PGPASSWORD
}

compress_backup() {
    log "Compressing backup file..."
    
    if gzip "$BACKUP_DIR/$BACKUP_FILE"; then
        log "Backup compressed: $COMPRESSED_FILE"
    else
        error "Failed to compress backup file"
    fi
}

upload_to_s3() {
    if [[ -n "$S3_BUCKET" ]]; then
        log "Uploading backup to S3..."
        
        if command -v aws &> /dev/null; then
            if aws s3 cp "$BACKUP_DIR/$COMPRESSED_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$COMPRESSED_FILE"; then
                log "Backup uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/$COMPRESSED_FILE"
            else
                log "WARNING: Failed to upload backup to S3"
            fi
        else
            log "WARNING: AWS CLI not found, skipping S3 upload"
        fi
    fi
}

verify_backup() {
    log "Verifying backup integrity..."
    
    if [[ -f "$BACKUP_DIR/$COMPRESSED_FILE" ]]; then
        # Test if compressed file is valid
        if gunzip -t "$BACKUP_DIR/$COMPRESSED_FILE" 2>/dev/null; then
            log "Backup verification successful"
        else
            error "Backup verification failed - corrupted file"
        fi
    else
        error "Backup file not found"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "doramaflix_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Remove old S3 backups if configured
    if [[ -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | awk '{print $4}' | while read -r file; do
            if [[ $file =~ doramaflix_backup_([0-9]{8})_.*.sql.gz ]]; then
                local file_date="${BASH_REMATCH[1]}"
                if [[ $file_date < $cutoff_date ]]; then
                    aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$file"
                    log "Removed old S3 backup: $file"
                fi
            fi
        done
    fi
    
    log "Cleanup completed"
}

generate_backup_report() {
    local backup_size=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
    local total_backups=$(find "$BACKUP_DIR" -name "doramaflix_backup_*.sql.gz" -type f | wc -l)
    
    log "=== BACKUP REPORT ==="
    log "Backup file: $COMPRESSED_FILE"
    log "Backup size: $backup_size"
    log "Total local backups: $total_backups"
    log "Retention policy: $RETENTION_DAYS days"
    log "===================="
}

send_notification() {
    # Send notification to monitoring system (optional)
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        local message="DoramaFlix database backup completed successfully: $COMPRESSED_FILE ($(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1))"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$WEBHOOK_URL" || log "WARNING: Failed to send notification"
    fi
}

main() {
    log "Starting DoramaFlix database backup process"
    
    validate_config
    setup_backup_dir
    test_connection
    create_backup
    compress_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups
    generate_backup_report
    send_notification
    
    log "Database backup process completed successfully"
}

# Handle script interruption
trap 'error "Backup process interrupted"' INT TERM

# Run main function
main "$@"