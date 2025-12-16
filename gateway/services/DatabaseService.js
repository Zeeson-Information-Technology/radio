/**
 * Database Service for MongoDB operations
 */

const mongoose = require('mongoose');
const config = require('../config');

// MongoDB LiveState Schema - Simple with Mute
const LiveStateSchema = new mongoose.Schema({
  isLive: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  title: { type: String, default: null },
  lecturer: { type: String, default: null },
  startedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
});

const LiveState = mongoose.models.LiveState || mongoose.model('LiveState', LiveStateSchema);

// AudioRecording Schema for conversion
const AudioRecordingSchema = new mongoose.Schema({
  title: String,
  lecturer: String,
  format: String,
  storageUrl: String,
  conversionStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
  },
  originalKey: String,
  playbackKey: String,
  playbackUrl: String,
  conversionError: String,
  conversionAttempts: { type: Number, default: 0 },
  lastConversionAttempt: Date,
  createdAt: { type: Date, default: Date.now }
});

const AudioRecording = mongoose.models.AudioRecording || mongoose.model('AudioRecording', AudioRecordingSchema);

class DatabaseService {
  constructor() {
    this.LiveState = LiveState;
    this.AudioRecording = AudioRecording;
  }

  async connect() {
    try {
      await mongoose.connect(config.MONGODB_URI);
      console.log('📊 Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async getLiveState() {
    try {
      return await this.LiveState.findOne();
    } catch (error) {
      console.error('❌ Error getting live state:', error);
      return null;
    }
  }

  async updateLiveState(stateData) {
    try {
      console.log(`📊 updateLiveState called with:`, stateData);
      
      // Find existing LiveState or create new one
      let liveState = await this.LiveState.findOne();
      
      if (!liveState) {
        console.log(`📊 Creating new LiveState document`);
        liveState = new this.LiveState({
          mount: config.ICECAST_MOUNT,
          ...stateData,
          updatedAt: new Date()
        });
      } else {
        console.log(`📊 Updating existing LiveState document`);
        console.log(`📊 Before update: isLive=${liveState.isLive}, isMuted=${liveState.isMuted}`);
        
        // Update existing state
        Object.assign(liveState, stateData);
        liveState.updatedAt = new Date();
        
        console.log(`📊 After assign: isLive=${liveState.isLive}, isMuted=${liveState.isMuted}`);
      }

      const savedState = await liveState.save();
      console.log(`📊 Successfully saved LiveState: isLive=${savedState.isLive}, isMuted=${savedState.isMuted}`);
      console.log(`📊 Updated live state: ${stateData.isLive ? 'LIVE' : 'OFFLINE'}`);
      
      if (stateData.isLive) {
        console.log(`📺 Title: ${stateData.title}`);
        console.log(`🎙️ Lecturer: ${stateData.lecturer}`);
        console.log(`🔇 Muted: ${stateData.isMuted}`);
      }
      
      // Return the saved state for verification
      return savedState;
      
    } catch (error) {
      console.error('❌ Error updating live state:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;