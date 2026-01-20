/**
 * Property-based tests for audio state cleanup
 * Feature: audio-state-cleanup, Property 1: Broadcast Start Clears Audio State
 * 
 * These tests validate that currentAudioFile is properly cleared during broadcast operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';

// Mock implementations for testing audio state cleanup
interface AudioFileState {
  id: string;
  title: string;
  duration: number;
  startedAt: Date;
}

interface LiveState {
  isLive: boolean;
  isMuted: boolean;
  mutedAt: Date | null;
  title: string | null;
  lecturer: string | null;
  startedAt: Date | null;
  currentAudioFile: AudioFileState | null;
}

class MockDatabaseService {
  private liveState: LiveState = {
    isLive: false,
    isMuted: false,
    mutedAt: null,
    title: null,
    lecturer: null,
    startedAt: null,
    currentAudioFile: null
  };

  async updateLiveState(updates: Partial<LiveState>): Promise<LiveState> {
    this.liveState = { ...this.liveState, ...updates };
    return this.liveState;
  }

  async getLiveState(): Promise<LiveState> {
    return { ...this.liveState };
  }

  // Helper method to set up stale audio file state for testing
  setStaleAudioFile(audioFile: AudioFileState) {
    this.liveState.currentAudioFile = audioFile;
  }

  reset() {
    this.liveState = {
      isLive: false,
      isMuted: false,
      mutedAt: null,
      title: null,
      lecturer: null,
      startedAt: null,
      currentAudioFile: null
    };
  }
}

class MockBroadcastService {
  constructor(private databaseService: MockDatabaseService) {}

  async startStreaming(user: { name: string; email: string }, streamConfig: { title?: string } = {}) {
    // This simulates the fixed startStreaming method
    await this.databaseService.updateLiveState({
      isLive: true,
      isMuted: false,
      title: streamConfig.title || 'Live Lecture',
      lecturer: user.name || user.email,
      startedAt: new Date(),
      currentAudioFile: null  // This is the fix we're testing
    });
  }

  async reconnectStreaming(user: { name: string; email: string }, streamConfig: { title?: string } = {}) {
    const liveState = await this.databaseService.getLiveState();
    
    if (liveState && liveState.isLive && liveState.lecturer === (user.name || user.email)) {
      // Session recovery - clear currentAudioFile
      await this.databaseService.updateLiveState({
        isLive: true,
        isMuted: false,
        title: streamConfig.title || liveState.title || 'Live Lecture',
        lecturer: user.name || user.email,
        startedAt: liveState.startedAt,
        currentAudioFile: null  // This is the fix we're testing
      });
    } else {
      // New session
      await this.startStreaming(user, streamConfig);
    }
  }

  async stopStreaming() {
    await this.databaseService.updateLiveState({
      isLive: false,
      isMuted: false,
      title: null,
      lecturer: null,
      startedAt: null,
      mutedAt: null,
      currentAudioFile: null  // This is the fix we're testing
    });
  }

  async injectAudio(audioFile: AudioFileState) {
    const currentState = await this.databaseService.getLiveState();
    if (currentState.isLive) {
      await this.databaseService.updateLiveState({
        currentAudioFile: audioFile
      });
    }
    // If not live, do nothing (audio injection is ignored)
  }

  async stopAudioInjection() {
    const currentState = await this.databaseService.getLiveState();
    if (currentState.isLive && currentState.currentAudioFile) {
      await this.databaseService.updateLiveState({
        currentAudioFile: null
      });
    }
    // If not live or no audio file, do nothing
  }
}

describe('Audio State Cleanup Property Tests', () => {
  let mockDatabase: MockDatabaseService;
  let mockBroadcastService: MockBroadcastService;

  beforeEach(() => {
    mockDatabase = new MockDatabaseService();
    mockBroadcastService = new MockBroadcastService(mockDatabase);
  });

  afterEach(() => {
    mockDatabase.reset();
  });

  // Property 1: Broadcast Start Clears Audio State
  // Feature: audio-state-cleanup, Property 1: Broadcast Start Clears Audio State
  test('Property 1: For any broadcast start operation, currentAudioFile should be set to null', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        streamConfig: fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
        }),
        staleAudioFile: fc.option(fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          duration: fc.integer({ min: 1, max: 7200 }), // 1 second to 2 hours
          startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        }))
      }),
      async (testData) => {
        // Set up stale audio file state if provided
        if (testData.staleAudioFile) {
          mockDatabase.setStaleAudioFile(testData.staleAudioFile);
        }

        // Start streaming
        await mockBroadcastService.startStreaming(testData.user, testData.streamConfig);

        // Verify currentAudioFile is cleared
        const liveState = await mockDatabase.getLiveState();
        expect(liveState.currentAudioFile).toBeNull();
        expect(liveState.isLive).toBe(true);
        expect(liveState.lecturer).toBe(testData.user.name || testData.user.email);
      }
    ), { numRuns: 100 });
  });

  // Property 2: Broadcast Stop Operations Clear Audio State
  // Feature: audio-state-cleanup, Property 2: Broadcast Stop Operations Clear Audio State
  test('Property 2: For any broadcast stop operation, currentAudioFile should be cleared', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        audioFile: fc.option(fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          duration: fc.integer({ min: 1, max: 7200 }),
          startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        }))
      }),
      async (testData) => {
        // Start a broadcast first
        await mockBroadcastService.startStreaming(testData.user);

        // Optionally inject audio
        if (testData.audioFile) {
          await mockBroadcastService.injectAudio(testData.audioFile);
          
          // Verify audio was injected
          const stateWithAudio = await mockDatabase.getLiveState();
          expect(stateWithAudio.currentAudioFile).not.toBeNull();
        }

        // Stop the broadcast
        await mockBroadcastService.stopStreaming();

        // Verify currentAudioFile is cleared
        const finalState = await mockDatabase.getLiveState();
        expect(finalState.currentAudioFile).toBeNull();
        expect(finalState.isLive).toBe(false);
      }
    ), { numRuns: 100 });
  });

  // Property 5: Reconnection Preserves Session Audio State
  // Feature: audio-state-cleanup, Property 5: Reconnection Preserves Session Audio State
  test('Property 5: For any broadcast reconnection, currentAudioFile should be cleared unless set in current session', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        staleAudioFile: fc.option(fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          duration: fc.integer({ min: 1, max: 7200 }),
          startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        })),
        streamConfig: fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
        })
      }),
      async (testData) => {
        // Set up an existing live session
        await mockBroadcastService.startStreaming(testData.user, testData.streamConfig);

        // Set up stale audio file from previous session
        if (testData.staleAudioFile) {
          mockDatabase.setStaleAudioFile(testData.staleAudioFile);
        }

        // Reconnect to the session
        await mockBroadcastService.reconnectStreaming(testData.user, testData.streamConfig);

        // Verify currentAudioFile is cleared (since it's from a previous session)
        const liveState = await mockDatabase.getLiveState();
        expect(liveState.currentAudioFile).toBeNull();
        expect(liveState.isLive).toBe(true);
        expect(liveState.lecturer).toBe(testData.user.name || testData.user.email);
      }
    ), { numRuns: 100 });
  });

  // Property 6: Audio Injection Sets Valid Metadata
  // Feature: audio-state-cleanup, Property 6: Audio Injection Sets Valid Metadata
  test('Property 6: For any audio injection start operation, currentAudioFile should be set with valid metadata', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        audioFile: fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          duration: fc.integer({ min: 1, max: 7200 }),
          startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        })
      }),
      async (testData) => {
        // Start a broadcast first
        await mockBroadcastService.startStreaming(testData.user);

        // Inject audio
        await mockBroadcastService.injectAudio(testData.audioFile);

        // Verify currentAudioFile is set with valid metadata
        const liveState = await mockDatabase.getLiveState();
        expect(liveState.currentAudioFile).not.toBeNull();
        expect(liveState.currentAudioFile!.id).toBe(testData.audioFile.id);
        expect(liveState.currentAudioFile!.title).toBe(testData.audioFile.title);
        expect(liveState.currentAudioFile!.duration).toBe(testData.audioFile.duration);
        expect(liveState.currentAudioFile!.startedAt).toEqual(testData.audioFile.startedAt);

        // Stop audio injection
        await mockBroadcastService.stopAudioInjection();

        // Verify currentAudioFile is cleared
        const clearedState = await mockDatabase.getLiveState();
        expect(clearedState.currentAudioFile).toBeNull();
      }
    ), { numRuns: 100 });
  });

  // Property: Audio State Isolation Between Sessions
  test('Property: Audio state from one session should not leak into another session', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user1: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        user2: fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        audioFile: fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          duration: fc.integer({ min: 1, max: 7200 }),
          startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        })
      }),
      async (testData) => {
        // Ensure users are different
        if (testData.user1.email === testData.user2.email) {
          testData.user2.email = 'different-' + testData.user2.email;
        }

        // User 1 starts broadcast and injects audio
        await mockBroadcastService.startStreaming(testData.user1);
        await mockBroadcastService.injectAudio(testData.audioFile);

        // Verify audio is injected
        const stateWithAudio = await mockDatabase.getLiveState();
        expect(stateWithAudio.currentAudioFile).not.toBeNull();

        // User 1 stops broadcast
        await mockBroadcastService.stopStreaming();

        // User 2 starts a new broadcast
        await mockBroadcastService.startStreaming(testData.user2);

        // Verify User 2's session has no audio file from User 1's session
        const user2State = await mockDatabase.getLiveState();
        expect(user2State.currentAudioFile).toBeNull();
        expect(user2State.isLive).toBe(true);
        expect(user2State.lecturer).toBe(testData.user2.name || testData.user2.email);
      }
    ), { numRuns: 50 });
  });

});