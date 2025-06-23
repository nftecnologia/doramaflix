-- =============================================
-- DORAMAFLIX - MIGRATION SYSTEM SETUP
-- Created: 2025-01-01
-- Description: Initialize migration tracking system
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- MIGRATION TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rollback_sql TEXT,
    checksum VARCHAR(64)
);

-- =============================================
-- MIGRATION FUNCTIONS
-- =============================================

-- Function to check if migration has been applied
CREATE OR REPLACE FUNCTION migration_applied(migration_version VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM schema_migrations 
        WHERE version = migration_version
    );
END;
$$ LANGUAGE plpgsql;

-- Function to apply migration
CREATE OR REPLACE FUNCTION apply_migration(
    migration_version VARCHAR(255),
    migration_description TEXT DEFAULT NULL,
    rollback_statements TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if already applied
    IF migration_applied(migration_version) THEN
        RAISE NOTICE 'Migration % already applied, skipping', migration_version;
        RETURN FALSE;
    END IF;
    
    -- Record migration
    INSERT INTO schema_migrations (version, description, rollback_sql)
    VALUES (migration_version, migration_description, rollback_statements);
    
    RAISE NOTICE 'Applied migration: %', migration_version;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_migration(migration_version VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    rollback_sql TEXT;
BEGIN
    -- Get rollback SQL
    SELECT rollback_sql INTO rollback_sql 
    FROM schema_migrations 
    WHERE version = migration_version;
    
    IF rollback_sql IS NULL THEN
        RAISE EXCEPTION 'No rollback SQL found for migration %', migration_version;
    END IF;
    
    -- Execute rollback SQL
    EXECUTE rollback_sql;
    
    -- Remove migration record
    DELETE FROM schema_migrations WHERE version = migration_version;
    
    RAISE NOTICE 'Rolled back migration: %', migration_version;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get migration status
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE (
    version VARCHAR(255),
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    has_rollback BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.version,
        sm.description,
        sm.applied_at,
        (sm.rollback_sql IS NOT NULL) as has_rollback
    FROM schema_migrations sm
    ORDER BY sm.applied_at;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to create table if not exists
CREATE OR REPLACE FUNCTION create_table_if_not_exists(table_sql TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE table_sql;
    RETURN TRUE;
EXCEPTION 
    WHEN duplicate_table THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to add column if not exists
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name TEXT,
    column_name TEXT,
    column_definition TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = table_name AND column_name = column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to create index concurrently if not exists
CREATE OR REPLACE FUNCTION create_index_if_not_exists(
    index_name TEXT,
    table_name TEXT,
    index_definition TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = index_name
    ) THEN
        EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I %s', index_name, table_name, index_definition);
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BACKUP AND RESTORE FUNCTIONS
-- =============================================

-- Function to create schema backup
CREATE OR REPLACE FUNCTION create_schema_backup(backup_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    backup_timestamp TEXT;
    backup_table_name TEXT;
BEGIN
    backup_timestamp := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_table_name := COALESCE(backup_name, 'schema_backup_' || backup_timestamp);
    
    -- Create backup table with current schema info
    EXECUTE format('
        CREATE TABLE %I AS 
        SELECT 
            schemaname,
            tablename,
            tableowner,
            tablespace,
            hasindexes,
            hasrules,
            hastriggers,
            rowsecurity
        FROM pg_tables 
        WHERE schemaname = ''public''
    ', backup_table_name);
    
    RETURN backup_table_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- Function to analyze table performance
CREATE OR REPLACE FUNCTION analyze_table_performance(table_name TEXT)
RETURNS TABLE (
    table_size TEXT,
    index_size TEXT,
    total_size TEXT,
    estimated_rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_size_pretty(pg_total_relation_size(table_name::regclass) - pg_indexes_size(table_name::regclass)) as table_size,
        pg_size_pretty(pg_indexes_size(table_name::regclass)) as index_size,
        pg_size_pretty(pg_total_relation_size(table_name::regclass)) as total_size,
        (SELECT reltuples::BIGINT FROM pg_class WHERE relname = table_name) as estimated_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PARTITION MANAGEMENT
-- =============================================

-- Function to create monthly partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    start_date DATE
)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, table_name, start_date, end_date);
    
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to create yearly partition
CREATE OR REPLACE FUNCTION create_yearly_partition(
    table_name TEXT,
    start_date DATE
)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    end_date := start_date + INTERVAL '1 year';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, table_name, start_date, end_date);
    
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIALIZATION
-- =============================================

-- Record this migration system setup
DO $$
BEGIN
    IF NOT migration_applied('000_migration_system') THEN
        PERFORM apply_migration(
            '000_migration_system',
            'Initialize migration tracking system',
            'DROP TABLE schema_migrations CASCADE;'
        );
    END IF;
END $$;

-- Create initial admin user for migration tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_user') THEN
        CREATE ROLE migration_user WITH LOGIN PASSWORD 'secure_migration_pass';
        GRANT USAGE ON SCHEMA public TO migration_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON schema_migrations TO migration_user;
    END IF;
END $$;

-- Log initialization
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration system initialized successfully at %', NOW();
    RAISE NOTICE 'Use SELECT * FROM get_migration_status() to view applied migrations';
END $$;