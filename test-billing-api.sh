#!/bin/bash

# Quick billing API test script
# This replicates your successful IAM API approach for billing

PROJECT_ID="fabled-orbit-476414-r1"

echo "🧪 Testing Billing API access for project: $PROJECT_ID"
echo "=================================================="

# Enable billing API first
echo "1. Enabling Cloud Billing API..."
gcloud services enable cloudbilling.googleapis.com

# Test billing info endpoint (similar to your IAM test)
echo "2. Testing billing info endpoint..."
curl -X GET \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "x-goog-user-project: $PROJECT_ID" \
     "https://cloudbilling.googleapis.com/v1/projects/$PROJECT_ID/billingInfo"

echo ""
echo ""
echo "3. Testing project billing status..."
curl -X GET \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     "https://cloudbilling.googleapis.com/v1/projects/$PROJECT_ID/billingInfo"

echo ""
echo ""
echo "🎯 If you see billing account information above, the API is working!"
echo "   If you see permission errors, we'll use manual verification in deployment."