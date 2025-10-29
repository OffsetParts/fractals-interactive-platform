#!/bin/bash

# GPU Zone Availability Checker
PROJECT_ID="fabled-orbit-476414-r1"

echo "🔍 Checking GPU availability across zones..."
echo "============================================="

# Set project and enable Compute Engine API
echo "📋 Setting up project and enabling APIs..."
gcloud config set project $PROJECT_ID
gcloud services enable compute.googleapis.com --quiet

echo ""
echo "🌎 US East/South Zones:"
US_ZONES=("us-east1" "us-east4" "us-south1" "us-west2" "us-west1" "us-central1")

for zone in "${US_ZONES[@]}"; do
    echo -n "  $zone: "
    # Use proper filter syntax and check zone-specific availability
    GPU_LIST=$(gcloud compute accelerator-types list \
        --filter="zone:$zone AND name=nvidia-tesla-t4" \
        --format="value(name)" \
        --project=$PROJECT_ID 2>/dev/null)
    
    if [ -n "$GPU_LIST" ] && echo "$GPU_LIST" | grep -q "nvidia-tesla-t4"; then
        echo "✅ T4 Available"
    else
        # Fallback: check if zone exists and has any GPUs
        ZONE_EXISTS=$(gcloud compute accelerator-types list \
            --filter="zone:$zone" \
            --format="value(zone)" \
            --project=$PROJECT_ID 2>/dev/null | head -1)
        
        if [ -n "$ZONE_EXISTS" ]; then
            echo "❌ T4 not available (but zone exists)"
        else
            echo "❌ Zone not found"
        fi
    fi
done

echo ""
echo "💡 Recommendation:"
echo "   Use the first available zone for deployment"
echo "   Note: Zones are region-level (us-east1) not availability zones (us-east1-a)"
echo "   If none available, you may need to request GPU quota increase"