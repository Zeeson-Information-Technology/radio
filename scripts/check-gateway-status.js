#!/usr/bin/env node

/**
 * Gateway Status Checker
 * Checks if the EC2 gateway is running and accessible
 */

const https = require('https');
const http = require('http');

// Get URLs from environment or use defaults
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const ICECAST_URL = process.env.STREAM_URL?.replace('/stream', '') || 'http://localhost:8000';

async function checkUrl(url, name) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url + '/health', { timeout: 5000 }, (res) => {
      console.log(`✅ ${name}: Accessible (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${name}: Not accessible - ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ ${name}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function checkGatewayStatus() {
  console.log('🔍 Checking Gateway and Icecast Status...\n');
  
  const gatewayOk = await checkUrl(GATEWAY_URL, 'Gateway (EC2:8080)');
  const icecastOk = await checkUrl(ICECAST_URL, 'Icecast (EC2:8000)');
  
  console.log('\n📊 Summary:');
  console.log(`Gateway: ${gatewayOk ? '✅ Running' : '❌ Down'}`);
  console.log(`Icecast: ${icecastOk ? '✅ Running' : '❌ Down'}`);
  
  if (!gatewayOk || !icecastOk) {
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if EC2 instance is running');
    console.log('2. SSH into EC2 and check services:');
    console.log('   ssh -i your-key.pem ubuntu@your-server');
    console.log('   pm2 status');
    console.log('   sudo systemctl status icecast2');
    console.log('3. Check security groups allow required ports');
  }
}

checkGatewayStatus().catch(console.error);