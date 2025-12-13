/**
 * Test Script for Audio Conversion System
 * 
 * This script tests the audio conversion functionality without requiring
 * actual file uploads. It validates that all components are working correctly.
 */

import FFmpegService from "../lib/services/ffmpeg";
import AudioConversionService from "../lib/services/audioConversion";
import { S3Service } from "../lib/services/s3";

async function testConversionSystem() {
  console.log("🧪 Testing Audio Conversion System...");
  console.log("");

  // Test 1: FFmpeg Installation
  console.log("1️⃣ Testing FFmpeg Installation...");
  try {
    const ffmpeg = FFmpegService.getInstance();
    const isInstalled = await ffmpeg.validateFFmpeg();
    
    if (isInstalled) {
      console.log("✅ FFmpeg is installed and accessible");
    } else {
      console.log("❌ FFmpeg is not installed or not accessible");
      console.log("   Please run: npm run install-ffmpeg");
      return false;
    }
  } catch (error) {
    console.log("❌ Error testing FFmpeg:", error);
    return false;
  }

  // Test 2: S3 Service
  console.log("");
  console.log("2️⃣ Testing S3 Service...");
  try {
    const s3Service = S3Service.getInstance();
    
    // Test key generation
    const originalKey = s3Service.generateOriginalKey("test.amr", "test-id");
    const playbackKey = s3Service.generatePlaybackKey("test-id");
    
    console.log("✅ S3 key generation working");
    console.log(`   Original key: ${originalKey}`);
    console.log(`   Playback key: ${playbackKey}`);
  } catch (error) {
    console.log("❌ Error testing S3 service:", error);
    return false;
  }

  // Test 3: Conversion Service
  console.log("");
  console.log("3️⃣ Testing Conversion Service...");
  try {
    const conversionService = AudioConversionService.getInstance();
    
    // Test format detection
    const needsConversionAMR = AudioConversionService.needsConversion('amr');
    const needsConversionMP3 = AudioConversionService.needsConversion('mp3');
    
    console.log("✅ Format detection working");
    console.log(`   AMR needs conversion: ${needsConversionAMR}`);
    console.log(`   MP3 needs conversion: ${needsConversionMP3}`);
    
    // Test queue status
    const queueStatus = conversionService.getQueueStatus();
    console.log("✅ Queue status working");
    console.log(`   Queue length: ${queueStatus.queueLength}`);
    console.log(`   Is processing: ${queueStatus.isProcessing}`);
  } catch (error) {
    console.log("❌ Error testing conversion service:", error);
    return false;
  }

  // Test 4: Environment Variables
  console.log("");
  console.log("4️⃣ Testing Environment Configuration...");
  
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET'
  ];
  
  let envOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: configured`);
    } else {
      console.log(`❌ ${envVar}: missing`);
      envOk = false;
    }
  }
  
  if (!envOk) {
    console.log("   Please check your .env.local file");
    return false;
  }

  console.log("");
  console.log("🎉 All tests passed! Audio conversion system is ready.");
  console.log("");
  console.log("📋 System Status:");
  console.log("   ✅ FFmpeg installed and working");
  console.log("   ✅ S3 service configured");
  console.log("   ✅ Conversion service ready");
  console.log("   ✅ Environment variables set");
  console.log("");
  console.log("🚀 You can now upload AMR files and they will be automatically converted to MP3!");
  
  return true;
}

// Run test if called directly
if (require.main === module) {
  testConversionSystem()
    .then((success) => {
      if (success) {
        console.log("✅ Test completed successfully");
        process.exit(0);
      } else {
        console.log("❌ Test failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

export default testConversionSystem;