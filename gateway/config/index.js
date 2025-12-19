/**
 * Configuration module for Al-Manhaj Radio Gateway
 */

module.exports = {
  // Server Configuration
  PORT: process.env.GATEWAY_PORT || 8080,
  JWT_SECRET: process.env.JWT_SECRET || 'hujfidreukj78jrekjhrehre8hfd',
  NEXTJS_URL: process.env.NEXTJS_URL || 'http://localhost:3000',
  
  // Icecast Configuration
  ICECAST_HOST: process.env.ICECAST_HOST || 'localhost',
  ICECAST_PORT: process.env.ICECAST_PORT || 8000,
  ICECAST_PASSWORD: process.env.ICECAST_PASSWORD || 'hackme',
  ICECAST_MOUNT: process.env.ICECAST_MOUNT || '/stream',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/online-radio',
  
  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'almanhaj-radio-audio',
  
  // Audio Conversion Configuration
  CONVERSION_TEMP_DIR: process.env.CONVERSION_TEMP_DIR || '/tmp/audio-conversion',
  CONVERSION_MAX_CONCURRENT: parseInt(process.env.CONVERSION_MAX_CONCURRENT) || 2,
  
  // CORS Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000', 
    'https://almanhaj.vercel.app'
  ]
};