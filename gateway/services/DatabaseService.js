/**
 * Database Service for MongoDB operations
 */

const mongoose = require('mongoose');
const config = require('../config');

// MongoDB LiveState Schema - Enhanced with Broadcast Controls
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
          updatedAt: new Date(),
          lastActivity: new Date()
        });
      } else {
        console.log(`📊 Updating existing LiveState document`);
        console.log(`📊 Before update: isLive=${liveState.isLive}, isMuted=${liveState.isMuted}, isMonitoring=${liveState.isMonitoring}`);
        
        // Update existing state
        Object.assign(liveState, stateData);
        liveState.updatedAt = new Date();
        liveState.lastActivity = new Date();
        
        console.log(`📊 After assign: isLive=${liveState.isLive}, isMuted=${liveState.isMuted}, isMonitoring=${liveState.isMonitoring}`);
      }

      const savedState = await liveState.save();
      console.log(`📊 Successfully saved LiveState: isLive=${savedState.isLive}, isMuted=${savedState.isMuted}, isMonitoring=${savedState.isMonitoring}`);
      console.log(`📊 Updated live state: ${stateData.isLive ? 'LIVE' : 'OFFLINE'}`);
      
      if (stateData.isLive) {
        console.log(`📺 Title: ${stateData.title}`);
        console.log(`🎙️ Lecturer: ${stateData.lecturer}`);
        console.log(`🔇 Muted: ${stateData.isMuted}`);
        console.log(`🎧 Monitoring: ${stateData.isMonitoring}`);
        if (stateData.currentAudioFile) {
          console.log(`🎵 Playing: ${stateData.currentAudioFile.title}`);
        }
      }
      
      // Return the saved state for verification
      return savedState;
      
    } catch (error) {
      console.error('❌ Error updating live state:', error);
      throw error;
    }
  }

  // New methods for enhanced broadcast control state management
  async updateMuteState(isMuted, mutedAt = null) {
    try {
      const updateData = {
        isMuted,
        mutedAt: isMuted ? (mutedAt || new Date()) : null,
        lastActivity: new Date()
      };
      
      console.log(`📊 Updating mute state: isMuted=${isMuted}, mutedAt=${updateData.mutedAt}`);
      return await this.updateLiveState(updateData);
    } catch (error) {
      console.error('❌ Error updating mute state:', error);
      throw error;
    }
  }

  async updateMonitorState(isMonitoring) {
    try {
      const updateData = {
        isMonitoring,
        lastActivity: new Date()
      };
      
      console.log(`📊 Updating monitor state: isMonitoring=${isMonitoring}`);
      return await this.updateLiveState(updateData);
    } catch (error) {
      console.error('❌ Error updating monitor state:', error);
      throw error;
    }
  }

  async updateAudioPlaybackState(audioFileData) {
    try {
      const updateData = {
        currentAudioFile: audioFileData,
        lastActivity: new Date()
      };
      
      console.log(`📊 Updating audio playback state:`, audioFileData ? audioFileData.title : 'stopped');
      return await this.updateLiveState(updateData);
    } catch (error) {
      console.error('❌ Error updating audio playback state:', error);
      throw error;
    }
  }

  async resetBroadcastControlState() {
    try {
      const updateData = {
        isLive: false,
        isMuted: false,
        mutedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        title: null,
        lecturer: null,
        startedAt: null,
        lastActivity: new Date()
      };
      
      console.log(`📊 Resetting all broadcast control state`);
      return await this.updateLiveState(updateData);
    } catch (error) {
      console.error('❌ Error resetting broadcast control state:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
