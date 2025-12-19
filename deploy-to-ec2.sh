#!/bin/bash

# Al-Manhaj Radio - EC2 Deployment Script
# Run this script to deploy updates to EC2

echo "🚀 Deploying Al-Manhaj Radio to EC2..."

# Stop the gateway service
echo "⏹️ Stopping gateway service..."
sudo systemctl stop almanhaj-gateway

# Copy updated files
echo "📁 Copying gateway files..."
sudo cp -r gateway/* /opt/almanhaj-gateway/

# Copy production environment file
echo "⚙️ Setting up production environment..."
sudo cp gateway/.env.production /opt/almanhaj-gateway/.env

# Install/update dependencies if package.json changed
if [ -f "gateway/package.json" ]; then
    echo "📦 Updating dependencies..."
    cd /opt/almanhaj-gateway
    sudo npm install --production
    cd -
fi

# Start the gateway service
echo "▶️ Starting gateway service..."
sudo systemctl start almanhaj-gateway

# Check service status
echo "🔍 Checking service status..."
sudo systemctl status almanhaj-gateway --no-pager -l

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 3
curl -s http://localhost:8080/health | python3 -m json.tool

echo "✅ Deployment complete!"
echo "📡 Stream URL: http://98.93.42.61:8000/live.mp3"
echo "🎛️ Gateway Health: http://98.93.42.61:8080/health"