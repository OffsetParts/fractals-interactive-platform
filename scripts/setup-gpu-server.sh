# Google Cloud Setup Script
# Run this on your Google Cloud VM with GPU

# Install CUDA and dependencies
sudo apt update
sudo apt install -y nvidia-driver-470 nvidia-cuda-toolkit
sudo apt install -y nodejs npm build-essential cmake

# Install PM2 for process management
npm install -g pm2

# Setup environment
export CUDA_HOME=/usr/local/cuda
export PATH=$PATH:$CUDA_HOME/bin
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUDA_HOME/lib64

# Clone your repo and install dependencies
git clone https://github.com/yourusername/fractals-interactive-platform.git
cd fractals-interactive-platform
npm install

# Build the server
npm run server:build

# Start the server with PM2
pm2 start dist/server/server.js --name "fractals-api"
pm2 startup
pm2 save

echo "GPU server setup complete!"
echo "Server running on port 3001"