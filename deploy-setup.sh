#!/bin/bash

# ============================================================================
# Fractals Interactive Platform - Unified Deployment Orchestrator
# All-in-one deployment coordination using modular utilities
# ============================================================================

set -e

# Source the utilities library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deployment-utils.sh"

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
    log_header "Fractals Interactive Platform - Deployment Setup"
    
    # 1. Check required tools
    if ! check_required_tools; then
        exit 1
    fi
    
    # 2. Set up Google Cloud
    setup_gcloud
    
    # 3. Check authentication
    if ! check_authentication; then
        exit 1
    fi
    
    # 4. Check project access
    if ! check_project_access; then
        exit 1
    fi
    
    # 5. Check billing
    BILLING_STATUS=$(check_billing_status)
    
    # 6. Enable required APIs
    enable_apis \
        "cloudbuild.googleapis.com" \
        "run.googleapis.com" \
        "compute.googleapis.com" \
        "cloudfunctions.googleapis.com" \
        "container.googleapis.com" \
        "artifactregistry.googleapis.com"
    
    # 7. Check Docker
    DOCKER_OK="true"
    if ! check_docker; then
        DOCKER_OK="false"
    fi
    
    # 8. Find GPU zone
    GPU_ZONE=$(find_gpu_zone)
    
    # 9. Print summary
    print_deployment_summary "$BILLING_STATUS" "$DOCKER_OK" "$GPU_ZONE"
    
    log_header "Setup Complete"
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi