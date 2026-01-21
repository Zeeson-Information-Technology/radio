#!/usr/bin/env node

/**
 * Environment Switching Helper
 * Helps switch between local and production configurations
 */

const fs = require('fs');
const path = require('path');

const ENV_LOCAL_PATH = '.env.local';
const GATEWAY_ENV_PATH = 'gateway/.env';

function switchToLocal() {
  console.log('🔧 Switching to LOCAL development environment...\n');
  
  // Update .env.local
  let envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  
  // Comment out production settings
  envContent = envContent.replace(/^(NODE_ENV=production)/gm, '# $1');
  envContent = envContent.replace(/^(NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws:\/\/.*:8080)/gm, '# $1');
  envContent = envContent.replace(/^(GATEWAY_URL=http:\/\/.*:8080)/gm, '# $1');
  envContent = envContent.replace(/^(NEXTAUTH_URL=https:\/\/.*)/gm, '# $1');
  envContent = envContent.replace(/^(STREAM_URL=http:\/\/.*:8000\/stream)/gm, '# $1');
  envContent = envContent.replace(/^(NEXT_PUBLIC_STREAM_URL=http:\/\/.*:8000\/stream)/gm, '# $1');
  
  // Uncomment local settings
  envContent = envContent.replace(/^# (NODE_ENV=development)/gm, '$1');
  envContent = envContent.replace(/^# (NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws:\/\/localhost:8080)/gm, '$1');
  envContent = envContent.replace(/^# (GATEWAY_URL=http:\/\/localhost:8080)/gm, '$1');
  envContent = envContent.replace(/^# (NEXTAUTH_URL=http:\/\/localhost:3000)/gm, '$1');
  envContent = envContent.replace(/^# (STREAM_URL=http:\/\/localhost:8080\/test-stream)/gm, '$1');
  envContent = envContent.replace(/^# (NEXT_PUBLIC_STREAM_URL=http:\/\/localhost:8080\/test-stream)/gm, '$1');
  
  fs.writeFileSync(ENV_LOCAL_PATH, envContent);
  
  // Update gateway/.env
  let gatewayContent = fs.readFileSync(GATEWAY_ENV_PATH, 'utf8');
  gatewayContent = gatewayContent.replace(/NODE_ENV=production/g, 'NODE_ENV=development');
  gatewayContent = gatewayContent.replace(/NEXTJS_URL=https:\/\/.*/g, 'NEXTJS_URL=http://localhost:3000');
  gatewayContent = gatewayContent.replace(/NEXTJS_API_URL=https:\/\/.*/g, 'NEXTJS_API_URL=http://localhost:3000');
  
  fs.writeFileSync(GATEWAY_ENV_PATH, gatewayContent);
  
  console.log('✅ Switched to LOCAL environment');
  console.log('📝 Next steps:');
  console.log('   1. Restart your Next.js dev server: npm run dev');
  console.log('   2. Restart gateway if running: cd gateway && npm start');
  console.log('   3. Test at: http://localhost:3000');
}

function switchToProduction() {
  console.log('🚀 Switching to PRODUCTION environment...\n');
  
  // Update .env.local
  let envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  
  // Comment out local settings
  envContent = envContent.replace(/^(NODE_ENV=development)/gm, '# $1');
  envContent = envContent.replace(/^(NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws:\/\/localhost:8080)/gm, '# $1');
  envContent = envContent.replace(/^(GATEWAY_URL=http:\/\/localhost:8080)/gm, '# $1');
  envContent = envContent.replace(/^(NEXTAUTH_URL=http:\/\/localhost:3000)/gm, '# $1');
  envContent = envContent.replace(/^(STREAM_URL=http:\/\/localhost:8080\/test-stream)/gm, '# $1');
  envContent = envContent.replace(/^(NEXT_PUBLIC_STREAM_URL=http:\/\/localhost:8080\/test-stream)/gm, '# $1');
  
  // Uncomment production settings
  envContent = envContent.replace(/^# (NODE_ENV=production)/gm, '$1');
  envContent = envContent.replace(/^# (NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws:\/\/.*:8080)/gm, '$1');
  envContent = envContent.replace(/^# (GATEWAY_URL=http:\/\/.*:8080)/gm, '$1');
  envContent = envContent.replace(/^# (NEXTAUTH_URL=https:\/\/.*)/gm, '$1');
  envContent = envContent.replace(/^# (STREAM_URL=http:\/\/.*:8000\/stream)/gm, '$1');
  envContent = envContent.replace(/^# (NEXT_PUBLIC_STREAM_URL=http:\/\/.*:8000\/stream)/gm, '$1');
  
  fs.writeFileSync(ENV_LOCAL_PATH, envContent);
  
  // Update gateway/.env
  let gatewayContent = fs.readFileSync(GATEWAY_ENV_PATH, 'utf8');
  gatewayContent = gatewayContent.replace(/NODE_ENV=development/g, 'NODE_ENV=production');
  gatewayContent = gatewayContent.replace(/NEXTJS_URL=http:\/\/localhost:3000/g, 'NEXTJS_URL=https://almanhaj.vercel.app');
  gatewayContent = gatewayContent.replace(/NEXTJS_API_URL=http:\/\/localhost:3000/g, 'NEXTJS_API_URL=https://almanhaj.vercel.app');
  
  fs.writeFileSync(GATEWAY_ENV_PATH, gatewayContent);
  
  console.log('✅ Switched to PRODUCTION environment');
  console.log('📝 Next steps:');
  console.log('   1. Deploy to Vercel: vercel --prod');
  console.log('   2. Update gateway on EC2: scp gateway/.env user@server:~/gateway/');
  console.log('   3. Restart gateway: ssh user@server "cd gateway && pm2 restart gateway"');
  console.log('   4. Validate: node scripts/validate-deployment.js');
}

function showStatus() {
  console.log('🔍 Current Environment Configuration:\n');
  
  const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const isProduction = envContent.includes('NODE_ENV=production') && !envContent.includes('# NODE_ENV=production');
  
  console.log(`Environment: ${isProduction ? '🚀 PRODUCTION' : '🔧 LOCAL'}`);
  
  // Show active URLs
  const lines = envContent.split('\n');
  const activeLines = lines.filter(line => line && !line.startsWith('#') && line.includes('='));
  
  console.log('\nActive Configuration:');
  activeLines.forEach(line => {
    if (line.includes('GATEWAY_URL') || line.includes('STREAM_URL') || line.includes('NEXTAUTH_URL')) {
      console.log(`  ${line}`);
    }
  });
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'local':
    switchToLocal();
    break;
  case 'production':
  case 'prod':
    switchToProduction();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('🔧 Environment Switching Helper\n');
    console.log('Usage:');
    console.log('  node scripts/switch-environment.js local      # Switch to local development');
    console.log('  node scripts/switch-environment.js prod       # Switch to production');
    console.log('  node scripts/switch-environment.js status     # Show current configuration');
    break;
}