/**
 * Audio Access Control Service
 * Handles permission checking and access control for audio files
 * Requirements: 8.5, 8.6, 8.7
 */

import { connectDB } from "@/lib/db";
import AudioRecording from "@/lib/models/AudioRecording";
import AdminUser from "@/lib/models/AdminUser";

export interface AccessControlContext {
  userId: string;
  userRole: string;
  userEmail?: string;
}

export interface AudioAccessResult {
  hasAccess: boolean;
  reason?: string;
  accessLevel?: 'owner' | 'shared' | 'public' | 'admin_override';
}

class AudioAccessControlService {
  private static instance: AudioAccessControlService;
  private accessCache = new Map<string, { result: AudioAccessResult; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AudioAccessControlService {
    if (!AudioAccessControlService.instance) {
      AudioAccessControlService.instance = new AudioAccessControlService();
    }
    return AudioAccessControlService.instance;
  }

  /**
   * Check if user has access to a specific audio file
   * Requirements: 8.5, 8.6, 8.7
   */
  async checkAudioAccess(audioId: string, context: AccessControlContext): Promise<AudioAccessResult> {
    const cacheKey = `${audioId}:${context.userId}:${context.userRole}`;
    
    // Check cache first (performance optimization)
    const cached = this.accessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      await connectDB();
      
      const audioFile = await AudioRecording.findById(audioId)
        .select('visibility sharedWith createdBy')
        .lean();

      if (!audioFile) {
        const result: AudioAccessResult = {
          hasAccess: false,
          reason: 'Audio file not found'
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      const result = this.evaluateAccess(audioFile, context);
      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error checking audio access:', error);
      return {
        hasAccess: false,
        reason: 'Access check failed'
      };
    }
  }

  /**
   * Get all accessible audio files for a user
   * Requirements: 8.5, 8.6, 8.7
   */
  async getAccessibleAudioQuery(context: AccessControlContext): Promise<any> {
    // Super admins see everything (Requirements 8.5)
    if (context.userRole === 'super_admin') {
      return { status: 'active' };
    }

    // Regular admins see public and admin-uploaded files (Requirements 8.6)
    if (context.userRole === 'admin') {
      return {
        status: 'active',
        $or: [
          { visibility: 'public' },
          { visibility: 'shared', sharedWith: context.userId },
          { createdBy: context.userId }
        ]
      };
    }

    // Presenters see based on visibility rules (Requirements 8.7)
    return {
      status: 'active',
      $or: [
        { visibility: 'public' },
        { visibility: 'shared', sharedWith: context.userId },
        { createdBy: context.userId }
      ]
    };
  }

  /**
   * Check if user can modify audio file (sharing, deletion, etc.)
   */
  async checkModifyAccess(audioId: string, context: AccessControlContext): Promise<AudioAccessResult> {
    try {
      await connectDB();
      
      const audioFile = await AudioRecording.findById(audioId)
        .select('createdBy')
        .lean();

      if (!audioFile) {
        return {
          hasAccess: false,
          reason: 'Audio file not found'
        };
      }

      // Super admins can modify anything (Requirements 8.5)
      if (context.userRole === 'super_admin') {
        return {
          hasAccess: true,
          accessLevel: 'admin_override'
        };
      }

      // Users can only modify their own files
      if (audioFile.createdBy.toString() === context.userId) {
        return {
          hasAccess: true,
          accessLevel: 'owner'
        };
      }

      return {
        hasAccess: false,
        reason: 'You can only modify your own audio files'
      };

    } catch (error) {
      console.error('Error checking modify access:', error);
      return {
        hasAccess: false,
        reason: 'Access check failed'
      };
    }
  }

  /**
   * Bulk check access for multiple audio files
   */
  async checkBulkAccess(audioIds: string[], context: AccessControlContext): Promise<Map<string, AudioAccessResult>> {
    const results = new Map<string, AudioAccessResult>();
    
    // Use Promise.all for parallel processing
    const promises = audioIds.map(async (audioId) => {
      const result = await this.checkAudioAccess(audioId, context);
      return { audioId, result };
    });

    const resolvedResults = await Promise.all(promises);
    
    resolvedResults.forEach(({ audioId, result }) => {
      results.set(audioId, result);
    });

    return results;
  }

  /**
   * Clear access cache for a specific user or audio file
   */
  clearCache(userId?: string, audioId?: string): void {
    if (userId && audioId) {
      // Clear specific cache entry
      const keys = Array.from(this.accessCache.keys()).filter(key => 
        key.includes(audioId) && key.includes(userId)
      );
      keys.forEach(key => this.accessCache.delete(key));
    } else if (userId) {
      // Clear all cache entries for a user
      const keys = Array.from(this.accessCache.keys()).filter(key => 
        key.includes(userId)
      );
      keys.forEach(key => this.accessCache.delete(key));
    } else if (audioId) {
      // Clear all cache entries for an audio file
      const keys = Array.from(this.accessCache.keys()).filter(key => 
        key.startsWith(audioId)
      );
      keys.forEach(key => this.accessCache.delete(key));
    } else {
      // Clear entire cache
      this.accessCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.accessCache.size
    };
  }

  /**
   * Private method to evaluate access based on audio file properties
   */
  private evaluateAccess(audioFile: any, context: AccessControlContext): AudioAccessResult {
    // Super admins have access to everything (Requirements 8.5)
    if (context.userRole === 'super_admin') {
      return {
        hasAccess: true,
        accessLevel: 'admin_override'
      };
    }

    // Owner always has access
    if (audioFile.createdBy.toString() === context.userId) {
      return {
        hasAccess: true,
        accessLevel: 'owner'
      };
    }

    // Check visibility-based access
    switch (audioFile.visibility) {
      case 'public':
        return {
          hasAccess: true,
          accessLevel: 'public'
        };

      case 'shared':
        const hasSharedAccess = audioFile.sharedWith.some((id: any) => 
          id.toString() === context.userId
        );
        
        if (hasSharedAccess) {
          return {
            hasAccess: true,
            accessLevel: 'shared'
          };
        }
        
        return {
          hasAccess: false,
          reason: 'Audio file is not shared with you'
        };

      case 'private':
        return {
          hasAccess: false,
          reason: 'Audio file is private'
        };

      default:
        return {
          hasAccess: false,
          reason: 'Unknown visibility setting'
        };
    }
  }

  /**
   * Private method to cache access results
   */
  private cacheResult(key: string, result: AudioAccessResult): void {
    this.accessCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.accessCache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Private method to clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.accessCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.accessCache.delete(key));
  }
}

export default AudioAccessControlService;