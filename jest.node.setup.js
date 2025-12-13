// Node.js specific Jest setup for model and API tests

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL = 'ws://localhost:8080'

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test cleanup
afterEach(async () => {
  // Clean up any test data if needed
});

// Global test teardown
afterAll(async () => {
  // Close any open connections
});