#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Validates that both Vercel and Gateway are properly configured and working
 */

const https = require('https');
const http = require('http');

// Configuration
const VERCEL_URL = process.env.VERCEL_URL || 'https://almanhaj.vercel.app';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://98.93.42.61:8080';
const STREAM_URL = process.env.STREAM_URL || 'http://98.93.42.61:8000/stream';

async function makeRequest(url, name, timeout = 10000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    console.log(`🔍 Testing ${name}: ${url}`);
    
    const req = client.get(url, { timeout }, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      console.log(`${success ? '✅' : '❌'} ${name}: ${res.statusCode} ${res.statusMessage}`);
      resolve({ success, status: res.statusCode, message: res.statusMessage });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${name}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      console.log(`❌ ${name}: Request timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function validateDeployment() {
  console.log('🚀 Validating Deployment Configuration\n');
  
  const tests = [
    // Vercel Tests
    { url: `${VERCEL_URL}`, name: 'Vercel App (Homepage)' },
    { url: `${VERCEL_URL}/api/live`, name: 'Vercel API (Live Status)' },
    { url: `${VERCEL_URL}/api/schedule`, name: 'Vercel API (Schedule)' },
    { url: `${VERCEL_URL}/admin`, name: 'Vercel Admin (Login Page)' },
    
    // Gateway Tests
    { url: `${GATEWAY_URL}/health`, name: 'Gateway Health Check' },
    { url: `${GATEWAY_URL}/api/status`, name: 'Gateway Status API' },
    
    // Stream Tests
    { url: STREAM_URL.replace('/stream', '/status-json.xsl'), name: 'Icecast Status' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await makeRequest(test.url, test.name);
    results.push({ ...test, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Deployment Validation Summary:');
  console.log('=====================================');
  
  const vercelTests = results.filter(r => r.name.includes('Vercel'));
  const gatewayTests = results.filter(r => r.name.includes('Gateway'));
  const streamTests = results.filter(r => r.name.includes('Icecast'));
  
  console.log(`\n🌐 Vercel (${vercelTests.filter(t => t.success).length}/${vercelTests.length} passing):`);
  vercelTests.forEach(test => {
    console.log(`   ${test.success ? '✅' : '❌'} ${test.name}`);
  });
  
  console.log(`\n🎙️ Gateway (${gatewayTests.filter(t => t.success).length}/${gatewayTests.length} passing):`);
  gatewayTests.forEach(test => {
    console.log(`   ${test.success ? '✅' : '❌'} ${test.name}`);
  });
  
  console.log(`\n📻 Streaming (${streamTests.filter(t => t.success).length}/${streamTests.length} passing):`);
  streamTests.forEach(test => {
    console.log(`   ${test.success ? '✅' : '❌'} ${test.name}`);
  });
  
  const allPassing = results.every(r => r.success);
  const criticalPassing = results.filter(r => 
    r.name.includes('Homepage') || 
    r.name.includes('Live Status') || 
    r.name.includes('Gateway Health')
  ).every(r => r.success);
  
  console.log(`\n🎯 Overall Status: ${allPassing ? '✅ All Systems Operational' : criticalPassing ? '⚠️ Core Systems Working' : '❌ Critical Issues Detected'}`);
  
  if (!allPassing) {
    console.log('\n🔧 Troubleshooting Failed Tests:');
    results.filter(r => !r.success).forEach(test => {
      console.log(`\n❌ ${test.name}:`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Issue: ${test.error || `HTTP ${test.status}`}`);
      
      if (test.name.includes('Vercel')) {
        console.log('   Fix: Check Vercel deployment and environment variables');
      } else if (test.name.includes('Gateway')) {
        console.log('   Fix: Check EC2 instance and gateway service (pm2 status)');
      } else if (test.name.includes('Icecast')) {
        console.log('   Fix: Check Icecast service (sudo systemctl status icecast2)');
      }
    });
  }
  
  return allPassing;
}

// Run validation
validateDeployment()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });