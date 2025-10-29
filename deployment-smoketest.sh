#!/bin/bash

# Pre-deployment verification script for Fractals Interactive Platform (modular)
set -e

# Source the utilities library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deployment-utils.sh"

main() {
    log_header "Fractals Platform - Pre-Deployment Smoke Test"
    
    # 1. Check all required tools exist
    if ! check_required_tools; then
        log_error "Missing required tools. Please install them and try again."
        exit 1
    fi
    
    # 2. Verify Google Cloud setup
    setup_gcloud
    
    # 3. Check authentication
    if ! check_authentication; then
        log_error "Not authenticated with Google Cloud. Run 'gcloud auth login'"
        exit 1
    fi
    
    # 4. Check project access
    if ! check_project_access; then
        log_error "Cannot access the configured project"
        exit 1
    fi
    
    # 5. Check billing
    log_section "Checking Billing Status"
    BILLING_STATUS=$(check_billing_status)
    if [ "$BILLING_STATUS" = "OK" ] || [ "$BILLING_STATUS" = "Free Trial" ]; then
        log_success "Billing: $BILLING_STATUS"
    else
        log_warning "Billing status: $BILLING_STATUS (Free trial - OK)"
    fi
    
    # 6. Check Docker
    log_section "Checking Docker"
    DOCKER_OK="false"
    if check_docker; then
        log_success "Docker is available"
        DOCKER_OK="true"
    else
        log_error "Docker is not available - container deployment requires Docker"
        exit 1
    fi
    
    # 7. Enable required APIs
    log_section "Enabling Required APIs"
    enable_apis \
        "compute.googleapis.com" \
        "run.googleapis.com" \
        "cloudbuild.googleapis.com" \
        "cloudfunctions.googleapis.com" \
        "cloudbilling.googleapis.com" \
        "iam.googleapis.com" \
        "serviceusage.googleapis.com"
    
    # 8. Check local dependencies
    log_section "Checking Local Dependencies"
    if [ -f "package.json" ]; then
        log_success "package.json found"
    else
        log_error "package.json not found"
        exit 1
    fi
    
    if [ -d "src" ]; then
        log_success "src directory found"
    else
        log_error "src directory not found"
        exit 1
    fi
    
    # 9. Find GPU availability
    log_section "Checking GPU Availability"
    if GPU_ZONE=$(find_gpu_zone); then
        log_success "GPU found in zone: $GPU_ZONE"
        GPU_STATUS="available"
    else
        log_warning "No GPU zones found - CPU-only deployment will be used"
        GPU_STATUS="unavailable"
    fi
    
    # 10. Print summary
    log_header "Smoke Test Summary"
    print_deployment_summary "$BILLING_STATUS" "$DOCKER_OK" "$GPU_ZONE"
    
    # 11. Final readiness check
    echo ""
    if [ "$GPU_STATUS" = "available" ]; then
        log_success "🚀 Ready for deployment with GPU acceleration!"
        echo "   Recommended zone: $GPU_ZONE"
        echo "   Run: ./deploy-complete.sh"
    else
        log_success "🚀 Ready for frontend deployment"
        echo "   GPU may need quota increase for heavy-mode rendering"
        echo "   Run: ./deploy-complete.sh"
    fi
    
    return 0
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi