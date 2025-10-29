#!/bin/bash

# Quick test to see what GPU types are actually available
PROJECT_ID="fabled-orbit-476414-r1"

echo "🧪 Testing actual GPU names and zones available..."
echo "================================================"

# Set project
gcloud config set project $PROJECT_ID

echo "📋 All available accelerator types (first 10):"
gcloud compute accelerator-types list --limit=10 --format="table(name,zone)"

echo ""
echo "🔍 Looking specifically for T4 GPUs (new filter syntax):"
gcloud compute accelerator-types list --filter="name=nvidia-tesla-t4" --format="table(name,zone)"

echo ""
echo "🔍 Looking for any T4-related GPUs (new filter syntax):"
gcloud compute accelerator-types list --filter="name~.*t4.*" --format="table(name,zone)"

echo ""
echo "🔍 Alternative T4 search (exact match):"
gcloud compute accelerator-types list --filter="name='nvidia-tesla-t4'" --format="table(name,zone)"

echo ""
echo "💡 This will show us the correct GPU names and actual zone formats"