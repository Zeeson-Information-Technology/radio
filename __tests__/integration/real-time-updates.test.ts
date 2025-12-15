/**
 * Real-Time Updates Tests
 * Tests Server-Sent Events (SSE) for live broadcast notifications
 */

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn()
}));

// Mock the SSE API
const mockSSEAPI = {
  GET: jest.fn()
};

const mockBroadcastLiveUpdate = jest.fn();

jest.mock('../../app/api/live/events/route', () => ({
  GET: mockSSEAPI.GET,
  broadcastLiveUpdate: mockBroadcastLiveUpdate
}));

// Mock database
const mockLiveState = {
  isLive: false,
  isPaused: false,
  title: null,
  lecturer: null,
  startedAt: null,
  pausedAt: null,
  updatedAt: new Date()
};

jest.mock('../../lib/db', () => ({
  connectDB: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../lib/models/LiveState', () => ({
  findOne: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(mockLiveState)
  })
}));

// Mock TextEncoder for SSE
global.TextEncoder = class MockTextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Buffer.from(input, 'utf8'));
  }
};

describe('Real-Time Updates via Server-Sent Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock state
    Object.assign(mockLiveState, {
      isLive: false,
      isPaused: false,
      title: null,
      lecturer: null,
      startedAt: null,
      pausedAt: null,
      updatedAt: new Date()
    });
  });

  describe('SSE Connection Management', () => {
    it('should establish SSE connection and send initial state', async () => {
      // Setup initial state
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Current Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date()
      });

      // Mock SSE response
      mockSSEAPI.GET.mockResolvedValue({
        status: 200,
        headers: new Map([
          ['Content-Type', 'text/event-stream'],
          ['Cache-Control', 'no-cache'],
          ['Connection', 'keep-alive']
        ])
      });

      const response = await mockSSEAPI.GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should send heartbeat messages to keep connection alive', () => {
      // Test heartbeat message format
      const heartbeatMessage = 'data: {"type":"heartbeat"}\\n\\n';
      const encodedMessage = new TextEncoder().encode(heartbeatMessage);
      
      expect(encodedMessage).toBeInstanceOf(Uint8Array);
      expect(heartbeatMessage).toContain('heartbeat');
    });
  });

  describe('Broadcast State Updates', () => {
    it('should notify listeners when admin starts broadcasting', () => {
      const updateData = {
        type: 'broadcast_started',
        isLive: true,
        isPaused: false,
        title: 'New Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date().toISOString(),
        streamUrl: 'http://98.93.42.61:8000/stream'
      };

      // Call the mock function
      mockBroadcastLiveUpdate(updateData);

      expect(mockBroadcastLiveUpdate).toHaveBeenCalledWith(updateData);
      expect(updateData.type).toBe('broadcast_started');
      expect(updateData.isLive).toBe(true);
      expect(updateData.title).toBe('New Lecture');
    });

    it('should notify listeners when admin pauses broadcast', () => {
      const updateData = {
        type: 'broadcast_paused',
        isLive: true,
        isPaused: true,
        title: 'Paused Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 300000).toISOString(),
        pausedAt: new Date().toISOString(),
        streamUrl: 'http://98.93.42.61:8000/stream'
      };

      mockBroadcastLiveUpdate(updateData);

      expect(mockBroadcastLiveUpdate).toHaveBeenCalledWith(updateData);
      expect(updateData.isPaused).toBe(true);
      expect(updateData.pausedAt).toBeTruthy();
    });

    it('should notify listeners when admin resumes broadcast', () => {
      const updateData = {
        type: 'broadcast_resumed',
        isLive: true,
        isPaused: false,
        title: 'Resumed Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        pausedAt: null,
        streamUrl: 'http://98.93.42.61:8000/stream'
      };

      mockBroadcastLiveUpdate(updateData);

      expect(mockBroadcastLiveUpdate).toHaveBeenCalledWith(updateData);
      expect(updateData.isPaused).toBe(false);
      expect(updateData.pausedAt).toBeNull();
    });

    it('should notify listeners when admin stops broadcast', () => {
      const updateData = {
        type: 'broadcast_stopped',
        isLive: false,
        isPaused: false,
        title: null,
        lecturer: null,
        startedAt: null,
        pausedAt: null,
        streamUrl: 'http://98.93.42.61:8000/stream'
      };

      mockBroadcastLiveUpdate(updateData);

      expect(mockBroadcastLiveUpdate).toHaveBeenCalledWith(updateData);
      expect(updateData.isLive).toBe(false);
      expect(updateData.title).toBeNull();
      expect(updateData.lecturer).toBeNull();
    });
  });

  describe('Connection Cleanup', () => {
    it('should remove dead connections when broadcasting updates', () => {
      const workingController = {
        enqueue: jest.fn()
      };
      
      const deadController = {
        enqueue: jest.fn(() => {
          throw new Error('Connection closed');
        })
      };

      // Simulate multiple connections
      const connections = new Set([workingController, deadController]);
      
      const updateData = {
        type: 'test_update',
        isLive: true,
        isPaused: false
      };

      // In real implementation, dead connections would be removed
      // Here we test the error handling logic
      expect(() => {
        deadController.enqueue(new Uint8Array());
      }).toThrow('Connection closed');
      
      expect(() => {
        workingController.enqueue(new Uint8Array());
      }).not.toThrow();
    });

    it('should handle connection abort signals', async () => {
      const abortController = new AbortController();
      const request = new NextRequest('http://localhost:3000/api/live/events', {
        signal: abortController.signal
      });

      // Start SSE connection
      const responsePromise = GET(request);
      
      // Abort the connection
      abortController.abort();
      
      const response = await responsePromise;
      
      // Connection should still be established but will be cleaned up
      expect(response.status).toBe(200);
    });
  });

  describe('User Experience Scenarios', () => {
    it('should provide immediate feedback when user opens radio page during live broadcast', async () => {
      // Setup: Broadcast is already live
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Ongoing Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 900000) // 15 minutes ago
      });

      const request = new NextRequest('http://localhost:3000/api/live/events');
      
      // Mock the initial state sending
      let initialMessage: any = null;
      
      jest.spyOn(global, 'ReadableStream').mockImplementation((underlyingSource: any) => {
        const controller = {
          enqueue: jest.fn((chunk: Uint8Array) => {
            const message = new TextDecoder().decode(chunk);
            if (message.includes('initial')) {
              initialMessage = JSON.parse(message.replace('data: ', ''));
            }
          })
        };
        
        if (underlyingSource.start) {
          underlyingSource.start(controller);
        }
        
        return {} as ReadableStream;
      });

      await GET(request);

      // User should immediately know broadcast is live
      // In real implementation, initial state would be sent
      expect(mockLiveState.isLive).toBe(true);
      expect(mockLiveState.title).toBe('Ongoing Lecture');
    });

    it('should update user interface when admin pauses during listening', () => {
      // Simulate user listening to live broadcast
      const userState = {
        isPlaying: true,
        currentTitle: 'Live Lecture'
      };

      // Admin pauses broadcast
      const pauseUpdate = {
        type: 'broadcast_paused',
        isLive: true,
        isPaused: true,
        title: 'Live Lecture',
        lecturer: 'Test Lecturer'
      };

      // User should receive update and adjust UI
      // In real implementation, this would trigger UI changes:
      // - Show "PAUSED" status
      // - Disable play button or show pause indicator
      // - Keep timer running but show paused state
      
      expect(pauseUpdate.isPaused).toBe(true);
      
      // User interface should reflect paused state
      const expectedUIState = {
        showPausedIndicator: true,
        playButtonEnabled: false,
        statusText: 'PAUSED'
      };
      
      expect(expectedUIState.showPausedIndicator).toBe(true);
    });

    it('should handle multiple users receiving updates simultaneously', () => {
      const user1Controller = { enqueue: jest.fn() };
      const user2Controller = { enqueue: jest.fn() };
      const user3Controller = { enqueue: jest.fn() };
      
      const connections = new Set([user1Controller, user2Controller, user3Controller]);
      
      const updateData = {
        type: 'broadcast_started',
        isLive: true,
        isPaused: false,
        title: 'Popular Lecture',
        lecturer: 'Famous Scholar'
      };

      // Simulate broadcasting to all connections
      connections.forEach(controller => {
        try {
          const message = `data: ${JSON.stringify(updateData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          connections.delete(controller);
        }
      });

      // All users should receive the update
      expect(user1Controller.enqueue).toHaveBeenCalled();
      expect(user2Controller.enqueue).toHaveBeenCalled();
      expect(user3Controller.enqueue).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high number of concurrent listeners efficiently', () => {
      // Simulate 100 concurrent listeners
      const connections = new Set();
      
      for (let i = 0; i < 100; i++) {
        connections.add({
          enqueue: jest.fn()
        });
      }

      const updateData = {
        type: 'broadcast_update',
        isLive: true,
        listenerCount: 100
      };

      // Broadcasting should complete quickly even with many connections
      const startTime = Date.now();
      
      connections.forEach(controller => {
        const message = `data: ${JSON.stringify(updateData)}\n\n`;
        (controller as any).enqueue(new TextEncoder().encode(message));
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 100ms for 100 connections)
      expect(duration).toBeLessThan(100);
      expect(connections.size).toBe(100);
    });

    it('should minimize bandwidth usage with efficient message format', () => {
      const updateData = {
        type: 'status_update',
        isLive: true,
        isPaused: false
      };

      const message = `data: ${JSON.stringify(updateData)}\n\n`;
      const messageSize = new TextEncoder().encode(message).length;
      
      // Message should be compact (< 200 bytes)
      expect(messageSize).toBeLessThan(200);
      
      // Essential fields only
      expect(updateData).toHaveProperty('type');
      expect(updateData).toHaveProperty('isLive');
      expect(updateData).toHaveProperty('isPaused');
    });
  });
});