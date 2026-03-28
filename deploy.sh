#!/bin/bash

# Node System Rebuild - Production Deployment Script
# Comprehensive deployment automation for the complete system

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.${ENVIRONMENT}"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found. Please create it first."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables from $ENV_FILE..."
    
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        success "Environment variables loaded"
    else
        error "Environment file $ENV_FILE not found"
        exit 1
    fi
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if MongoDB is running
    if docker ps | grep -q learnloop-mongodb; then
        log "Backing up MongoDB database..."
        docker exec learnloop-mongodb mongodump --out /tmp/backup
        docker cp learnloop-mongodb:/tmp/backup "$BACKUP_DIR/mongodb"
        success "Database backup created"
    else
        warning "MongoDB container not running, skipping database backup"
    fi
    
    # Backup application files
    log "Backing up application files..."
    tar -czf "$BACKUP_DIR/app_files.tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=logs \
        backend frontend
    
    success "Backup created at $BACKUP_DIR"
}

# Build images
build_images() {
    log "Building Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -f backend/Dockerfile.production -t learnloop-backend:latest backend/
    
    # Build frontend image with build args
    log "Building frontend image..."
    docker build -f frontend/Dockerfile.production \
        --build-arg VITE_API_URL="${VITE_API_URL:-https://api.learnloop.com/api}" \
        --build-arg VITE_WEBSOCKET_URL="${VITE_WEBSOCKET_URL:-https://api.learnloop.com}" \
        -t learnloop-frontend:latest frontend/
    
    success "Docker images built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    # Start services with health checks
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    success "Services deployed"
}

# Wait for services to be healthy
wait_for_health() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        # Check backend health
        if curl -f -s http://localhost:4000/api/health > /dev/null; then
            success "Backend is healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Services failed to become healthy within timeout"
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for MongoDB to be ready
    sleep 5
    
    # Run migrations if they exist
    if [ -f "backend/src/migrations/migrationRunner.js" ]; then
        docker exec learnloop-backend node src/migrations/migrationRunner.js
        success "Database migrations completed"
    else
        warning "No migrations found, skipping"
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all services are running
    local services=("learnloop-mongodb" "learnloop-redis" "learnloop-backend" "learnloop-frontend")
    
    for service in "${services[@]}"; do
        if docker ps | grep -q "$service"; then
            success "$service is running"
        else
            error "$service is not running"
            exit 1
        fi
    done
    
    # Check API endpoints
    log "Testing API endpoints..."
    
    # Basic health check
    if curl -f -s http://localhost:4000/api/health > /dev/null; then
        success "API health check passed"
    else
        error "API health check failed"
        exit 1
    fi
    
    # Detailed health check
    local health_response=$(curl -s http://localhost:4000/api/health/detailed)
    local health_status=$(echo "$health_response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    
    if [ "$health_status" = "healthy" ]; then
        success "Detailed health check passed"
    else
        warning "Detailed health check shows issues: $health_status"
    fi
    
    # Check frontend
    if curl -f -s http://localhost:3000/ > /dev/null; then
        success "Frontend is accessible"
    else
        error "Frontend is not accessible"
        exit 1
    fi
    
    success "Deployment verification completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this in production)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    
    # Show running containers
    echo "Running Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Show service URLs
    echo "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:4000/api"
    echo "  Health Check: http://localhost:4000/api/health"
    echo "  Detailed Health: http://localhost:4000/api/health/detailed"
    echo ""
    
    # Show logs command
    echo "To view logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f [service_name]"
    echo ""
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    # Restore from backup if available
    local latest_backup=$(ls -t backups/ | head -n1)
    if [ -n "$latest_backup" ]; then
        log "Restoring from backup: $latest_backup"
        
        # Restore database
        if [ -d "backups/$latest_backup/mongodb" ]; then
            # Start MongoDB
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mongodb
            sleep 10
            
            # Restore database
            docker cp "backups/$latest_backup/mongodb" learnloop-mongodb:/tmp/restore
            docker exec learnloop-mongodb mongorestore /tmp/restore
        fi
        
        success "Rollback completed"
    else
        error "No backup found for rollback"
        exit 1
    fi
}

# Main deployment function
main() {
    log "Starting Node System Rebuild deployment..."
    log "Environment: $ENVIRONMENT"
    
    case "${2:-deploy}" in
        "deploy")
            check_prerequisites
            load_environment
            create_backup
            build_images
            deploy_services
            wait_for_health
            run_migrations
            verify_deployment
            cleanup
            show_status
            success "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        "health")
            curl -s http://localhost:4000/api/health/detailed | jq .
            ;;
        *)
            echo "Usage: $0 [environment] [deploy|rollback|status|health]"
            echo "  environment: production (default)"
            echo "  action: deploy (default), rollback, status, health"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"