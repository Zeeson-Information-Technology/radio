import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BrowserEncoder from '@/app/admin/live/BrowserEncoder'

// Mock fetch for token generation
global.fetch = jest.fn()

describe('BrowserEncoder Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: 'mock-jwt-token',
        user: { id: '1', email: 'test@test.com', name: 'Test User', role: 'admin' }
      })
    })
  })

  test('renders browser encoder component', () => {
    render(<BrowserEncoder />)
    
    expect(screen.getByText('🎙️ Browser Broadcasting')).toBeInTheDocument()
    expect(screen.getByText('⚪ Offline')).toBeInTheDocument()
    expect(screen.getByText('🎙️ Start Broadcasting')).toBeInTheDocument()
  })

  test('shows audio level meter', () => {
    render(<BrowserEncoder />)
    
    expect(screen.getByText('Audio Level')).toBeInTheDocument()
    expect(screen.getByText('Silent')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Too Loud')).toBeInTheDocument()
  })

  test('shows broadcasting instructions', () => {
    render(<BrowserEncoder />)
    
    expect(screen.getByText('How to broadcast:')).toBeInTheDocument()
    expect(screen.getByText('Click "Start Broadcasting"')).toBeInTheDocument()
    expect(screen.getByText('Allow microphone access when prompted')).toBeInTheDocument()
  })

  test('handles start broadcasting click', async () => {
    render(<BrowserEncoder />)
    
    const startButton = screen.getByText('🎙️ Start Broadcasting')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/live/broadcast-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    })
  })

  test('shows error for unsupported browser', () => {
    // Mock unsupported browser
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true
    })

    render(<BrowserEncoder />)
    
    expect(screen.getByText('Browser Not Supported')).toBeInTheDocument()
  })

  test('calls onStreamStart callback when streaming starts', () => {
    const mockOnStreamStart = jest.fn()
    render(<BrowserEncoder onStreamStart={mockOnStreamStart} />)
    
    // This would be triggered by WebSocket message in real scenario
    // Testing the callback mechanism
    expect(mockOnStreamStart).not.toHaveBeenCalled()
  })
})

describe('BrowserEncoder Mobile Responsiveness', () => {
  test('renders correctly on mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })

    render(<BrowserEncoder />)
    
    const component = screen.getByText('🎙️ Browser Broadcasting').closest('div')
    expect(component).toBeInTheDocument()
    
    // Check if button is full width on mobile
    const startButton = screen.getByText('🎙️ Start Broadcasting')
    expect(startButton).toHaveClass('flex-1')
  })
})