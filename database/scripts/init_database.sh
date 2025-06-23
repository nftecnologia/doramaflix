#!/bin/bash

# =============================================
# DORAMAFLIX - Database Initialization Script
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

echo -e "${BLUE}🚀 DoramaFlix Database Initialization${NC}"
echo -e "${BLUE}======================================${NC}"
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

# Check if PostgreSQL is running
echo -e "${BLUE}📡 Checking PostgreSQL connection...${NC}"
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    print_status "PostgreSQL is running and accessible"
else
    print_error "Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    echo "Please ensure PostgreSQL is running and accessible."
    exit 1
fi

# Check if database exists
echo -e "${BLUE}🗄️  Checking if database exists...${NC}"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    print_warning "Database '$DB_NAME' already exists"
    echo -n "Do you want to recreate it? This will DELETE ALL DATA! (y/N): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🗑️  Dropping existing database...${NC}"
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        print_status "Database dropped"
    else
        print_warning "Skipping database creation"
        echo -n "Do you want to run migrations on existing database? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Exiting..."
            exit 0
        fi
    fi
fi

# Create database if it doesn't exist
if [ "$DB_EXISTS" != "1" ] || [[ "$response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🏗️  Creating database '$DB_NAME'...${NC}"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    print_status "Database created"
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Run schema migration
echo -e "${BLUE}📋 Running database schema...${NC}"
if [ -f "$PROJECT_ROOT/schema.sql" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$PROJECT_ROOT/schema.sql"
    print_status "Schema applied successfully"
else
    print_error "Schema file not found: $PROJECT_ROOT/schema.sql"
    exit 1
fi

# Run migrations
echo -e "${BLUE}🔄 Running migrations...${NC}"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            echo "  Running: $(basename "$migration")"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
        fi
    done
    print_status "Migrations completed"
else
    print_warning "No migrations directory found"
fi

# Ask about seed data
echo ""
echo -n "Do you want to load sample data? (y/N): "
read -r seed_response

if [[ "$seed_response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🌱 Loading seed data...${NC}"
    SEEDS_DIR="$PROJECT_ROOT/seeds"
    if [ -d "$SEEDS_DIR" ]; then
        for seed in "$SEEDS_DIR"/*.sql; do
            if [ -f "$seed" ]; then
                echo "  Loading: $(basename "$seed")"
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed"
            fi
        done
        print_status "Seed data loaded"
    else
        print_warning "No seeds directory found"
    fi
fi

# Verify installation
echo -e "${BLUE}🔍 Verifying installation...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
print_status "Database has $TABLE_COUNT tables"

USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
print_status "Database has $USER_COUNT users"

COURSE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM courses" 2>/dev/null || echo "0")
print_status "Database has $COURSE_COUNT courses"

# Success message
echo ""
echo -e "${GREEN}🎉 Database initialization completed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Connection Details:${NC}"
echo -e "   Host: $DB_HOST"
echo -e "   Port: $DB_PORT"
echo -e "   Database: $DB_NAME"
echo -e "   User: $DB_USER"
echo ""
echo -e "${BLUE}🔗 Connection String:${NC}"
echo -e "   postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

if [[ "$seed_response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}👤 Sample Login Credentials:${NC}"
    echo -e "   Admin: admin@doramaflix.com / admin123"
    echo -e "   Manager: manager@doramaflix.com / manager123"
    echo -e "   Student: student1@example.com / student123"
    echo ""
fi

echo -e "${GREEN}🚀 Ready to start development!${NC}"