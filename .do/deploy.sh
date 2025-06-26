#!/bin/bash

# DoramaFlix - DigitalOcean App Platform Deploy Script
# This script helps deploy the DoramaFlix application to DigitalOcean App Platform

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if doctl is installed
    if ! command_exists doctl; then
        print_error "doctl CLI is not installed"
        print_status "Please install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi
    
    # Check if user is authenticated
    if ! doctl auth list > /dev/null 2>&1; then
        print_error "doctl is not authenticated"
        print_status "Please run: doctl auth init"
        exit 1
    fi
    
    # Check if app.yaml exists
    if [ ! -f ".do/app.yaml" ]; then
        print_error "app.yaml not found in .do/ directory"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate app.yaml
validate_spec() {
    print_status "Validating app specification..."
    
    # Basic validation - check if required fields exist
    if ! grep -q "name: doramaflix" .do/app.yaml; then
        print_error "App name not found in app.yaml"
        exit 1
    fi
    
    if ! grep -q "region: nyc3" .do/app.yaml; then
        print_error "Region not found in app.yaml"
        exit 1
    fi
    
    print_success "App specification validated"
}

# Function to create app
create_app() {
    print_status "Creating app on DigitalOcean App Platform..."
    
    # Try to create the app
    if doctl apps create --spec .do/app.yaml --format ID --no-header > /tmp/app_id.txt 2>/dev/null; then
        APP_ID=$(cat /tmp/app_id.txt)
        print_success "App created successfully with ID: $APP_ID"
        echo "$APP_ID" > .do/app_id.txt
        return 0
    else
        print_error "Failed to create app"
        return 1
    fi
}

# Function to update existing app
update_app() {
    if [ ! -f ".do/app_id.txt" ]; then
        print_error "App ID not found. Cannot update app."
        print_status "Please run with --create flag to create a new app"
        exit 1
    fi
    
    APP_ID=$(cat .do/app_id.txt)
    print_status "Updating app $APP_ID..."
    
    if doctl apps update "$APP_ID" --spec .do/app.yaml; then
        print_success "App updated successfully"
        return 0
    else
        print_error "Failed to update app"
        return 1
    fi
}

# Function to get app info
get_app_info() {
    if [ ! -f ".do/app_id.txt" ]; then
        print_error "App ID not found"
        exit 1
    fi
    
    APP_ID=$(cat .do/app_id.txt)
    print_status "Getting app information..."
    
    doctl apps get "$APP_ID"
}

# Function to get app logs
get_app_logs() {
    if [ ! -f ".do/app_id.txt" ]; then
        print_error "App ID not found"
        exit 1
    fi
    
    APP_ID=$(cat .do/app_id.txt)
    COMPONENT=${1:-frontend}
    
    print_status "Getting logs for component: $COMPONENT"
    doctl apps logs "$APP_ID" --component="$COMPONENT" --follow
}

# Function to list deployments
list_deployments() {
    if [ ! -f ".do/app_id.txt" ]; then
        print_error "App ID not found"
        exit 1
    fi
    
    APP_ID=$(cat .do/app_id.txt)
    print_status "Listing deployments..."
    
    doctl apps list-deployments "$APP_ID"
}

# Function to delete app
delete_app() {
    if [ ! -f ".do/app_id.txt" ]; then
        print_error "App ID not found"
        exit 1
    fi
    
    APP_ID=$(cat .do/app_id.txt)
    
    print_warning "This will permanently delete the app and all its data!"
    read -p "Are you sure you want to delete app $APP_ID? (yes/no): " -r
    
    if [[ $REPLY =~ ^[Yy]es$ ]]; then
        print_status "Deleting app $APP_ID..."
        
        if doctl apps delete "$APP_ID" --force; then
            print_success "App deleted successfully"
            rm -f .do/app_id.txt
        else
            print_error "Failed to delete app"
            exit 1
        fi
    else
        print_status "App deletion cancelled"
    fi
}

# Function to show help
show_help() {
    echo "DoramaFlix - DigitalOcean App Platform Deploy Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  create     Create a new app"
    echo "  update     Update existing app"
    echo "  info       Get app information"
    echo "  logs       Get app logs (specify component: frontend, backend, video-processor)"
    echo "  deploy     List deployments"
    echo "  delete     Delete the app"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create                    # Create new app"
    echo "  $0 update                    # Update existing app"
    echo "  $0 logs frontend             # Get frontend logs"
    echo "  $0 logs backend              # Get backend logs"
    echo ""
    echo "Prerequisites:"
    echo "  - doctl CLI installed and authenticated"
    echo "  - app.yaml file in .do/ directory"
    echo "  - All required environment variables configured"
    echo ""
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create .do directory if it doesn't exist
    mkdir -p .do
    
    # Copy env.example if .env doesn't exist
    if [ ! -f ".env" ] && [ -f ".do/env.example" ]; then
        print_status "Creating .env file from template..."
        cp .do/env.example .env
        print_warning "Please edit .env file and configure all required variables"
    fi
    
    print_success "Environment setup complete"
}

# Main script logic
main() {
    case "${1:-help}" in
        "create")
            check_prerequisites
            validate_spec
            create_app
            print_status "Deployment started. Check the DigitalOcean console for progress."
            ;;
        "update")
            check_prerequisites
            validate_spec
            update_app
            print_status "Update deployed. Check the DigitalOcean console for progress."
            ;;
        "info")
            check_prerequisites
            get_app_info
            ;;
        "logs")
            check_prerequisites
            get_app_logs "$2"
            ;;
        "deploy"|"deployments")
            check_prerequisites
            list_deployments
            ;;
        "delete")
            check_prerequisites
            delete_app
            ;;
        "setup")
            setup_environment
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"