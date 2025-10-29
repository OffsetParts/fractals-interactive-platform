#!/bin/bash

# ============================================================================
# Fractals Interactive Platform - Deployment Utilities Library
# Shared functions for all deployment scripts
# ============================================================================

set -e

# Configuration
export PROJECT_ID="fabled-orbit-476414-r1"
export REGION="us-east1"
export FRONTEND_SERVICE="fractals-frontend"
export GPU_SERVICE="fractals-gpu-server"

# Preferred zones (region-level, not availability zones)
export PREFERRED_ZONES=("us-east1" "us-east4" "us-south1" "us-west2" "us-central1")

# ============================================================================
# Logging Functions
# ============================================================================

log_header() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "════════════════════════════════════════════════════════════════"
}

log_section() {
    echo ""
    echo "📋 $1"
}

log_info() {
    echo "   ℹ️  $1"
}

log_success() {
    echo "   ✅ $1"
}

log_warning() {
    echo "   ⚠️  $1"
}

log_error() {
    echo "   ❌ $1"
}

# ============================================================================
# Google Cloud Setup Functions
# ============================================================================

setup_gcloud() {
    log_section "Setting up Google Cloud"
    
    gcloud config set project $PROJECT_ID
    log_success "Project set to: $PROJECT_ID"
}

enable_apis() {
    local apis=("$@")
    
    log_section "Enabling required APIs"
    
    for api in "${apis[@]}"; do
        echo -n "   Enabling $api... "
        gcloud services enable $api --quiet 2>/dev/null && echo "✅" || echo "⚠️ (may already be enabled)"
    done
}

# ============================================================================
# Authentication Functions
# ============================================================================

check_authentication() {
    log_section "Checking authentication"
    
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
        log_success "Authenticated as: $ACCOUNT"
        return 0
    else
        log_error "Not authenticated. Run: gcloud auth login"
        return 1
    fi
}

check_project_access() {
    log_section "Checking project access"
    
    if gcloud projects describe $PROJECT_ID > /dev/null 2>&1; then
        log_success "Project '$PROJECT_ID' accessible"
        return 0
    else
        log_error "Cannot access project '$PROJECT_ID'"
        return 1
    fi
}

# ============================================================================
# Billing Functions
# ============================================================================

check_billing_status() {
    log_section "Checking billing status"
    
    # Enable Cloud Billing API
    gcloud services enable cloudbilling.googleapis.com iam.googleapis.com serviceusage.googleapis.com --quiet 2>/dev/null || true
    
    # Try REST API approach
    BILLING_REST_RESULT=$(curl -s -X GET \
        -H "Authorization: Bearer $(gcloud auth print-access-token)" \
        -H "x-goog-user-project: $PROJECT_ID" \
        "https://cloudbilling.googleapis.com/v1/projects/$PROJECT_ID/billingInfo" 2>/dev/null || echo "error")
    
    if echo "$BILLING_REST_RESULT" | grep -q "billingAccountName"; then
        BILLING_ACCOUNT=$(echo "$BILLING_REST_RESULT" | grep -o '"billingAccountName":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$BILLING_ACCOUNT" ] && [ "$BILLING_ACCOUNT" != "null" ]; then
            log_success "Billing is enabled"
            log_info "Billing Account: $BILLING_ACCOUNT"
            echo "enabled"
        else
            log_warning "No billing account linked (free trial OK)"
            echo "free_trial"
        fi
    else
        log_warning "Cannot verify billing status via API"
        log_info "Please verify manually at: https://console.cloud.google.com/billing?project=$PROJECT_ID"
        echo "unknown"
    fi
}

# ============================================================================
# GPU Availability Functions
# ============================================================================

find_gpu_zone() {
    log_section "Finding GPU availability"
    
    local selected_zone=""
    
    for zone in "${PREFERRED_ZONES[@]}"; do
        echo -n "   Checking $zone... "
        
        GPU_RESULT=$(gcloud compute accelerator-types list \
            --filter="zone:$zone AND name=nvidia-tesla-t4" \
            --format="value(name)" \
            --project=$PROJECT_ID 2>/dev/null)
        
        if [ -n "$GPU_RESULT" ] && echo "$GPU_RESULT" | grep -q "nvidia-tesla-t4"; then
            echo "✅ T4 Available"
            selected_zone=$zone
            break
        else
            echo "❌ Not available"
        fi
    done
    
    if [ -n "$selected_zone" ]; then
        log_success "GPU available in zone: $selected_zone"
        echo "$selected_zone"
    else
        log_warning "No NVIDIA T4 GPUs found in preferred zones"
        log_info "You may need to request GPU quota increase"
        echo ""
    fi
}

# ============================================================================
# Docker Functions
# ============================================================================

check_docker() {
    log_section "Checking Docker"
    
    if command -v docker > /dev/null 2>&1 && docker info > /dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        log_success "Docker running: $DOCKER_VERSION"
        return 0
    else
        log_error "Docker not available. Start Docker Desktop"
        return 1
    fi
}

# ============================================================================
# Summary Functions
# ============================================================================

print_deployment_summary() {
    local billing_status=$1
    local docker_ok=$2
    local gpu_zone=$3
    
    log_header "Deployment Readiness Summary"
    
    echo "Project ID:        $PROJECT_ID"
    echo "Authentication:    ✅"
    echo "Project Access:    ✅"
    echo "Billing:           $([ "$billing_status" != "unknown" ] && echo "✅" || echo "⚠️")"
    echo "Docker:            $([ "$docker_ok" = "true" ] && echo "✅" || echo "❌")"
    echo "GPU Availability:  $([ -n "$gpu_zone" ] && echo "✅ ($gpu_zone)" || echo "⚠️")"
    
    echo ""
    
    if [ "$docker_ok" = "true" ] && [ -n "$gpu_zone" ]; then
        log_success "Ready for full deployment with GPU acceleration!"
        echo "   Run: ./deploy-complete.sh"
    elif [ "$docker_ok" = "true" ]; then
        log_success "Ready for frontend deployment"
        echo "   Run: ./deploy-complete.sh (GPU may need quota increase)"
    else
        log_error "Please address issues above before deploying"
    fi
}

# ============================================================================
# Error Handling
# ============================================================================

check_required_tools() {
    local required_tools=("gcloud" "curl" "docker")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool > /dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Export functions for use in other scripts
# ============================================================================

export -f log_header log_section log_info log_success log_warning log_error
export -f setup_gcloud enable_apis check_authentication check_project_access
export -f check_billing_status find_gpu_zone check_docker
export -f print_deployment_summary check_required_tools