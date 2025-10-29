#!/bin/bash

# Google Cloud Setup Script for Fractals Interactive Platform
# This script handles initial Google Cloud configuration before deployment

set -e

echo "🏗️ Setting up Google Cloud for Fractals Interactive Platform..."
echo "================================================================"

# 1. Check if Google Cloud SDK is installed
echo "📋 Step 1: Checking Google Cloud SDK installation..."
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Installing..."
    echo ""
    echo "🔧 Installing Google Cloud SDK..."
    curl https://sdk.cloud.google.com | bash
    echo ""
    echo "✅ Google Cloud SDK installed!"
    echo "⚠️  Please restart your terminal and run this script again:"
    echo "   source ~/.zshrc"
    echo "   ./setup-gcloud.sh"
    exit 0
else
    echo "✅ Google Cloud SDK is installed"
    gcloud version
fi

echo ""

# 2. Check authentication status
echo "📋 Step 2: Checking authentication..."
CURRENT_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")

if [ -z "$CURRENT_ACCOUNT" ]; then
    echo "❌ Not authenticated with Google Cloud"
    echo "🔐 Opening authentication flow..."
    gcloud auth login
    echo "✅ Authentication complete!"
else
    echo "✅ Already authenticated as: $CURRENT_ACCOUNT"
    read -p "Continue with this account? (y/N): " continue_auth
    if [[ ! $continue_auth =~ ^[Yy]$ ]]; then
        echo "🔐 Starting new authentication..."
        gcloud auth login
    fi
fi

echo ""

# 3. Project setup
echo "📋 Step 3: Setting up Google Cloud Project..."
echo "You have two options:"
echo "  1. Use an existing project"
echo "  2. Create a new project"
echo ""

read -p "Do you want to create a new project? (y/N): " create_new

if [[ $create_new =~ ^[Yy]$ ]]; then
    # Create new project
    echo "🆕 Creating new Google Cloud project..."
    DEFAULT_PROJECT_ID="fractals-platform-$(date +%s)"
    read -p "Enter project ID (or press Enter for '$DEFAULT_PROJECT_ID'): " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$DEFAULT_PROJECT_ID
    fi
    
    echo "Creating project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --set-as-default
    
    echo ""
    echo "⚠️  IMPORTANT: You must enable billing for this project"
    echo "🔗 Please visit: https://console.cloud.google.com/billing/projects/$PROJECT_ID"
    echo ""
    read -p "Press Enter after you've enabled billing..."
    
else
    # Use existing project
    echo "📋 Available projects:"
    gcloud projects list --format="table(projectId,name,projectNumber)"
    echo ""
    read -p "Enter the Project ID you want to use: " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ Project ID cannot be empty"
        exit 1
    fi
    
    gcloud config set project $PROJECT_ID
fi

echo "✅ Using project: $PROJECT_ID"

# 4. Enable required APIs
echo ""
echo "📋 Step 4: Enabling required Google Cloud APIs..."
echo "This may take a few minutes..."

gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  cloudfunctions.googleapis.com \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  monitoring.googleapis.com

echo "✅ All required APIs enabled"

# 5. Check quotas and permissions
echo ""
echo "📋 Step 5: Checking quotas and permissions..."

# Check GPU quota
GPU_QUOTA=$(gcloud compute project-info describe --format="value(quotas[].limit)" --filter="quotas.metric:NVIDIA_T4_GPUS AND quotas.region:us-central1" 2>/dev/null || echo "0")

if [ "$GPU_QUOTA" -lt 1 ]; then
    echo "⚠️  GPU quota insufficient (current: $GPU_QUOTA, needed: 1)"
    echo "🔗 Request GPU quota increase at: https://console.cloud.google.com/iam-admin/quotas"
    echo "   Search for 'NVIDIA T4 GPUs' in us-central1 region"
    echo ""
    read -p "Continue anyway? (deployment may fail) (y/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        echo "❌ Please increase GPU quota and run this script again"
        exit 1
    fi
else
    echo "✅ GPU quota sufficient: $GPU_QUOTA Tesla T4 GPUs available"
fi

# 6. Update deployment script with project ID
echo ""
echo "📋 Step 6: Updating deployment configuration..."

if [ -f "deploy-complete.sh" ]; then
    # Update PROJECT_ID in deploy-complete.sh
    sed -i.bak "s/PROJECT_ID=\"fractals-platform\"/PROJECT_ID=\"$PROJECT_ID\"/g" deploy-complete.sh
    echo "✅ Updated deploy-complete.sh with project ID: $PROJECT_ID"
else
    echo "⚠️  deploy-complete.sh not found. You'll need to update it manually."
fi

# 7. Set up Application Default Credentials
echo ""
echo "📋 Step 7: Setting up Application Default Credentials..."
gcloud auth application-default login

echo ""
echo "🎉 Google Cloud Setup Complete!"
echo "================================"
echo "Project ID: $PROJECT_ID"
echo "Region: us-central1"
echo "Authentication: ✅"
echo "APIs Enabled: ✅"
echo "Billing: ⚠️  (verify at https://console.cloud.google.com/billing)"
echo ""
echo "🚀 Next Steps:"
echo "1. Ensure billing is enabled for your project"
echo "2. Run the deployment script:"
echo "   chmod +x deploy-complete.sh"
echo "   ./deploy-complete.sh"
echo ""
echo "💡 If deployment fails due to quotas, check:"
echo "   https://console.cloud.google.com/iam-admin/quotas"
echo ""

# 8. Optional: Run quick verification
read -p "Run quick verification tests? (y/N): " run_tests
if [[ $run_tests =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧪 Running verification tests..."
    
    # Test gcloud access
    echo -n "• Testing gcloud access... "
    if gcloud projects describe $PROJECT_ID > /dev/null 2>&1; then
        echo "✅"
    else
        echo "❌"
    fi
    
    # Test Docker (needed for Cloud Run)
    echo -n "• Testing Docker... "
    if command -v docker &> /dev/null && docker info > /dev/null 2>&1; then
        echo "✅"
    else
        echo "❌ (Docker not running - needed for Cloud Run deployment)"
    fi
    
    # Test npm (needed for functions)
    echo -n "• Testing npm... "
    if command -v npm &> /dev/null; then
        echo "✅"
    else
        echo "❌ (npm not found - needed for Cloud Functions)"
    fi
    
    echo ""
    echo "🔍 Verification complete"
fi

echo ""
echo "🎯 Ready for deployment! Run: ./deploy-complete.sh"