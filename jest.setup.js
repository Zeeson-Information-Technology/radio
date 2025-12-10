import '@testing-library/jest-dom'

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 100)
  }
  
  send(data) {
    // Mock send
    console.log('Mock WebSocket send:', data)
  }
  
  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) this.onclose()
  }
}

// Mock AudioContext
global.AudioContext = class MockAudioContext {
  constructor() {
    this.sampleRate = 44100
  }
  
  createMediaStreamSource() {
    return {
      connect: jest.fn()
    }
  }
  
  createAnalyser() {
    return {
      fftSize: 256,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 128,
      getByteFrequencyData: jest.fn()
    }
  }
  
  createScriptProcessor() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null
    }
  }
  
  close() {
    return Promise.resolve()
  }
}

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => 
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }]
      })
    )
  }
})

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_BROADCAST_GATEWAY_URL = 'ws://localhost:8080'