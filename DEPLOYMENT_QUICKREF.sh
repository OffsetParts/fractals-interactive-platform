#!/bin/bash

# ============================================================================
# Quick Reference - Deployment Utilities Library
# ============================================================================

# USAGE: Source this file in any deployment script
#   source ./lib/deployment-utils.sh

# ============================================================================
# LOGGING FUNCTIONS - Use these for consistent output
# ============================================================================

# Print large section header
log_header "Section Title"

# Print subsection header  
log_section "Subsection"

# Print success message (green ✅)
log_success "Operation completed"

# Print warning message (yellow ⚠️)
log_warning "Something to note"

# Print error message (red ❌)
log_error "Something went wrong"

# ============================================================================
# SETUP FUNCTIONS - Initialize Google Cloud environment
# ============================================================================

# Initialize gcloud and set project
setup_gcloud
# Sets PROJECT_ID, REGION, enables APIs

# Check if user is authenticated
if ! check_authentication; then
    log_error "Not authenticated"
    exit 1
fi

# Check if project is accessible
if ! check_project_access; then
    log_error "Cannot access project"
    exit 1
fi

# Enable one or more APIs
enable_apis "compute.googleapis.com" "run.googleapis.com" "cloudbuild.googleapis.com"

# ============================================================================
# VERIFICATION FUNCTIONS - Check prerequisites
# ============================================================================

# Check billing status
BILLING_STATUS=$(check_billing_status)
# Returns: "OK", "Free Trial", or error description

# Check Docker is available
if ! check_docker; then
    log_error "Docker not available"
    exit 1
fi

# Check all required tools are installed
if ! check_required_tools; then
    log_error "Missing required tools"
    exit 1
fi

# ============================================================================
# GPU DISCOVERY - Find available GPU zones
# ============================================================================

# Find zone with available NVIDIA T4 GPUs
GPU_ZONE=$(find_gpu_zone)
# Returns: Zone name (e.g., "us-east1") or empty if not found

if [ -z "$GPU_ZONE" ]; then
    log_warning "No GPUs found"
else
    log_success "GPU available in: $GPU_ZONE"
fi

# ============================================================================
# REPORTING - Display deployment status
# ============================================================================

# Print unified deployment summary
print_deployment_summary "Free Trial" "true" "us-east1"
# Params: billing_status, docker_ok, gpu_zone

# ============================================================================
# EXPORTED VARIABLES - Available after sourcing
# ============================================================================

echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Preferred zones: ${PREFERRED_ZONES[@]}"

# ============================================================================
# COMMON PATTERNS
# ============================================================================

# Pattern 1: Pre-flight checks
main() {
    if ! check_required_tools; then
        exit 1
    fi
    
    setup_gcloud
    
    if ! check_authentication; then
        exit 1
    fi
    
    if ! check_project_access; then
        exit 1
    fi
    
    log_section "Deployment ready"
}

# Pattern 2: Full deployment sequence
deploy() {
    log_header "Starting Deployment"
    
    # Check prerequisites
    setup_gcloud
    check_authentication || exit 1
    check_docker || exit 1
    
    # Enable services
    log_section "Enabling APIs"
    enable_apis "compute.googleapis.com" "run.googleapis.com"
    
    # Find GPU
    log_section "Finding GPU"
    GPU_ZONE=$(find_gpu_zone) || log_warning "No GPU found"
    
    # Deploy
    log_section "Deploying..."
    # ... your deployment code ...
    
    log_success "Deployment complete!"
}

# Pattern 3: Error handling
do_something() {
    if ! some_command; then
        log_error "Failed"
        return 1
    fi
    log_success "Done"
}

# ============================================================================
# EXTENDING THE LIBRARY
# ============================================================================

# To add a new utility function:
# 1. Open: lib/deployment-utils.sh
# 2. Add your function with log_header/log_section calls
# 3. Export it: export -f my_function
# 4. Document it here in this quick reference

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# If functions not found:
# - Ensure you sourced the file: source ./lib/deployment-utils.sh
# - Check file exists: ls -la lib/deployment-utils.sh
# - Verify you're in correct directory

# If gcloud commands fail:
# - Check authentication: gcloud auth list
# - Check project set: gcloud config get-value project
# - Run setup_gcloud to reinitialize

# If GPU not found:
# - GPU may have quota limits
# - Try different zones via PREFERRED_ZONES
# - Check quota: https://console.cloud.google.com/iam-admin/quotas

# ============================================================================
# RUNNING EXISTING SCRIPTS
# ============================================================================

# Smoke test - verifies deployment readiness
./deployment-smoketest.sh

# Setup - initializes environment
./deploy-setup.sh

# Full deployment - deploys entire platform
./deploy-complete.sh

# ============================================================================
