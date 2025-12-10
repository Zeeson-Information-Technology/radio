#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Al-Manhaj Radio
 * Tests all components, APIs, mobile responsiveness, and gateway functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Al-Manhaj Radio - Comprehensive Test Suite');
console.log('==============================================\n');

const testSuites = [
  {
    name: '🔧 Unit Tests - Components',
    command: 'npm test -- --testPathPattern=components',
    description: 'Testing React components and UI elements'
  },
  {
    name: '🌐 API Integration Tests',
    command: 'npm test -- --testPathPattern=api',
    description: 'Testing API endpoints and authentication'
  },
  {
    name: '📱 Mobile Responsiveness Tests',
    command: 'npm test -- --testPathPattern=mobile',
    description: 'Testing mobile layouts and touch interactions'
  },
  {
    name: '🎙️ Gateway WebSocket Tests',
    command: 'npm test -- --testPathPattern=gateway',
    description: 'Testing broadcast gateway functionality'
  },
  {
    name: '🔐 Authentication Flow Tests',
    command: 'npm test -- --testPathPattern=integration',
    description: 'Testing complete authentication workflows'
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTestSuite(suite) {
  console.log(`\n${suite.name}`);
  console.log(`📋 ${suite.description}`);
  console.log('─'.repeat(50));
  
  try {
    const output = execSync(suite.command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse Jest output for test counts
    const testResults = output.match(/Tests:\s+(\d+)\s+passed/);
    const testCount = testResults ? parseInt(testResults[1]) : 0;
    
    totalTests += testCount;
    passedTests += testCount;
    
    console.log(`✅ ${testCount} tests passed`);
    
  } catch (error) {
    const output = error.stdout || error.message;
    console.log(`❌ Tests failed:`);
    console.log(output);
    
    // Try to extract failed test count
    const failedMatch = output.match(/(\d+)\s+failed/);
    const failed = failedMatch ? parseInt(failedMatch[1]) : 1;
    
    totalTests += failed;
    failedTests += failed;
  }
}

// Run all test suites
testSuites.forEach(runTestSuite);

// Generate coverage report
console.log('\n📊 Generating Coverage Report...');
try {
  execSync('npm run test:coverage', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️ Coverage report generation failed');
}

// Summary
console.log('\n🎯 Test Summary');
console.log('===============');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

// Mobile-specific recommendations
console.log('\n📱 Mobile Testing Recommendations:');
console.log('• Test on actual devices when possible');
console.log('• Verify touch targets are at least 44px');
console.log('• Check text readability on small screens');
console.log('• Test landscape and portrait orientations');
console.log('• Verify form inputs work with virtual keyboards');

// Gateway testing recommendations
console.log('\n🎙️ Gateway Testing Recommendations:');
console.log('• Test with actual microphone input');
console.log('• Verify WebSocket connections over SSL');
console.log('• Test concurrent user scenarios');
console.log('• Check audio quality and latency');
console.log('• Test reconnection after network issues');

// Next steps
if (failedTests > 0) {
  console.log('\n🔧 Next Steps:');
  console.log('1. Fix failing tests');
  console.log('2. Run tests again');
  console.log('3. Deploy to production when all tests pass');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Ready for deployment.');
  console.log('\n🚀 Deployment Checklist:');
  console.log('✅ Unit tests passed');
  console.log('✅ API tests passed');
  console.log('✅ Mobile responsiveness verified');
  console.log('✅ Gateway functionality tested');
  console.log('✅ Authentication flows working');
  
  console.log('\n📋 Manual Testing Still Needed:');
  console.log('• Test browser broadcasting with real microphone');
  console.log('• Verify SSL WebSocket connection');
  console.log('• Test on multiple devices and browsers');
  console.log('• Check audio quality on live stream');
}