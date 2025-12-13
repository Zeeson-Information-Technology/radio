/**
 * Update AudioRecording schema to support all audio formats
 * Run this script to sync the database schema with the latest format enum
 */

import { config } from "dotenv";
import { connectDB } from "../lib/db";
import AudioRecording from "../lib/models/AudioRecording";

// Load environment variables
config({ path: ".env.local" });

async function updateAudioSchema() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();
    
    console.log("🔄 Updating AudioRecording schema...");
    
    // Drop the existing collection to force schema update
    // This is safe for development but be careful in production
    const collection = AudioRecording.collection;
    
    // Check if collection exists
    const collections = await collection.db.listCollections({ name: 'audiorecordings' }).toArray();
    
    if (collections.length > 0) {
      console.log("📋 Found existing AudioRecording collection");
      
      // Get current documents count
      const count = await AudioRecording.countDocuments();
      console.log(`📊 Current documents: ${count}`);
      
      if (count === 0) {
        // Safe to drop if no documents
        await collection.drop();
        console.log("🗑️ Dropped empty collection to update schema");
      } else {
        console.log("⚠️ Collection has documents. Schema will be updated on next document save.");
      }
    }
    
    // Create a test document to ensure schema is applied
    console.log("🔄 Validating new schema...");
    
    // This will create the collection with the new schema
    const testDoc = new AudioRecording({
      title: "Schema Test",
      lecturer: "507f1f77bcf86cd799439011", // dummy ObjectId
      lecturerName: "Test Lecturer",
      category: "507f1f77bcf86cd799439011", // dummy ObjectId
      type: "lecture",
      fileName: "test.amr",
      originalFileName: "test.amr",
      fileSize: 1000,
      duration: 60,
      format: "amr", // Test the AMR format
      storageKey: "test-key",
      storageUrl: "https://test.com/test.amr",
      createdBy: "507f1f77bcf86cd799439011" // dummy ObjectId
    });
    
    // Validate without saving
    await testDoc.validate();
    console.log("✅ Schema validation successful - AMR format is now supported");
    
    console.log("🎉 Schema update completed successfully!");
    
  } catch (error) {
    console.error("❌ Schema update failed:", error);
    process.exit(1);
  }
}

// Run the update
updateAudioSchema()
  .then(() => {
    console.log("✅ Update script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Update script failed:", error);
    process.exit(1);
  });