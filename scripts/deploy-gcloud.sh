#!/bin/bash
# Complete Google Cloud deployment script

set -e

PROJECT_ID="your-project-id"
REGION="us-central1"
ZONE="us-central1-a"

echo "🚀 Deploying Fractals Platform to Google Cloud"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Set project
gcloud config set project $PROJECT_ID

echo "📦 Building and deploying frontend to Cloud Run..."

# Deploy frontend to Cloud Run
gcloud builds submit --config cloudbuild.yaml .

echo "🖥️ Setting up GPU Compute Engine instance..."

# Create GPU instance if it doesn't exist
if ! gcloud compute instances describe fractals-gpu-server --zone=$ZONE &>/dev/null; then
    gcloud compute instances create fractals-gpu-server \
        --zone=$ZONE \
        --machine-type=n1-standard-4 \
        --accelerator=type=nvidia-tesla-t4,count=1 \
        --image-family=ubuntu-2004-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size=100GB \
        --boot-disk-type=pd-ssd \
        --maintenance-policy=TERMINATE \
        --restart-on-failure \
        --metadata-from-file startup-script=scripts/startup-gpu.sh \
        --tags=fractals-gpu \
        --scopes=cloud-platform
    
    echo "✅ GPU instance created. Waiting for startup script to complete..."
    sleep 180  # Wait for instance to start and install dependencies
else
    echo "ℹ️ GPU instance already exists"
fi

# Create firewall rule for API access
if ! gcloud compute firewall-rules describe allow-fractals-api &>/dev/null; then
    gcloud compute firewall-rules create allow-fractals-api \
        --allow tcp:3001 \
        --source-ranges 0.0.0.0/0 \
        --target-tags fractals-gpu \
        --description "Allow access to Fractals API server"
fi

# Get instance IP
GPU_SERVER_IP=$(gcloud compute instances describe fractals-gpu-server \
    --zone=$ZONE \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "🔗 Setting up Cloud Storage buckets..."

# Create storage buckets
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$PROJECT_ID-fractals-presets || true
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$PROJECT_ID-fractals-renders || true

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-fractals-presets
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-fractals-renders

echo "⚡ Setting up Cloud Functions for WebRTC signaling..."

# Deploy WebRTC signaling function
gcloud functions deploy webrtc-signaling \
    --source=./functions/webrtc \
    --entry-point=handleSignaling \
    --runtime=nodejs18 \
    --trigger=http \
    --allow-unauthenticated \
    --memory=256MB \
    --timeout=60s

echo "📊 Setting up monitoring and logging..."

# Create monitoring dashboard
gcloud logging sinks create fractals-logs \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/fractals_logs \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="fractals-frontend"'

echo "🎯 Deployment Summary:"
echo "======================================"
echo "Frontend URL: https://fractals-frontend-xxx-uc.a.run.app"
echo "GPU Server IP: $GPU_SERVER_IP:3001"
echo "WebRTC Function: https://$REGION-$PROJECT_ID.cloudfunctions.net/webrtc-signaling"
echo "Storage Buckets:"
echo "  - gs://$PROJECT_ID-fractals-presets"
echo "  - gs://$PROJECT_ID-fractals-renders"
echo ""
echo "🔧 Next Steps:"
echo "1. Update frontend environment variables with GPU server IP"
echo "2. Test WebGPU fallback on client devices"
echo "3. Configure domain name and SSL certificate"
echo "4. Set up monitoring alerts"
echo ""
echo "✅ Deployment complete!"