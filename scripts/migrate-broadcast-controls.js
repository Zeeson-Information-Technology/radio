#!/usr/bin/env node

/**
 * Database Migration Script for Broadcast Controls
 * Adds new fields to existing LiveState documents
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/online-radio';

// LiveState Schema (current structure)
const LiveStateSchema = new mongoose.Schema({
  isLive: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  mutedAt: { type: Date, default: null },
  title: { type: String, default: null },
  lecturer: { type: String, default: null },
  startedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
  
  // Enhanced broadcast control fields
  isMonitoring: { type: Boolean, default: false },
  currentAudioFile: {
    type: {
      id: { type: String, required: true },
      title: { type: String, required: true },
      duration: { type: Number, required: true },
      startedAt: { type: Date, required: true }
    },
    default: null
  },
  lastActivity: { type: Date, default: Date.now }
});

async function migrateBroadcastControls() {
  try {
    console.log('🔄 Starting broadcast controls migration...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const LiveState = mongoose.model('LiveState', LiveStateSchema);
    
    // Find all existing LiveState documents
    const existingStates = await LiveState.find({});
    console.log(`📊 Found ${existingStates.length} existing LiveState documents`);
    
    if (existingStates.length === 0) {
      console.log('ℹ️ No existing LiveState documents found. Creating default document...');
      
      // Create a default LiveState document with new fields
      const defaultState = new LiveState({
        isLive: false,
        isMuted: false,
        mutedAt: null,
        title: null,
        lecturer: null,
        startedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        lastActivity: new Date(),
        updatedAt: new Date()
      });
      
      await defaultState.save();
      console.log('✅ Created default LiveState document with broadcast control fields');
    } else {
      // Update existing documents to include new fields
      let updatedCount = 0;
      
      for (const state of existingStates) {
        let needsUpdate = false;
        
        // Add missing fields with default values
        if (state.mutedAt === undefined) {
          state.mutedAt = null;
          needsUpdate = true;
        }
        
        if (state.isMonitoring === undefined) {
          state.isMonitoring = false;
          needsUpdate = true;
        }
        
        if (state.currentAudioFile === undefined) {
          state.currentAudioFile = null;
          needsUpdate = true;
        }
        
        if (state.lastActivity === undefined) {
          state.lastActivity = state.updatedAt || new Date();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          state.updatedAt = new Date();
          await state.save();
          updatedCount++;
          console.log(`✅ Updated LiveState document: ${state._id}`);
        }
      }
      
      console.log(`📊 Updated ${updatedCount} LiveState documents with new broadcast control fields`);
    }
    
    // Verify the migration
    const verifyStates = await LiveState.find({});
    console.log('🔍 Verifying migration results...');
    
    for (const state of verifyStates) {
      const hasAllFields = [
        'isLive',
        'isMuted', 
        'mutedAt',
        'isMonitoring',
        'currentAudioFile',
        'lastActivity'
      ].every(field => state[field] !== undefined);
      
      if (hasAllFields) {
        console.log(`✅ LiveState ${state._id} has all required fields`);
      } else {
        console.error(`❌ LiveState ${state._id} is missing required fields`);
      }
    }
    
    console.log('🎉 Broadcast controls migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateBroadcastControls()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateBroadcastControls };