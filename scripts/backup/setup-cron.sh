#!/bin/bash

# =============================================
# DORAMAFLIX - CRON SETUP SCRIPT
# Setup automated backup cron jobs
# =============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cron schedule configuration
DB_BACKUP_SCHEDULE="${DB_BACKUP_SCHEDULE:-0 2 * * *}"      # Daily at 2 AM
FILE_BACKUP_SCHEDULE="${FILE_BACKUP_SCHEDULE:-0 3 * * 0}"  # Weekly on Sunday at 3 AM

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

setup_cron_jobs() {
    log "Setting up cron jobs for automated backups..."
    
    # Create temporary cron file
    local temp_cron=$(mktemp)
    
    # Add existing cron jobs (if any)
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    # Remove existing DoramaFlix backup jobs
    sed -i '/# DoramaFlix Backup Jobs/,/# End DoramaFlix Backup Jobs/d' "$temp_cron"
    
    # Add new backup jobs
    cat >> "$temp_cron" << EOF

# DoramaFlix Backup Jobs
# Database backup - daily at 2 AM
$DB_BACKUP_SCHEDULE $SCRIPT_DIR/backup-database.sh >> /var/log/doramaflix-backup.log 2>&1

# File backup - weekly on Sunday at 3 AM
$FILE_BACKUP_SCHEDULE $SCRIPT_DIR/backup-files.sh >> /var/log/doramaflix-backup.log 2>&1

# Cleanup old logs - monthly
0 4 1 * * find /var/log -name "doramaflix-backup.log*" -type f -mtime +30 -delete

# End DoramaFlix Backup Jobs
EOF
    
    # Install new cron file
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "Cron jobs installed successfully"
}

verify_cron_setup() {
    log "Verifying cron setup..."
    
    if crontab -l | grep -q "DoramaFlix Backup Jobs"; then
        log "✓ Cron jobs found in crontab"
        crontab -l | grep -A 10 "DoramaFlix Backup Jobs"
    else
        log "✗ Cron jobs not found in crontab"
        exit 1
    fi
}

create_log_file() {
    local log_file="/var/log/doramaflix-backup.log"
    
    if [[ ! -f "$log_file" ]]; then
        sudo touch "$log_file"
        sudo chmod 644 "$log_file"
        log "Created log file: $log_file"
    fi
}

main() {
    log "Setting up DoramaFlix automated backup system"
    
    # Check if scripts exist
    if [[ ! -f "$SCRIPT_DIR/backup-database.sh" ]]; then
        log "ERROR: backup-database.sh not found"
        exit 1
    fi
    
    if [[ ! -f "$SCRIPT_DIR/backup-files.sh" ]]; then
        log "ERROR: backup-files.sh not found"
        exit 1
    fi
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/backup-database.sh"
    chmod +x "$SCRIPT_DIR/backup-files.sh"
    
    # Create log file
    create_log_file
    
    # Setup cron jobs
    setup_cron_jobs
    
    # Verify setup
    verify_cron_setup
    
    log "Automated backup system setup completed successfully"
    log "Database backups scheduled: $DB_BACKUP_SCHEDULE"
    log "File backups scheduled: $FILE_BACKUP_SCHEDULE"
}

main "$@"