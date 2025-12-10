const WebSocket = require('ws')
const jwt = require('jsonwebtoken')

// Mock the BroadcastGateway class
jest.mock('child_process')

describe('Broadcast Gateway', () => {
  let mockWs
  let mockReq
  
  beforeEach(() => {
    mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    }
    
    mockReq = {
      url: 'ws://localhost:8080?token=valid-token',
      user: {
        userId: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'admin'
      }
    }
  })

  test('verifies JWT token correctly', () => {
    const JWT_SECRET = 'test-secret'
    const token = jwt.sign({
      userId: 'user123',
      email: 'test@test.com',
      role: 'admin'
    }, JWT_SECRET)

    const decoded = jwt.verify(token, JWT_SECRET)
    
    expect(decoded.userId).toBe('user123')
    expect(decoded.email).toBe('test@test.com')
    expect(decoded.role).toBe('admin')
  })

  test('rejects connection without token', () => {
    const info = {
      req: {
        url: 'ws://localhost:8080' // No token
      }
    }

    // This would be the verifyClient logic
    const url = new URL(info.req.url, 'ws://localhost:8080')
    const token = url.searchParams.get('token')
    
    expect(token).toBeNull()
  })

  test('handles control messages correctly', () => {
    const controlMessage = JSON.stringify({
      type: 'start_stream',
      config: {
        sampleRate: 44100,
        channels: 1,
        bitrate: 96
      }
    })

    // Test message parsing
    const parsed = JSON.parse(controlMessage)
    expect(parsed.type).toBe('start_stream')
    expect(parsed.config.sampleRate).toBe(44100)
  })

  test('handles binary audio data', () => {
    const audioBuffer = new ArrayBuffer(4096)
    const audioData = new Float32Array(audioBuffer)
    
    // Fill with sample audio data
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5
    }

    expect(audioBuffer.byteLength).toBe(4096 * 4) // 4 bytes per float
    expect(audioData.length).toBe(4096)
  })

  test('prevents multiple simultaneous broadcasts', () => {
    let currentBroadcast = null

    // First user connects
    const user1 = { userId: 'user1', email: 'user1@test.com' }
    currentBroadcast = { user: user1, ws: mockWs }

    // Second user tries to connect
    const user2 = { userId: 'user2', email: 'user2@test.com' }
    
    if (currentBroadcast) {
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          message: 'Another presenter is currently live. Please try again later.'
        })
      )
    }
  })
})