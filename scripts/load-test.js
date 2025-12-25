#!/usr/bin/env node

/**
 * Load Testing Script for Broadcast Controls
 * Tests multiple concurrent connections and broadcast operations
 */

const WebSocket = require('ws');
const EventSource = require('eventsource');

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws');
    this.connections = [];
    this.metrics = {
      connectionsCreated: 0,
      connectionsActive: 0,
      messagesReceived: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async testConcurrentListeners(count = 10) {
    console.log(`🧪 Testing ${count} concurrent listeners...`);
    
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.createListener(i));
    }

    await Promise.all(promises);
    
    // Let connections run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    this.cleanup();
    this.printResults();
  }

  async createListener(id) {
    return new Promise((resolve, reject) => {
      try {
        const eventSource = new EventSource(`${this.baseUrl}/api/live/events`);
        
        eventSource.onopen = () => {
          this.metrics.connectionsCreated++;
          this.metrics.connectionsActive++;
          console.log(`✅ Listener ${id} connected`);
          resolve();
        };

        eventSource.onmessage = (event) => {
          this.metrics.messagesReceived++;
          try {
            const data = JSON.parse(event.data);
            console.log(`📡 Listener ${id} received: ${data.type}`);
          } catch (error) {
            console.warn(`⚠️ Listener ${id} received invalid JSON`);
          }
        };

        eventSource.onerror = (error) => {
          this.metrics.errors++;
          console.error(`❌ Listener ${id} error:`, error);
        };

        this.connections.push({
          id,
          type: 'listener',
          connection: eventSource
        });

      } catch (error) {
        this.metrics.errors++;
        console.error(`❌ Failed to create listener ${id}:`, error);
        reject(error);
      }
    });
  }

  async testBroadcastOperations() {
    console.log('🧪 Testing broadcast operations...');
    
    // Simulate mute/unmute operations
    const operations = ['mute', 'unmute', 'mute', 'unmute'];
    
    for (const operation of operations) {
      console.log(`🎛️ Testing ${operation} operation...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/api/admin/broadcast/${operation}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log(`✅ ${operation} operation successful`);
        } else {
          console.error(`❌ ${operation} operation failed:`, response.status);
          this.metrics.errors++;
        }
      } catch (error) {
        console.error(`❌ ${operation} operation error:`, error);
        this.metrics.errors++;
      }

      // Wait 2 seconds between operations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async testMemoryUsage() {
    console.log('🧪 Testing memory usage...');
    
    const initialMemory = process.memoryUsage();
    console.log('📊 Initial memory usage:', this.formatMemory(initialMemory));

    // Create many connections
    await this.testConcurrentListeners(50);

    const finalMemory = process.memoryUsage();
    console.log('📊 Final memory usage:', this.formatMemory(finalMemory));

    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };

    console.log('📈 Memory increase:', this.formatMemory(memoryIncrease));
  }

  formatMemory(memory) {
    return {
      rss: `${Math.round(memory.rss / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100} MB`
    };
  }

  cleanup() {
    console.log('🧹 Cleaning up connections...');
    
    this.connections.forEach(conn => {
      try {
        if (conn.type === 'listener') {
          conn.connection.close();
        } else if (conn.type === 'websocket') {
          conn.connection.close();
        }
        this.metrics.connectionsActive--;
      } catch (error) {
        console.warn(`⚠️ Error closing connection ${conn.id}:`, error);
      }
    });

    this.connections = [];
  }

  printResults() {
    const duration = (Date.now() - this.metrics.startTime) / 1000;
    
    console.log('\n📊 Load Test Results:');
    console.log('===================');
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Connections Created: ${this.metrics.connectionsCreated}`);
    console.log(`Messages Received: ${this.metrics.messagesReceived}`);
    console.log(`Errors: ${this.metrics.errors}`);
    console.log(`Messages/Second: ${(this.metrics.messagesReceived / duration).toFixed(2)}`);
    console.log(`Error Rate: ${((this.metrics.errors / this.metrics.connectionsCreated) * 100).toFixed(2)}%`);
  }
}

// Run load tests
async function main() {
  const tester = new LoadTester();
  
  try {
    console.log('🚀 Starting load tests...\n');
    
    // Test concurrent listeners
    await tester.testConcurrentListeners(20);
    
    // Test broadcast operations
    await tester.testBroadcastOperations();
    
    // Test memory usage
    await tester.testMemoryUsage();
    
    console.log('\n✅ Load tests completed!');
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LoadTester;