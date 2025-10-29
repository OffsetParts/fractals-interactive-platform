#!/bin/bash

# Simple test to understand the exact zone and GPU format
PROJECT_ID="fabled-orbit-476414-r1"

echo "🧪 Simple GPU availability test..."
echo "================================="

gcloud config set project $PROJECT_ID

echo "📋 First, let's see ALL zones that have ANY accelerators:"
gcloud compute accelerator-types list --format="value(zone)" | sort | uniq

echo ""
echo "📋 Now let's see what the exact GPU names are:"
gcloud compute accelerator-types list --format="value(name)" | sort | uniq

echo ""
echo "📋 Let's see the full output for any T4-related entries:"
gcloud compute accelerator-types list | grep -i t4

echo ""
echo "💡 This will help us understand the exact format needed"