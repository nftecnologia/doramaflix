#!/bin/bash

# =============================================
# DORAMAFLIX - FILE BACKUP SCRIPT
# Automated file backup with cloud storage sync
# =============================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/doramaflix/files}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Source directories to backup
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
LOGS_DIR="${LOGS_DIR:-/app/logs}"
CONFIG_DIR="${CONFIG_DIR:-/app/config}"

# Cloud storage configuration
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-file-backups}"
CLOUDFLARE_R2_BUCKET="${CLOUDFLARE_R2_BUCKET:-}"

# Logging
LOG_FILE="${BACKUP_DIR}/file-backup.log"

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
    if ! command -v tar &> /dev/null; then
        error "tar command not found"
    fi
    
    if ! command -v gzip &> /dev/null; then
        error "gzip command not found"
    fi
}

create_file_backup() {
    log "Starting file backup..."
    
    local backup_file="doramaflix_files_${TIMESTAMP}.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    # Create temporary list of files to backup
    local temp_list=$(mktemp)
    
    # Add existing directories to backup list
    for dir in "$UPLOAD_DIR" "$LOGS_DIR" "$CONFIG_DIR"; do
        if [[ -d "$dir" ]]; then
            echo "$dir" >> "$temp_list"
            log "Added to backup: $dir"
        else
            log "WARNING: Directory not found: $dir"
        fi
    done
    
    if [[ ! -s "$temp_list" ]]; then
        error "No directories found to backup"
    fi
    
    # Create compressed archive
    if tar -czf "$backup_path" -T "$temp_list" 2>/dev/null; then
        log "File backup created: $backup_file"
        log "Backup size: $(du -h "$backup_path" | cut -f1)"
    else
        error "Failed to create file backup"
    fi
    
    rm -f "$temp_list"
    echo "$backup_file"
}

sync_to_s3() {
    local backup_file="$1"
    
    if [[ -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        log "Syncing files to S3..."
        
        # Upload the backup archive
        if aws s3 cp "$BACKUP_DIR/$backup_file" "s3://$S3_BUCKET/$S3_PREFIX/$backup_file"; then
            log "Backup uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/$backup_file"
        else
            log "WARNING: Failed to upload backup to S3"
        fi
        
        # Sync upload directory directly for quick access
        if [[ -d "$UPLOAD_DIR" ]]; then
            aws s3 sync "$UPLOAD_DIR" "s3://$S3_BUCKET/uploads/" --delete --storage-class STANDARD_IA
            log "Upload directory synced to S3"
        fi
    fi
}

sync_to_cloudflare_r2() {
    local backup_file="$1"
    
    if [[ -n "$CLOUDFLARE_R2_BUCKET" ]] && command -v aws &> /dev/null; then
        log "Syncing files to Cloudflare R2..."
        
        # Configure R2 endpoint
        export AWS_ENDPOINT_URL="${CLOUDFLARE_R2_ENDPOINT}"
        
        # Upload the backup archive
        if aws s3 cp "$BACKUP_DIR/$backup_file" "s3://$CLOUDFLARE_R2_BUCKET/$S3_PREFIX/$backup_file"; then
            log "Backup uploaded to Cloudflare R2: $CLOUDFLARE_R2_BUCKET/$S3_PREFIX/$backup_file"
        else
            log "WARNING: Failed to upload backup to Cloudflare R2"
        fi
        
        # Sync upload directory
        if [[ -d "$UPLOAD_DIR" ]]; then
            aws s3 sync "$UPLOAD_DIR" "s3://$CLOUDFLARE_R2_BUCKET/uploads/" --delete
            log "Upload directory synced to Cloudflare R2"
        fi
        
        unset AWS_ENDPOINT_URL
    fi
}

verify_backup() {
    local backup_file="$1"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    log "Verifying backup integrity..."
    
    if [[ -f "$backup_path" ]]; then
        # Test if compressed file is valid
        if tar -tzf "$backup_path" >/dev/null 2>&1; then
            local file_count=$(tar -tzf "$backup_path" | wc -l)
            log "Backup verification successful ($file_count files)"
        else
            error "Backup verification failed - corrupted archive"
        fi
    else
        error "Backup file not found: $backup_path"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old file backups (retention: $RETENTION_DAYS days)..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "doramaflix_files_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Remove old S3 backups if configured
    if [[ -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | awk '{print $4}' | while read -r file; do
            if [[ $file =~ doramaflix_files_([0-9]{8})_.*.tar.gz ]]; then
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

create_incremental_backup() {
    log "Creating incremental backup using rsync..."
    
    local incremental_dir="$BACKUP_DIR/incremental/$(date +%Y%m%d)"
    mkdir -p "$incremental_dir"
    
    # Sync files with hard links for space efficiency
    for dir in "$UPLOAD_DIR" "$LOGS_DIR" "$CONFIG_DIR"; do
        if [[ -d "$dir" ]]; then
            local dir_name=$(basename "$dir")
            rsync -av --delete --link-dest="$BACKUP_DIR/incremental/latest/" \
                "$dir/" "$incremental_dir/$dir_name/" || log "WARNING: rsync failed for $dir"
        fi
    done
    
    # Update latest symlink
    rm -f "$BACKUP_DIR/incremental/latest"
    ln -s "$(date +%Y%m%d)" "$BACKUP_DIR/incremental/latest"
    
    log "Incremental backup completed"
}

generate_backup_report() {
    local backup_file="$1"
    local backup_size=$(du -h "$BACKUP_DIR/$backup_file" | cut -f1)
    local total_backups=$(find "$BACKUP_DIR" -name "doramaflix_files_*.tar.gz" -type f | wc -l)
    
    # Calculate directory sizes
    local upload_size="N/A"
    local logs_size="N/A"
    
    if [[ -d "$UPLOAD_DIR" ]]; then
        upload_size=$(du -sh "$UPLOAD_DIR" 2>/dev/null | cut -f1 || echo "N/A")
    fi
    
    if [[ -d "$LOGS_DIR" ]]; then
        logs_size=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1 || echo "N/A")
    fi
    
    log "=== FILE BACKUP REPORT ==="
    log "Backup file: $backup_file"
    log "Backup size: $backup_size"
    log "Upload directory size: $upload_size"
    log "Logs directory size: $logs_size"
    log "Total local backups: $total_backups"
    log "Retention policy: $RETENTION_DAYS days"
    log "=========================="
}

send_notification() {
    local backup_file="$1"
    
    # Send notification to monitoring system (optional)
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        local backup_size=$(du -h "$BACKUP_DIR/$backup_file" | cut -f1)
        local message="DoramaFlix file backup completed successfully: $backup_file ($backup_size)"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$WEBHOOK_URL" || log "WARNING: Failed to send notification"
    fi
}

main() {
    log "Starting DoramaFlix file backup process"
    
    validate_config
    setup_backup_dir
    
    # Create full backup
    local backup_file
    backup_file=$(create_file_backup)
    
    # Verify backup
    verify_backup "$backup_file"
    
    # Upload to cloud storage
    sync_to_s3 "$backup_file"
    sync_to_cloudflare_r2 "$backup_file"
    
    # Create incremental backup
    create_incremental_backup
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report "$backup_file"
    
    # Send notification
    send_notification "$backup_file"
    
    log "File backup process completed successfully"
}

# Handle script interruption
trap 'error "File backup process interrupted"' INT TERM

# Run main function
main "$@"