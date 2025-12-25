/**
 * Audio State Manager Service
 * Feature: live-broadcast-controls
 * 
 * Provides centralized state tracking for broadcast control operations including:
 * - Updating and persisting broadcast control states
 * - State recovery mechanisms for reconnection scenarios
 * - State validation and consistency checks
 * - Separation of audio playback state from database live state
 */

class AudioStateManager {
  constructor(databaseService) {
    this.databaseService = databaseService;
    
    // In-memory state for audio playback (Requirements 6.3)
    this.audioPlaybackState = {
      isPlaying: false,
      currentFile: null,
      startedAt: null,
      progress: 0
    };
    
    // State recovery cache
    this.stateCache = new Map();
    
    console.log('🎛️ AudioStateManager initialized');
  }

  /**
   * Update mute state in database
   * Requirements 6.1: Database mute state consistency
   */
  async updateMuteState(isMuted, sessionId = null) {
    try {
      console.log(`🔇 Updating mute state: ${isMuted}`);
      
      const updateData = {
        isMuted,
        mutedAt: isMuted ? new Date() : null,
        lastActivity: new Date()
      };

      // Update database
      await this.databaseService.updateLiveState(updateData);
      
      // Cache state for recovery
      if (sessionId) {
        this.cacheState(sessionId, { mute: updateData });
      }
      
      console.log(`✅ Mute state updated: ${isMuted}`);
      return updateData;
    } catch (error) {
      console.error('❌ Error updating mute state:', error);
      throw new Error('Failed to update mute state');
    }
  }

  /**
   * Update unmute state in database
   * Requirements 6.2: Database unmute state consistency
   */
  async updateUnmuteState(sessionId = null) {
    try {
      console.log('🔊 Updating unmute state');
      
      const updateData = {
        isMuted: false,
        mutedAt: null,
        lastActivity: new Date()
      };

      // Update database
      await this.databaseService.updateLiveState(updateData);
      
      // Cache state for recovery
      if (sessionId) {
        this.cacheState(sessionId, { mute: updateData });
      }
      
      console.log('✅ Unmute state updated');
      return updateData;
    } catch (error) {
      console.error('❌ Error updating unmute state:', error);
      throw new Error('Failed to update unmute state');
    }
  }

  /**
   * Update monitoring state
   * Requirements 6.1, 6.2: State management for monitoring
   */
  async updateMonitorState(isMonitoring, sessionId = null) {
    try {
      console.log(`🎧 Updating monitor state: ${isMonitoring}`);
      
      const updateData = {
        isMonitoring,
        lastActivity: new Date()
      };

      // Update database
      await this.databaseService.updateLiveState(updateData);
      
      // Cache state for recovery
      if (sessionId) {
        this.cacheState(sessionId, { monitor: updateData });
      }
      
      console.log(`✅ Monitor state updated: ${isMonitoring}`);
      return updateData;
    } catch (error) {
      console.error('❌ Error updating monitor state:', error);
      throw new Error('Failed to update monitor state');
    }
  }

  /**
   * Update audio playback state (in-memory only)
   * Requirements 6.3: Audio playback state separation
   */
  updateAudioPlaybackState(playbackData) {
    try {
      console.log('🎵 Updating audio playback state:', playbackData);
      
      // Update in-memory state only (not database)
      this.audioPlaybackState = {
        ...this.audioPlaybackState,
        ...playbackData,
        lastUpdated: new Date()
      };
      
      console.log('✅ Audio playback state updated');
      return this.audioPlaybackState;
    } catch (error) {
      console.error('❌ Error updating audio playback state:', error);
      throw new Error('Failed to update audio playback state');
    }
  }

  /**
   * Start audio playback tracking
   * Requirements 6.3: Audio playback state separation
   */
  startAudioPlayback(fileData) {
    return this.updateAudioPlaybackState({
      isPlaying: true,
      currentFile: {
        id: fileData.id,
        title: fileData.title,
        duration: fileData.duration
      },
      startedAt: new Date(),
      progress: 0
    });
  }

  /**
   * Stop audio playback tracking
   * Requirements 6.3: Audio playback state separation
   */
  stopAudioPlayback() {
    return this.updateAudioPlaybackState({
      isPlaying: false,
      currentFile: null,
      startedAt: null,
      progress: 0
    });
  }

  /**
   * Update audio playback progress
   * Requirements 6.3: Audio playback state separation
   */
  updateAudioProgress(progress) {
    return this.updateAudioPlaybackState({
      progress: Math.max(0, Math.min(100, progress))
    });
  }

  /**
   * Get current audio playback state
   * Requirements 6.3: Audio playback state separation
   */
  getAudioPlaybackState() {
    return { ...this.audioPlaybackState };
  }

  /**
   * Restore state on reconnection
   * Requirements 6.4: State recovery on reconnection
   */
  async restoreState(sessionId, userId) {
    try {
      console.log(`🔄 Restoring state for session: ${sessionId}`);
      
      // Get current database state
      const liveState = await this.databaseService.getLiveState();
      
      if (!liveState || !liveState.isLive) {
        console.log('⚠️ No active live state to restore');
        return null;
      }
      
      // Check if this session belongs to the user
      const sessionUser = this.getSessionUser(sessionId);
      if (sessionUser && sessionUser.userId !== userId) {
        throw new Error('Session belongs to different user');
      }
      
      // Get cached state if available
      const cachedState = this.getCachedState(sessionId);
      
      // Merge database state with cached state
      const restoredState = {
        database: {
          isLive: liveState.isLive,
          isMuted: liveState.isMuted,
          mutedAt: liveState.mutedAt,
          isMonitoring: liveState.isMonitoring,
          title: liveState.title,
          lecturer: liveState.lecturer,
          startedAt: liveState.startedAt,
          lastActivity: liveState.lastActivity
        },
        audioPlayback: this.getAudioPlaybackState(),
        cached: cachedState
      };
      
      console.log('✅ State restored successfully');
      return restoredState;
    } catch (error) {
      console.error('❌ Error restoring state:', error);
      throw new Error('Failed to restore state');
    }
  }

  /**
   * Reset all state flags on session end
   * Requirements 6.5: State cleanup on session end
   */
  async resetSessionState(sessionId) {
    try {
      console.log(`🧹 Resetting session state: ${sessionId}`);
      
      // Reset database state
      await this.databaseService.updateLiveState({
        isLive: false,
        isMuted: false,
        mutedAt: null,
        isMonitoring: false,
        currentAudioFile: null,
        title: null,
        lecturer: null,
        startedAt: null,
        lastActivity: new Date()
      });
      
      // Reset in-memory audio playback state
      this.stopAudioPlayback();
      
      // Clear cached state
      this.clearCachedState(sessionId);
      
      console.log('✅ Session state reset successfully');
      return true;
    } catch (error) {
      console.error('❌ Error resetting session state:', error);
      throw new Error('Failed to reset session state');
    }
  }

  /**
   * Validate state consistency
   * Requirements 6.1, 6.2: State validation and consistency checks
   */
  async validateStateConsistency(sessionId = null) {
    try {
      console.log('🔍 Validating state consistency');
      
      const liveState = await this.databaseService.getLiveState();
      const issues = [];
      
      // Check mute state consistency
      if (liveState.isMuted && !liveState.mutedAt) {
        issues.push('Muted state without mutedAt timestamp');
      }
      
      if (!liveState.isMuted && liveState.mutedAt) {
        issues.push('Unmuted state with mutedAt timestamp');
      }
      
      // Check live state consistency
      if (liveState.isLive && !liveState.startedAt) {
        issues.push('Live state without startedAt timestamp');
      }
      
      if (!liveState.isLive && liveState.startedAt) {
        issues.push('Offline state with startedAt timestamp');
      }
      
      // Check activity timestamp
      if (liveState.isLive && liveState.lastActivity) {
        const timeSinceActivity = Date.now() - new Date(liveState.lastActivity).getTime();
        if (timeSinceActivity > 30 * 60 * 1000) { // 30 minutes
          issues.push('Live state with stale activity timestamp');
        }
      }
      
      const isConsistent = issues.length === 0;
      
      if (isConsistent) {
        console.log('✅ State consistency validated');
      } else {
        console.warn('⚠️ State consistency issues found:', issues);
      }
      
      return {
        isConsistent,
        issues,
        state: liveState,
        audioPlayback: this.getAudioPlaybackState()
      };
    } catch (error) {
      console.error('❌ Error validating state consistency:', error);
      throw new Error('Failed to validate state consistency');
    }
  }

  /**
   * Get full current state
   */
  async getFullState() {
    try {
      const liveState = await this.databaseService.getLiveState();
      
      return {
        database: liveState,
        audioPlayback: this.getAudioPlaybackState(),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting full state:', error);
      throw new Error('Failed to get full state');
    }
  }

  /**
   * Cache state for recovery
   */
  cacheState(sessionId, stateData) {
    if (!this.stateCache.has(sessionId)) {
      this.stateCache.set(sessionId, {});
    }
    
    const cached = this.stateCache.get(sessionId);
    Object.assign(cached, stateData, { lastCached: new Date() });
    
    console.log(`💾 State cached for session: ${sessionId}`);
  }

  /**
   * Get cached state
   */
  getCachedState(sessionId) {
    return this.stateCache.get(sessionId) || null;
  }

  /**
   * Clear cached state
   */
  clearCachedState(sessionId) {
    const cleared = this.stateCache.delete(sessionId);
    if (cleared) {
      console.log(`🗑️ Cached state cleared for session: ${sessionId}`);
    }
    return cleared;
  }

  /**
   * Set session user for validation
   */
  setSessionUser(sessionId, user) {
    this.cacheState(sessionId, { user });
  }

  /**
   * Get session user
   */
  getSessionUser(sessionId) {
    const cached = this.getCachedState(sessionId);
    return cached ? cached.user : null;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleanedCount = 0;
    
    for (const [sessionId, cached] of this.stateCache.entries()) {
      if (cached.lastCached && (now - cached.lastCached.getTime()) > maxAge) {
        this.stateCache.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
    
    return cleanedCount;
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    // Clean up every hour
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 60 * 1000);
    
    console.log('🕐 Cache cleanup scheduled');
  }

  /**
   * Stop periodic cache cleanup
   */
  stopCacheCleanup() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
      console.log('⏹️ Cache cleanup stopped');
    }
  }

  /**
   * Get state statistics
   */
  getStateStatistics() {
    return {
      cacheSize: this.stateCache.size,
      audioPlaybackActive: this.audioPlaybackState.isPlaying,
      lastAudioUpdate: this.audioPlaybackState.lastUpdated,
      cacheCleanupActive: !!this.cacheCleanupInterval
    };
  }

  /**
   * Dispose of the state manager
   */
  dispose() {
    console.log('🧹 Disposing AudioStateManager');
    
    // Stop cache cleanup
    this.stopCacheCleanup();
    
    // Clear all cached state
    this.stateCache.clear();
    
    // Reset audio playback state
    this.audioPlaybackState = {
      isPlaying: false,
      currentFile: null,
      startedAt: null,
      progress: 0
    };
    
    console.log('✅ AudioStateManager disposed');
  }
}

module.exports = AudioStateManager;