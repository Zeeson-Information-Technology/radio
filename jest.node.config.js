/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.node.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/models/**/*.(js|jsx|ts|tsx)',
    '**/__tests__/api/**/*.(js|jsx|ts|tsx)',
    '**/*.(property|integration).test.(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb|bson|mongodb-memory-server|fast-check)/)'
  ],
  // Increase timeout for database operations
  testTimeout: 30000,
};

module.exports = config;