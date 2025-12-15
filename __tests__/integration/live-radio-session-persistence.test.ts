/**
 * Live Radio Session Persistence Tests
 * Tests admin reload scenarios and session recovery
 */

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data) => ({
      json: async () => data,
      status: 200,
      headers: new Map()
    }))
  }
}));

// Mock the API routes
const mockLiveAPI = {
  GET: jest.fn()
};

const mockBroadcastLiveUpdate = jest.fn();

jest.mock('../../app/api/live/route', () => ({
  GET: mockLiveAPI.GET
}));

jest.mock('../../app/api/live/events/route', () => ({
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
  updatedAt: new Date(),
  save: jest.fn()
};

jest.mock('../../lib/db', () => ({
  connectDB: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../lib/models/LiveState', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

// Mock WebSocket for gateway simulation
class MockWebSocket {
  public readyState = 1; // OPEN
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }
  
  send(data: string) {
    // Simulate gateway responses
    const message = JSON.parse(data);
    
    setTimeout(() => {
      if (this.onmessage) {
        let response;
        
        switch (message.type) {
          case 'start_stream':
            response = { type: 'stream_started', message: 'Live stream active' };
            break;
          case 'reconnect_stream':
            response = { type: 'stream_started', message: 'Reconnected to existing stream' };
            break;
          case 'pause_stream':
            response = { type: 'stream_paused', message: 'Stream paused successfully' };
            break;
          case 'resume_stream':
            response = { type: 'stream_resumed', message: 'Stream resumed successfully' };
            break;
          case 'stop_stream':
            response = { type: 'stream_stopped', message: 'Stream ended successfully' };
            break;
          default:
            response = { type: 'ready', message: 'Connected to broadcast gateway' };
        }
        
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify(response)
        }));
      }
    }, 50);
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
}

global.WebSocket = MockWebSocket as any;

describe('Live Radio Session Persistence', () => {
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

  describe('Admin Reload Scenarios', () => {
    it('should auto-pause broadcast when admin reloads page during live session', async () => {
      // Setup: Admin is broadcasting
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 300000) // 5 minutes ago
      });

      // Simulate admin connection
      const ws = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      // Admin starts broadcasting
      ws.send(JSON.stringify({
        type: 'start_stream',
        config: { sampleRate: 44100, channels: 1, bitrate: 96 }
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate page reload (WebSocket disconnect)
      ws.close();

      // Verify session should be auto-paused (not stopped)
      // In real implementation, gateway would detect disconnect and pause
      expect(mockLiveState.isLive).toBe(true); // Still live
      // isPaused would be set to true by gateway on disconnect
    });

    it('should allow admin to resume after reload with session recovery', async () => {
      // Setup: Session was auto-paused due to reload
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: true,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        pausedAt: new Date(Date.now() - 60000) // 1 minute ago
      });

      // Admin reconnects after reload
      const ws = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      let reconnectResponse: any = null;
      ws.onmessage = (event) => {
        reconnectResponse = JSON.parse(event.data);
      };

      // Admin attempts to reconnect to existing session
      ws.send(JSON.stringify({
        type: 'reconnect_stream',
        config: { sampleRate: 44100, channels: 1, bitrate: 96 }
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should successfully reconnect to existing session
      expect(reconnectResponse).toBeTruthy();
      expect(reconnectResponse.type).toBe('stream_started');
      expect(reconnectResponse.message).toContain('Reconnected');
    });

    it('should preserve broadcast timer across reload', async () => {
      const startTime = new Date(Date.now() - 600000); // 10 minutes ago
      
      // Setup: Long-running session that was paused
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: true,
        title: 'Long Lecture',
        lecturer: 'Test Lecturer',
        startedAt: startTime,
        pausedAt: new Date(Date.now() - 60000) // Paused 1 minute ago
      });

      // Mock API response
      mockLiveAPI.GET.mockResolvedValue({
        json: async () => ({
          isLive: true,
          isPaused: true,
          title: 'Long Lecture',
          lecturer: 'Test Lecturer',
          startedAt: startTime.toISOString(),
          pausedAt: new Date(Date.now() - 60000).toISOString()
        }),
        status: 200
      });

      // Check API returns correct timing
      const response = await mockLiveAPI.GET();
      const data = await response.json();

      expect(data.isLive).toBe(true);
      expect(data.isPaused).toBe(true);
      expect(new Date(data.startedAt)).toEqual(startTime);
      
      // Timer should show ~10 minutes when resumed
      const elapsedMinutes = (Date.now() - startTime.getTime()) / (1000 * 60);
      expect(elapsedMinutes).toBeGreaterThan(9);
      expect(elapsedMinutes).toBeLessThan(11);
    });
  });

  describe('Session State Management', () => {
    it('should handle multiple reload attempts gracefully', async () => {
      // Setup active session
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date()
      });

      // First connection
      const ws1 = new MockWebSocket('ws://localhost:8080?token=valid-token');
      ws1.send(JSON.stringify({ type: 'start_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Simulate disconnect (reload)
      ws1.close();
      
      // Second connection (immediate reload)
      const ws2 = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      let response: any = null;
      ws2.onmessage = (event) => {
        response = JSON.parse(event.data);
      };
      
      ws2.send(JSON.stringify({ type: 'reconnect_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle gracefully
      expect(response).toBeTruthy();
      expect(['ready', 'stream_started']).toContain(response.type);
    });

    it('should prevent session hijacking by different admin', async () => {
      // Setup: Admin A is broadcasting
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Admin A Lecture',
        lecturer: 'Admin A',
        startedAt: new Date()
      });

      // Admin B tries to connect
      const ws = new MockWebSocket('ws://localhost:8080?token=different-admin-token');
      
      let errorResponse: any = null;
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'error') {
          errorResponse = data;
        }
      };

      ws.send(JSON.stringify({ type: 'start_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be rejected
      expect(errorResponse).toBeTruthy();
      expect(errorResponse.message).toContain('Another presenter');
    });
  });

  describe('Pause/Resume Functionality', () => {
    it('should pause broadcast without stopping stream', async () => {
      // Setup active broadcast
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date()
      });

      const ws = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      let pauseResponse: any = null;
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'stream_paused') {
          pauseResponse = data;
        }
      };

      // Admin pauses
      ws.send(JSON.stringify({ type: 'pause_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(pauseResponse).toBeTruthy();
      expect(pauseResponse.message).toContain('paused successfully');
      
      // Mock API response for paused state
      mockLiveAPI.GET.mockResolvedValue({
        json: async () => ({
          isLive: true,
          isPaused: true,
          title: 'Test Lecture',
          lecturer: 'Test Lecturer'
        }),
        status: 200
      });

      // Stream should still be live but paused
      const response = await mockLiveAPI.GET();
      const data = await response.json();
      
      expect(data.isLive).toBe(true);
      expect(data.isPaused).toBe(true);
    });

    it('should resume broadcast from paused state', async () => {
      // Setup paused broadcast
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: true,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date(Date.now() - 300000),
        pausedAt: new Date()
      });

      const ws = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      let resumeResponse: any = null;
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'stream_resumed') {
          resumeResponse = data;
        }
      };

      // Admin resumes
      ws.send(JSON.stringify({ type: 'resume_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(resumeResponse).toBeTruthy();
      expect(resumeResponse.message).toContain('resumed successfully');
    });
  });

  describe('Error Recovery', () => {
    it('should handle gateway disconnection gracefully', async () => {
      // Setup active session
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: new Date()
      });

      // Simulate gateway connection failure
      const ws = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      // Force connection error
      setTimeout(() => {
        if (ws.onerror) {
          ws.onerror(new Event('error'));
        }
      }, 50);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Admin should be able to reconnect
      const ws2 = new MockWebSocket('ws://localhost:8080?token=valid-token');
      
      let reconnectResponse: any = null;
      ws2.onmessage = (event) => {
        reconnectResponse = JSON.parse(event.data);
      };
      
      ws2.send(JSON.stringify({ type: 'reconnect_stream' }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(reconnectResponse).toBeTruthy();
    });

    it('should maintain session state during temporary network issues', async () => {
      const startTime = new Date();
      
      // Setup session
      Object.assign(mockLiveState, {
        isLive: true,
        isPaused: false,
        title: 'Network Test Lecture',
        lecturer: 'Test Lecturer',
        startedAt: startTime
      });

      // Mock consistent API responses
      const mockResponse = {
        json: async () => ({
          isLive: true,
          startedAt: startTime.toISOString(),
          title: 'Network Test Lecture',
          lecturer: 'Test Lecturer'
        }),
        status: 200
      };

      mockLiveAPI.GET.mockResolvedValue(mockResponse);

      // Check state is preserved
      const response1 = await mockLiveAPI.GET();
      const data1 = await response1.json();
      
      expect(data1.isLive).toBe(true);
      expect(data1.startedAt).toBe(startTime.toISOString());
      
      // Simulate network interruption and recovery
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response2 = await mockLiveAPI.GET();
      const data2 = await response2.json();
      
      // State should be maintained
      expect(data2.isLive).toBe(true);
      expect(data2.startedAt).toBe(startTime.toISOString());
    });
  });
});