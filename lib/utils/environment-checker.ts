/**
 * Environment Configuration Checker
 * Helps debug environment variable issues between local and production
 */

export interface EnvironmentConfig {
  environment: 'development' | 'production';
  gatewayUrl: string;
  nextjsUrl: string;
  streamUrl: string;
  websocketUrl: string;
  mongodbUri: string;
  isComplete: boolean;
  missingVars: string[];
}

export function checkEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  
  // Determine URLs based on environment
  const gatewayUrl = process.env.GATEWAY_URL || 
    (isProduction ? 'http://98.93.42.61:8080' : 'http://localhost:8080');
  
  const nextjsUrl = process.env.NEXTAUTH_URL || 
    (isProduction ? 'https://almanhaj.vercel.app' : 'http://localhost:3000');
  
  const streamUrl = process.env.STREAM_URL || 
    (isProduction ? 'http://98.93.42.61:8000/stream' : 'http://localhost:8080/test-stream');
  
  const websocketUrl = process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL || 
    (isProduction ? 'ws://98.93.42.61:8080' : 'ws://localhost:8080');
  
  const mongodbUri = process.env.MONGODB_URI || '';
  
  // Check for missing critical variables
  const missingVars: string[] = [];
  const requiredVars = [
    { name: 'MONGODB_URI', value: mongodbUri },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
    { name: 'GATEWAY_URL', value: process.env.GATEWAY_URL },
    { name: 'INTERNAL_API_KEY', value: process.env.INTERNAL_API_KEY }
  ];
  
  requiredVars.forEach(({ name, value }) => {
    if (!value) {
      missingVars.push(name);
    }
  });
  
  return {
    environment: env as 'development' | 'production',
    gatewayUrl,
    nextjsUrl,
    streamUrl,
    websocketUrl,
    mongodbUri: mongodbUri ? 'configured' : 'missing',
    isComplete: missingVars.length === 0,
    missingVars
  };
}

export function logEnvironmentConfig(): void {
  const config = checkEnvironmentConfig();
  
  console.log('🔍 Environment Configuration:');
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Gateway URL: ${config.gatewayUrl}`);
  console.log(`   Next.js URL: ${config.nextjsUrl}`);
  console.log(`   Stream URL: ${config.streamUrl}`);
  console.log(`   WebSocket URL: ${config.websocketUrl}`);
  console.log(`   MongoDB: ${config.mongodbUri ? 'configured' : 'missing'}`);
  console.log(`   Complete: ${config.isComplete}`);
  
  if (!config.isComplete) {
    console.warn('⚠️  Missing environment variables:', config.missingVars.join(', '));
  }
}

/**
 * Get the correct gateway URL for the current environment
 */
export function getGatewayUrl(): string {
  const config = checkEnvironmentConfig();
  return config.gatewayUrl;
}

/**
 * Get the correct WebSocket URL for the current environment
 */
export function getWebSocketUrl(): string {
  const config = checkEnvironmentConfig();
  return config.websocketUrl;
}

/**
 * Check if gateway is accessible
 */
export async function checkGatewayHealth(): Promise<{ accessible: boolean; error?: string }> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return { accessible: true };
    } else {
      return { 
        accessible: false, 
        error: `Gateway returned ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { 
      accessible: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}