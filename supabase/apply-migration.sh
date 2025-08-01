#!/bin/bash

# Supabase Migration Application Script
# This script helps apply migrations to both local and remote Supabase instances

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Supabase CLI is installed
check_supabase_cli() {
    if ! command_exists supabase; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "  npm install -g supabase"
        echo "  or visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    
    SUPABASE_VERSION=$(supabase --version)
    print_success "Supabase CLI found: $SUPABASE_VERSION"
}

# Function to check if we're in a Supabase project
check_supabase_project() {
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory. Please run this script from the project root."
        exit 1
    fi
    print_success "Supabase project detected"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [TARGET]"
    echo ""
    echo "TARGET:"
    echo "  local     Apply migrations to local Supabase instance"
    echo "  remote    Apply migrations to remote Supabase instance"
    echo "  both      Apply migrations to both local and remote"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help          Show this help message"
    echo "  -f, --force         Force apply without confirmation"
    echo "  -v, --verbose       Enable verbose output"
    echo "  -d, --dry-run       Show what would be applied without actually applying"
    echo "  -r, --reset         Reset database before applying migrations (local only)"
    echo "  -s, --start         Start local Supabase instance before applying"
    echo ""
    echo "Examples:"
    echo "  $0 local            # Apply to local instance"
    echo "  $0 remote           # Apply to remote instance"
    echo "  $0 both -f          # Apply to both without confirmation"
    echo "  $0 local -r -s      # Reset and start local, then apply"
}

# Function to start local Supabase instance
start_local_supabase() {
    print_status "Starting local Supabase instance..."
    
    # Check if Supabase is already running
    if supabase status | grep -q "API URL: http://127.0.0.1:54321"; then
        print_warning "Local Supabase instance is already running"
        return 0
    fi
    
    supabase start
    print_success "Local Supabase instance started"
}

# Function to stop local Supabase instance
stop_local_supabase() {
    print_status "Stopping local Supabase instance..."
    supabase stop
    print_success "Local Supabase instance stopped"
}

# Function to reset local database
reset_local_database() {
    print_warning "This will reset your local database and all data will be lost!"
    if [ "$FORCE" != "true" ]; then
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Database reset cancelled"
            return 1
        fi
    fi
    
    print_status "Resetting local database..."
    supabase db reset
    print_success "Local database reset completed"
}

# Function to apply migrations to local instance
apply_local_migrations() {
    print_status "Applying migrations to local instance..."
    
    if [ "$START_LOCAL" = "true" ]; then
        start_local_supabase
    fi
    
    if [ "$RESET_DB" = "true" ]; then
        reset_local_database
    fi
    
    if [ "$DRY_RUN" = "true" ]; then
        print_status "DRY RUN: Would apply migrations to local instance"
        supabase db diff --schema public
        return 0
    fi
    
    # Apply migrations
    supabase db push
    print_success "Migrations applied to local instance successfully"
    
    # Show status
    print_status "Local instance status:"
    supabase status
}

# Function to apply migrations to remote instance
apply_remote_migrations() {
    print_status "Applying migrations to remote instance..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_status "DRY RUN: Would apply migrations to remote instance"
        supabase db diff --schema public --linked
        return 0
    fi
    
    # Check if project is linked
    if ! supabase projects list | grep -q "$(supabase projects list | grep -o '[a-z0-9]\{20,\}' | head -1)"; then
        print_error "Project not linked. Please run 'supabase link --project-ref YOUR_PROJECT_REF' first"
        exit 1
    fi
    
    # Apply migrations
    supabase db push --linked
    print_success "Migrations applied to remote instance successfully"
}

# Function to check migration status
check_migration_status() {
    print_status "Checking migration status..."
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Local migrations:"
        supabase migration list
        
        echo ""
        echo "Remote migrations:"
        supabase migration list --linked
    fi
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment..."
    
    # Check if we're in the right directory
    check_supabase_project
    
    # Check if Supabase CLI is installed
    check_supabase_cli
    
    # Check for required environment variables for remote
    if [ "$TARGET" = "remote" ] || [ "$TARGET" = "both" ]; then
        if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
            print_warning "SUPABASE_ACCESS_TOKEN not set. You may need to run 'supabase login'"
        fi
    fi
    
    print_success "Environment validation completed"
}

# Function to cleanup on exit
cleanup() {
    if [ "$STARTED_LOCAL" = "true" ] && [ "$KEEP_RUNNING" != "true" ]; then
        stop_local_supabase
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Parse command line arguments
TARGET=""
FORCE="false"
VERBOSE="false"
DRY_RUN="false"
RESET_DB="false"
START_LOCAL="false"
KEEP_RUNNING="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        local|remote|both)
            TARGET="$1"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -f|--force)
            FORCE="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -r|--reset)
            RESET_DB="true"
            shift
            ;;
        -s|--start)
            START_LOCAL="true"
            shift
            ;;
        -k|--keep-running)
            KEEP_RUNNING="true"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if target is specified
if [ -z "$TARGET" ]; then
    print_error "Please specify a target: local, remote, or both"
    show_usage
    exit 1
fi

# Main execution
main() {
    print_status "Starting Supabase migration application..."
    print_status "Target: $TARGET"
    print_status "Force: $FORCE"
    print_status "Verbose: $VERBOSE"
    print_status "Dry run: $DRY_RUN"
    
    # Validate environment
    validate_environment
    
    # Apply migrations based on target
    case $TARGET in
        local)
            apply_local_migrations
            ;;
        remote)
            apply_remote_migrations
            ;;
        both)
            print_status "Applying migrations to both local and remote instances..."
            apply_local_migrations
            echo ""
            apply_remote_migrations
            ;;
    esac
    
    # Check migration status if verbose
    if [ "$VERBOSE" = "true" ]; then
        echo ""
        check_migration_status
    fi
    
    print_success "Migration application completed successfully!"
    
    # Show helpful information
    if [ "$TARGET" = "local" ] || [ "$TARGET" = "both" ]; then
        echo ""
        print_status "Local instance information:"
        echo "  API URL: http://127.0.0.1:54321"
        echo "  Studio URL: http://127.0.0.1:54323"
        echo "  Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    fi
}

# Run main function
main "$@" 