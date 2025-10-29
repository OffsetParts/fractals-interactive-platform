#!/bin/bash

# Complete Google Cloud Platform deployment script for Fractals Interactive Platform
# This script deploys the entire platform including frontend, GPU server, and WebRTC functions
# Uses modular utilities from lib/deployment-utils.sh

set -e

# Source the utilities library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/deployment-utils.sh"

# Configuration variables
FRONTEND_SERVICE="fractals-frontend"
GPU_SERVICE="fractals-gpu-server"

# ============================================================================
# Main Deployment Functions
# ============================================================================

deploy_artifact_registry() {
    log_section "Creating Artifact Registry"
    gcloud artifacts repositories create fractals-repo \
      --repository-format=docker \
      --location=$REGION \
      --description="Fractals platform container images" || \
      log_warning "Artifact Registry repository may already exist"
    log_success "Artifact Registry ready"
}

deploy_frontend() {
    log_section "Building and Deploying Frontend"
    
    if [ ! -f "docker/Dockerfile.frontend" ]; then
        log_error "Frontend Dockerfile not found at docker/Dockerfile.frontend"
        return 1
    fi
    
    log_header "Building frontend Docker image..."
    docker build -t gcr.io/$PROJECT_ID/fractals-frontend:latest \
        -f docker/Dockerfile.frontend . || {
        log_error "Frontend build failed"
        return 1
    }
    
    log_header "Pushing frontend image to registry..."
    docker push gcr.io/$PROJECT_ID/fractals-frontend:latest
    
    log_header "Deploying frontend to Cloud Run..."
    gcloud run deploy $FRONTEND_SERVICE \
      --image gcr.io/$PROJECT_ID/fractals-frontend:latest \
      --platform managed \
      --region $REGION \
      --allow-unauthenticated \
      --memory 2Gi \
      --cpu 2 \
      --concurrency 1000 \
      --max-instances 10 \
      --set-env-vars="NODE_ENV=production" || {
        log_error "Frontend deployment failed"
        return 1
    }
    
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
        --region=$REGION --format="value(status.url)")
    log_success "Frontend deployed: $FRONTEND_URL"
}

deploy_webrtc_signaling() {
    log_section "Deploying WebRTC Signaling Function"
    
    if [ ! -d "functions/webrtc" ]; then
        log_error "WebRTC functions directory not found"
        return 1
    fi
    
    cd functions/webrtc
    gcloud functions deploy webrtc-signaling \
      --runtime nodejs18 \
      --trigger-http \
      --allow-unauthenticated \
      --memory 512MB \
      --timeout 60s \
      --region $REGION \
      --entry-point handleSignaling || {
        log_error "WebRTC deployment failed"
        cd ../..
        return 1
    }
    cd ../..
    
    WEBRTC_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/webrtc-signaling"
    log_success "WebRTC signaling deployed: $WEBRTC_URL"
}

deploy_gpu_server() {
    log_section "Creating GPU Server Instance"
    
    # Find GPU zone
    if ! GPU_ZONE=$(find_gpu_zone); then
        log_warning "No NVIDIA T4 GPUs found, falling back to us-east1"
        GPU_ZONE="us-east1"
    fi
    
    log_header "Creating GPU instance in $GPU_ZONE..."
    
    if [ ! -f "deploy/startup-gpu.sh" ]; then
        log_warning "startup-gpu.sh not found, will create instance without startup script"
        START_SCRIPT_FLAG=""
    else
        START_SCRIPT_FLAG="--metadata-from-file startup-script=deploy/startup-gpu.sh"
    fi
    
    gcloud compute instances create $GPU_SERVICE \
      --zone=$GPU_ZONE \
      --machine-type=n1-standard-4 \
      --accelerator=type=nvidia-tesla-t4,count=1 \
      --image-family=ubuntu-2004-lts \
      --image-project=ubuntu-os-cloud \
      --boot-disk-size=50GB \
      --boot-disk-type=pd-ssd \
      --maintenance-policy=TERMINATE \
      $START_SCRIPT_FLAG \
      --tags=gpu-server,http-server,https-server \
      --scopes=cloud-platform || \
      log_warning "GPU instance may already exist"
    
    log_success "GPU server instance created/verified in $GPU_ZONE"
}

setup_firewall() {
    log_section "Setting up Firewall Rules"
    
    gcloud compute firewall-rules create allow-gpu-server \
      --allow tcp:3001,tcp:80,tcp:443 \
      --source-ranges 0.0.0.0/0 \
      --target-tags gpu-server \
      --description "Allow HTTP/HTTPS and GPU server API access" || \
      log_warning "Firewall rule may already exist"
    
    log_success "Firewall rules configured"
}

get_gpu_server_ip() {
    log_section "Getting GPU Server IP"
    
    GPU_SERVER_IP=$(gcloud compute instances describe $GPU_SERVICE \
      --zone=$GPU_ZONE \
      --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    
    if [ -z "$GPU_SERVER_IP" ]; then
        log_error "Could not retrieve GPU server IP"
        return 1
    fi
    
    log_success "GPU server IP: $GPU_SERVER_IP"
}

deploy_gpu_application() {
    log_section "Deploying GPU Server Application"
    
    log_header "Waiting for instance to be fully ready..."
    sleep 30
    
    log_header "Copying server files to GPU instance..."
    gcloud compute scp --zone=$GPU_ZONE --recurse \
      src/server/ $GPU_SERVICE:~/server/ || {
        log_error "Failed to copy server files"
        return 1
    }
    
    log_header "Installing dependencies and starting service..."
    gcloud compute ssh $GPU_SERVICE --zone=$GPU_ZONE --command="
        cd ~/server &&
        npm install &&
        sudo systemctl restart fractals-gpu-service
    " || log_warning "GPU service installation may need manual verification"
    
    log_success "GPU server application deployed"
}

update_frontend_endpoints() {
    log_section "Updating Frontend with Production Endpoints"
    
    WEBRTC_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/webrtc-signaling"
    CUDA_SERVER_URL="http://$GPU_SERVER_IP:3001"
    
    gcloud run services update $FRONTEND_SERVICE \
      --region $REGION \
      --set-env-vars="WEBRTC_SIGNALING_URL=$WEBRTC_URL,CUDA_SERVER_URL=$CUDA_SERVER_URL" || {
        log_error "Failed to update frontend environment"
        return 1
    }
    
    log_success "Frontend endpoints updated"
}

# ============================================================================
# Main Deployment Orchestration
# ============================================================================

main() {
    log_header "Fractals Interactive Platform - Complete Deployment"
    
    # Pre-deployment checks
    if ! check_required_tools; then
        log_error "Missing required tools"
        exit 1
    fi
    
    setup_gcloud
    
    if ! check_authentication; then
        log_error "Not authenticated"
        exit 1
    fi
    
    if ! check_project_access; then
        log_error "Cannot access project"
        exit 1
    fi
    
    # Check billing
    BILLING_STATUS=$(check_billing_status)
    log_section "Billing Status: $BILLING_STATUS"
    
    if ! check_docker; then
        log_error "Docker is required for this deployment"
        exit 1
    fi
    
    # Enable APIs
    log_section "Enabling Google Cloud Services"
    enable_apis \
        "cloudbuild.googleapis.com" \
        "run.googleapis.com" \
        "compute.googleapis.com" \
        "cloudfunctions.googleapis.com" \
        "container.googleapis.com" \
        "artifactregistry.googleapis.com" \
        "cloudbilling.googleapis.com" \
        "iam.googleapis.com" \
        "serviceusage.googleapis.com"
    
    # Execute deployment steps
    deploy_artifact_registry
    deploy_frontend
    deploy_webrtc_signaling
    deploy_gpu_server
    setup_firewall
    get_gpu_server_ip
    deploy_gpu_application
    update_frontend_endpoints
    
    # Final summary
    log_header "Deployment Summary"
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
        --region=$REGION --format="value(status.url)")
    WEBRTC_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/webrtc-signaling"
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "================================"
    echo "Frontend URL: $FRONTEND_URL"
    echo "WebRTC Signaling: $WEBRTC_URL"
    echo "GPU Server: http://$GPU_SERVER_IP:3001"
    echo "GPU Server Zone: $GPU_ZONE"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs: gcloud run logs tail $FRONTEND_SERVICE --region=$REGION"
    echo "  Scale up: gcloud run services update $FRONTEND_SERVICE --region=$REGION --max-instances=20"
    echo "  Monitor GPU: gcloud compute ssh $GPU_SERVICE --zone=$GPU_ZONE --command='nvidia-smi'"
    echo ""
    echo "� Next Steps:"
    echo "  1. Test at: $FRONTEND_URL"
    echo "  2. Create a classroom session"
    echo "  3. Test GPU rendering in heavy mode"
    echo "  4. Set up monitoring and alerting"
    echo ""
    echo "🚀 Your Fractals Platform is live!"
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi


