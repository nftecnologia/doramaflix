#!/bin/bash

# =============================================
# DORAMAFLIX - Database Backup Script
# =============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_DB_NAME="doramaflix"
DEFAULT_DB_USER="postgres"
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="5432"

# Get database configuration from environment or use defaults
DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
DB_USER="${DB_USER:-$DEFAULT_DB_USER}"
DB_HOST="${DB_HOST:-$DEFAULT_DB_HOST}"
DB_PORT="${DB_PORT:-$DEFAULT_DB_PORT}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$TIMESTAMP.sql"

echo -e "${BLUE}💾 DoramaFlix Database Backup${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${BLUE}📁 Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
    print_status "Backup directory created: $BACKUP_DIR"
fi

# Check if PostgreSQL is running
echo -e "${BLUE}📡 Checking PostgreSQL connection...${NC}"
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    print_status "PostgreSQL is running and accessible"
else
    print_error "Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    exit 1
fi

# Check if database exists
echo -e "${BLUE}🗄️  Checking if database exists...${NC}"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" != "1" ]; then
    print_error "Database '$DB_NAME' does not exist"
    exit 1
fi

print_status "Database '$DB_NAME' found"

# Perform backup
echo -e "${BLUE}💾 Creating backup...${NC}"
echo "Backup file: $BACKUP_FILE"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    print_status "Backup created successfully"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_status "Backup size: $BACKUP_SIZE"
    
    # Compress backup (optional)
    echo -n "Do you want to compress the backup? (y/N): "
    read -r compress_response
    
    if [[ "$compress_response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🗜️  Compressing backup...${NC}"
        gzip "$BACKUP_FILE"
        COMPRESSED_FILE="${BACKUP_FILE}.gz"
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        print_status "Backup compressed: $COMPRESSED_SIZE"
        BACKUP_FILE="$COMPRESSED_FILE"
    fi
else
    print_error "Backup failed"
    exit 1
fi

# Cleanup old backups (optional)
echo -n "Do you want to clean up old backups (keep last 5)? (y/N): "
read -r cleanup_response

if [[ "$cleanup_response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🧹 Cleaning up old backups...${NC}"
    
    # Keep only the 5 most recent backups
    OLD_BACKUPS=$(ls -t "$BACKUP_DIR"/${DB_NAME}_backup_*.sql* 2>/dev/null | tail -n +6)
    
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | xargs rm -f
        REMOVED_COUNT=$(echo "$OLD_BACKUPS" | wc -l)
        print_status "Removed $REMOVED_COUNT old backup(s)"
    else
        print_status "No old backups to remove"
    fi
fi

# Show backup information
echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Backup Details:${NC}"
echo -e "   File: $BACKUP_FILE"
echo -e "   Database: $DB_NAME"
echo -e "   Timestamp: $TIMESTAMP"
echo ""
echo -e "${BLUE}📋 To restore this backup:${NC}"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "   gunzip -c $BACKUP_FILE | psql -h $DB_HOST -p $DB_PORT -U $DB_USER"
else
    echo -e "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f $BACKUP_FILE"
fi
echo ""

# List all available backups
echo -e "${BLUE}📂 Available backups:${NC}"
ls -lah "$BACKUP_DIR"/${DB_NAME}_backup_*.sql* 2>/dev/null | awk '{print "   " $9 " (" $5 ", " $6 " " $7 ")"}' || echo "   No backups found"