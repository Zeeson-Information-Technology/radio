#!/bin/bash

# Al-Manhaj Radio - Gateway Deployment Script
# This script updates the gateway server on EC2

set -e

echo "🚀 Deploying Al-Manhaj Radio Gateway to EC2..."

# Configuration
EC2_HOST="98.93.42.61"
EC2_USER="ubuntu"
GATEWAY_PATH="/opt/almanhaj-gateway"
LOCAL_GATEWAY_PATH="./gateway"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Pre-deployment checklist:${NC}"
echo "1. Make sure you have SSH access to EC2 instance"
echo "2. Ensure gateway files are ready in ./gateway/"
echo "3. Verify .env file is configured on EC2"
echo ""

read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo -e "${YELLOW}📦 Copying gateway files to EC2...${NC}"

# Copy server.js and package.json to EC2
scp "${LOCAL_GATEWAY_PATH}/server.js" "${EC2_USER}@${EC2_HOST}:${GATEWAY_PATH}/"
scp "${LOCAL_GATEWAY_PATH}/package.json" "${EC2_USER}@${EC2_HOST}:${GATEWAY_PATH}/"

echo -e "${YELLOW}🔄 Restarting gateway service on EC2...${NC}"

# SSH into EC2 and restart the service
ssh "${EC2_USER}@${EC2_HOST}" << 'EOF'
    echo "📍 Current directory: $(pwd)"
    echo "📁 Gateway directory contents:"
    ls -la /opt/almanhaj-gateway/
    
    echo "🛑 Stopping gateway service..."
    sudo systemctl stop almanhaj-gateway
    
    echo "📦 Installing/updating dependencies..."
    cd /opt/almanhaj-gateway
    npm install --production
    
    echo "🚀 Starting gateway service..."
    sudo systemctl start almanhaj-gateway
    
    echo "✅ Checking service status..."
    sudo systemctl status almanhaj-gateway --no-pager -l
    
    echo "📋 Recent logs:"
    sudo journalctl -u almanhaj-gateway --no-pager -l -n 10
EOF

echo -e "${GREEN}✅ Gateway deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📊 Next steps:${NC}"
echo "1. Check the logs above for any errors"
echo "2. Test the broadcast functionality from admin panel"
echo "3. Verify listeners receive real-time updates"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "• Check status: ssh ubuntu@${EC2_HOST} 'sudo systemctl status almanhaj-gateway'"
echo "• View logs: ssh ubuntu@${EC2_HOST} 'sudo journalctl -u almanhaj-gateway -f'"
echo "• Restart: ssh ubuntu@${EC2_HOST} 'sudo systemctl restart almanhaj-gateway'"