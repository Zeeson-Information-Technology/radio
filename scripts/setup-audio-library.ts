#!/usr/bin/env tsx

/**
 * Setup script for Audio Library
 * Creates default categories, tags, and ensures proper database indexes
 */

// Load environment variables from .env.local
import dotenv from "dotenv";
import path from "path";

// Load .env.local from current directory
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import Category from "../lib/models/Category";
import Tag from "../lib/models/Tag";
import AdminUser from "../lib/models/AdminUser";
import AudioRecording from "../lib/models/AudioRecording";
import Lecturer from "../lib/models/Lecturer";

const MONGODB_URI = process.env.MONGODB_URI;

async function setupAudioLibrary() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find a system admin user for initial data
    let systemAdmin = await AdminUser.findOne({ 
      email: "ibrahim.saliman.zainab@gmail.com" 
    });
    
    if (!systemAdmin) {
      // Try to find any super admin
      systemAdmin = await AdminUser.findOne({ role: "super_admin" });
    }
    
    if (!systemAdmin) {
      // Try to find any admin
      systemAdmin = await AdminUser.findOne({ 
        role: { $in: ["super_admin", "admin"] } 
      });
    }
    
    if (!systemAdmin) {
      console.log("⚠️  No admin user found. Please create an admin user first.");
      console.log("   Run: npm run seed:admin");
      process.exit(1);
    }

    console.log(`📋 Using admin: ${systemAdmin.name} (${systemAdmin.email})`);

    // 1. Create default categories
    console.log("\n📂 Setting up default categories...");
    await Category.createDefaults();
    
    const categoryCount = await Category.countDocuments();
    console.log(`✅ Categories ready: ${categoryCount} total`);

    // 2. Create default tags
    console.log("\n🏷️  Setting up default tags...");
    await Tag.createDefaults(systemAdmin._id);
    
    const tagCount = await Tag.countDocuments();
    console.log(`✅ Tags ready: ${tagCount} total`);

    // 3. Ensure database indexes are created
    console.log("\n🔍 Creating database indexes...");
    
    // AudioRecording indexes
    try {
      await AudioRecording.createIndexes();
      console.log("✅ AudioRecording indexes created");
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log("⚠️  AudioRecording indexes already exist (skipping)");
      } else {
        throw error;
      }
    }
    
    // Lecturer indexes
    try {
      await Lecturer.createIndexes();
      console.log("✅ Lecturer indexes created");
    } catch (error: any) {
      if (error.code === 85) {
        console.log("⚠️  Lecturer indexes already exist (skipping)");
      } else {
        throw error;
      }
    }
    
    // Category indexes
    try {
      await Category.createIndexes();
      console.log("✅ Category indexes created");
    } catch (error: any) {
      if (error.code === 85) {
        console.log("⚠️  Category indexes already exist (skipping)");
      } else {
        throw error;
      }
    }
    
    // Tag indexes
    try {
      await Tag.createIndexes();
      console.log("✅ Tag indexes created");
    } catch (error: any) {
      if (error.code === 85) {
        console.log("⚠️  Tag indexes already exist (skipping)");
      } else {
        throw error;
      }
    }

    // 4. Display setup summary
    console.log("\n📊 Audio Library Setup Summary:");
    console.log("================================");
    console.log(`📂 Categories: ${categoryCount}`);
    console.log(`🏷️  Tags: ${tagCount}`);
    console.log(`👤 System Admin: ${systemAdmin.name}`);
    console.log("🔍 Database indexes: Created");
    
    console.log("\n✨ Audio Library setup completed successfully!");
    console.log("\n🚀 Next steps:");
    console.log("   1. Start implementing Phase 2: AWS S3 integration");
    console.log("   2. Create upload API endpoints");
    console.log("   3. Build admin upload interface");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Database connection closed");
  }
}

// Run the setup
setupAudioLibrary();