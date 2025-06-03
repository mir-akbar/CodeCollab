#!/bin/bash

# Session Management Migration Execution Script
# This script guides you through the complete migration process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_DIR="./api"
MIGRATION_LOG="./migration.log"

# Helper functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$MIGRATION_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$MIGRATION_LOG"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$MIGRATION_LOG"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$MIGRATION_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -d "$API_DIR" ]; then
        error "API directory not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check if required files exist
    local required_files=(
        "$API_DIR/scripts/migrate-sessions.js"
        "$API_DIR/scripts/test-migration.js"
        "$API_DIR/services/sessionMigrationService.js"
        "$API_DIR/services/sessionService.js"
        "$API_DIR/models/Session.js"
        "$API_DIR/models/SessionParticipant.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Required file not found: $file"
            exit 1
        fi
    done
    
    log "Prerequisites check passed ✅"
}

# Install dependencies
install_dependencies() {
    log "Installing/updating dependencies..."
    
    cd "$API_DIR"
    
    # Check if uuid is installed (required for new session IDs)
    if ! npm list uuid &> /dev/null; then
        info "Installing uuid package..."
        npm install uuid
    fi
    
    cd ..
    log "Dependencies ready ✅"
}

# Backup database
backup_database() {
    log "Creating database backup..."
    
    # Load environment variables from API directory
    cd "$API_DIR"
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    cd ..
    
    # Get MongoDB URI from environment
    local mongodb_uri="${MONGODB_URI}"
    local backup_dir="./backups/$(date '+%Y%m%d_%H%M%S')"
    
    mkdir -p "$backup_dir"
    
    # Extract database name from URI
    local db_name=$(echo "$mongodb_uri" | sed 's/.*\///' | sed 's/\?.*//')
    
    info "Backing up database: $db_name"
    
    # Use mongodump if available
    if command -v mongodump &> /dev/null; then
        mongodump --uri="$mongodb_uri" --out="$backup_dir" 2>> "$MIGRATION_LOG"
        log "Database backup created at: $backup_dir ✅"
        echo "$backup_dir" > .last_backup_path
    else
        warn "mongodump not available. Backup skipped."
        warn "Please ensure you have a recent database backup before proceeding."
        
        echo -n "Do you want to continue without backup? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            error "Migration cancelled by user"
            exit 1
        fi
    fi
}

# Run migration dry run
run_dry_run() {
    log "Running migration dry run..."
    
    cd "$API_DIR"
    
    if node scripts/migrate-sessions.js --dry-run 2>> "../$MIGRATION_LOG"; then
        log "Dry run completed successfully ✅"
    else
        error "Dry run failed. Please check the logs."
        cd ..
        exit 1
    fi
    
    cd ..
}

# Run actual migration
run_migration() {
    log "Running actual migration..."
    
    cd "$API_DIR"
    
    if node scripts/migrate-sessions.js 2>> "../$MIGRATION_LOG"; then
        log "Migration completed successfully ✅"
    else
        error "Migration failed. Please check the logs."
        cd ..
        exit 1
    fi
    
    cd ..
}

# Run migration tests
run_tests() {
    log "Running migration validation tests..."
    
    cd "$API_DIR"
    
    if node scripts/test-migration.js 2>> "../$MIGRATION_LOG"; then
        log "Migration tests passed ✅"
    else
        error "Migration tests failed. Please check the logs."
        cd ..
        exit 1
    fi
    
    cd ..
}

# Switch to new system
switch_to_new_system() {
    log "Switching to new session system..."
    
    # Set environment variable
    echo "USE_NEW_SESSION_SYSTEM=true" >> "$API_DIR/.env"
    
    # Also try to switch via API if server is running
    info "Attempting to switch via API..."
    if curl -s -X POST http://localhost:5000/session/enable-new-system > /dev/null 2>&1; then
        log "API switch successful ✅"
    else
        warn "API switch failed (server may not be running). Environment variable set."
    fi
    
    log "New session system enabled ✅"
}

# Verify new system
verify_new_system() {
    log "Verifying new system functionality..."
    
    # Check if server is running and responding
    if curl -s http://localhost:5000/session/health > /dev/null 2>&1; then
        local health_response=$(curl -s http://localhost:5000/session/health)
        local system_type=$(echo "$health_response" | grep -o '"system":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$system_type" = "new" ]; then
            log "New system is active and responding ✅"
        else
            warn "System reports as: $system_type (expected: new)"
        fi
    else
        warn "Server health check failed (server may not be running)"
    fi
}

# Show migration summary
show_summary() {
    log "Migration Summary"
    echo "=================="
    echo
    
    # Read migration results from log
    local total_sessions=$(grep -o "Migration complete: [0-9]*/[0-9]*" "$MIGRATION_LOG" | tail -1 | cut -d' ' -f3)
    
    if [ -n "$total_sessions" ]; then
        echo "📊 Sessions migrated: $total_sessions"
    fi
    
    echo "📅 Migration completed: $(date)"
    echo "📄 Migration log: $MIGRATION_LOG"
    
    if [ -f ".last_backup_path" ]; then
        local backup_path=$(cat .last_backup_path)
        echo "💾 Database backup: $backup_path"
    fi
    
    echo
    echo "✅ Session management migration completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Test the new session system thoroughly"
    echo "2. Update frontend components to use new APIs"
    echo "3. Monitor system performance"
    echo "4. Remove legacy code after validation period"
    echo
}

# Rollback function
rollback_migration() {
    warn "Rolling back migration..."
    
    cd "$API_DIR"
    
    # Remove environment variable
    sed -i.bak '/USE_NEW_SESSION_SYSTEM=true/d' .env 2>/dev/null || true
    
    # Rollback database changes
    if node scripts/migrate-sessions.js --rollback 2>> "../$MIGRATION_LOG"; then
        log "Database rollback completed ✅"
    else
        error "Database rollback failed"
    fi
    
    # Switch back to legacy system via API
    if curl -s -X POST http://localhost:5000/session/enable-legacy-system > /dev/null 2>&1; then
        log "API rollback successful ✅"
    else
        warn "API rollback failed (server may not be running)"
    fi
    
    cd ..
    log "Rollback completed ✅"
}

# Main execution
main() {
    echo
    log "🚀 Starting Session Management Migration"
    echo "========================================"
    echo
    
    # Parse command line arguments
    case "${1:-}" in
        "--rollback")
            rollback_migration
            exit 0
            ;;
        "--help"|"-h")
            echo "Usage: $0 [--rollback|--help]"
            echo
            echo "Options:"
            echo "  --rollback    Rollback the migration"
            echo "  --help        Show this help message"
            echo
            echo "Normal execution runs the complete migration process."
            exit 0
            ;;
    esac
    
    # Confirmation prompt
    echo "This will migrate your session management system from the legacy"
    echo "model to the new normalized model."
    echo
    echo -n "Do you want to proceed? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Migration cancelled by user"
        exit 0
    fi
    
    # Execute migration steps
    check_prerequisites
    install_dependencies
    backup_database
    run_dry_run
    
    # Final confirmation before actual migration
    echo
    warn "About to run the actual migration. This will modify your database."
    echo -n "Continue? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Migration cancelled by user"
        exit 0
    fi
    
    run_migration
    run_tests
    switch_to_new_system
    verify_new_system
    show_summary
    
    log "🎉 Migration completed successfully!"
}

# Handle script interruption
trap 'error "Migration interrupted"; exit 1' INT TERM

# Execute main function
main "$@"
