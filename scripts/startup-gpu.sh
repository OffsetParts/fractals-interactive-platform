#!/bin/bash
# GPU server startup script for Google Cloud VM

set -e

echo "🚀 Starting Fractals GPU Server Setup..."

# Update system
apt-get update

# Install CUDA drivers
echo "📦 Installing CUDA drivers..."
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-ubuntu2004.pin
mv cuda-ubuntu2004.pin /etc/apt/preferences.d/cuda-repository-pin-600
wget https://developer.download.nvidia.com/compute/cuda/11.8.0/local_installers/cuda-repo-ubuntu2004-11-8-local_11.8.0-520.61.05-1_amd64.deb
dpkg -i cuda-repo-ubuntu2004-11-8-local_11.8.0-520.61.05-1_amd64.deb
cp /var/cuda-repo-ubuntu2004-11-8-local/cuda-*-keyring.gpg /usr/share/keyrings/
apt-get update
apt-get -y install cuda

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install build tools
apt-get install -y build-essential cmake git

# Install PM2 for process management
npm install -g pm2

# Set up environment variables
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> /etc/environment
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> /etc/environment

# Clone the repository (replace with your actual repo)
cd /opt
git clone https://github.com/yourusername/fractals-interactive-platform.git
cd fractals-interactive-platform

# Install dependencies
npm install

# Build the server
npm run server:build

# Create systemd service for auto-start
cat > /etc/systemd/system/fractals-gpu.service << EOF
[Unit]
Description=Fractals GPU Rendering Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/fractals-interactive-platform
Environment=NODE_ENV=production
Environment=CUDA_HOME=/usr/local/cuda
Environment=PATH=/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=LD_LIBRARY_PATH=/usr/local/cuda/lib64
ExecStart=/usr/bin/npm run server:start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl enable fractals-gpu.service
systemctl start fractals-gpu.service

# Create log directory
mkdir -p /var/log/fractals

# Set up log rotation
cat > /etc/logrotate.d/fractals << EOF
/var/log/fractals/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Install nvidia-docker for containerized workloads (optional)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
apt-get update && apt-get install -y nvidia-docker2
systemctl restart docker

# Test GPU setup
nvidia-smi > /var/log/fractals/gpu-info.log

echo "✅ GPU server setup complete!"
echo "🔍 GPU Status:"
nvidia-smi

echo "🚀 Starting Fractals API server..."
systemctl status fractals-gpu.service

echo "📍 Server accessible at: http://$(curl -s https://ipinfo.io/ip):3001"