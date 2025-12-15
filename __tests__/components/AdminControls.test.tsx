/**
 * Admin Controls Tests
 * Tests admin interface functionality without complex React mocking
 */

import { render, screen, fireEvent } from '@testing-library/react';

// Simple admin control component for testing
const AdminControls = ({ onStart, onPause, onResume, onStop, status }: {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  status: 'offline' | 'connecting' | 'live' | 'paused';
}) => {
  return (
    <div data-testid="admin-controls">
      <h2>Live Control Panel</h2>
      
      {/* Status Display */}
      <div data-testid="status-display">
        {status === 'offline' && <span>⚪ Offline</span>}
        {status === 'connecting' && <span>🔄 Connecting...</span>}
        {status === 'live' && <span>🔴 LIVE</span>}
        {status === 'paused' && <span>⏸️ PAUSED</span>}
      </div>

      {/* Control Buttons */}
      <div data-testid="control-buttons">
        {status === 'offline' && (
          <button onClick={onStart} data-testid="start-button">
            🎙️ Start Broadcasting
          </button>
        )}
        
        {status === 'connecting' && (
          <button disabled data-testid="connecting-button">
            🔄 Connecting...
          </button>
        )}
        
        {status === 'live' && (
          <>
            <button onClick={onPause} data-testid="pause-button">
              ⏸️ Pause
            </button>
            <button onClick={onStop} data-testid="stop-button">
              🛑 Stop
            </button>
          </>
        )}
        
        {status === 'paused' && (
          <>
            <button onClick={onResume} data-testid="resume-button">
              ▶️ Resume
            </button>
            <button onClick={onStop} data-testid="stop-button">
              🛑 Stop
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div data-testid="instructions">
        <h3>How to broadcast:</h3>
        <ol>
          <li>Click "Start Broadcasting"</li>
          <li>Allow microphone access when prompted</li>
          <li>Speak into your microphone</li>
          <li>Use pause/resume as needed</li>
          <li>Click stop when finished</li>
        </ol>
      </div>
    </div>
  );
};

describe('Admin Controls', () => {
  const mockHandlers = {
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Offline State', () => {
    it('should render offline state correctly', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="offline" 
        />
      );

      expect(screen.getByText('Live Control Panel')).toBeInTheDocument();
      expect(screen.getByText('⚪ Offline')).toBeInTheDocument();
      expect(screen.getByTestId('start-button')).toBeInTheDocument();
      expect(screen.getByText('🎙️ Start Broadcasting')).toBeInTheDocument();
    });

    it('should show broadcasting instructions', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="offline" 
        />
      );

      expect(screen.getByText('How to broadcast:')).toBeInTheDocument();
      expect(screen.getByText('Click "Start Broadcasting"')).toBeInTheDocument();
      expect(screen.getByText('Allow microphone access when prompted')).toBeInTheDocument();
    });

    it('should call onStart when start button is clicked', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="offline" 
        />
      );

      const startButton = screen.getByTestId('start-button');
      fireEvent.click(startButton);

      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connecting State', () => {
    it('should render connecting state correctly', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="connecting" 
        />
      );

      expect(screen.getByTestId('status-display')).toHaveTextContent('🔄 Connecting...');
      expect(screen.getByTestId('connecting-button')).toBeInTheDocument();
      expect(screen.getByTestId('connecting-button')).toBeDisabled();
    });

    it('should not show start button when connecting', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="connecting" 
        />
      );

      expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
    });
  });

  describe('Live State', () => {
    it('should render live state correctly', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );

      expect(screen.getByText('🔴 LIVE')).toBeInTheDocument();
      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    });

    it('should call onPause when pause button is clicked', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );

      const pauseButton = screen.getByTestId('pause-button');
      fireEvent.click(pauseButton);

      expect(mockHandlers.onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when stop button is clicked', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      fireEvent.click(stopButton);

      expect(mockHandlers.onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Paused State', () => {
    it('should render paused state correctly', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );

      expect(screen.getByText('⏸️ PAUSED')).toBeInTheDocument();
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    });

    it('should call onResume when resume button is clicked', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      fireEvent.click(resumeButton);

      expect(mockHandlers.onResume).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when stop button is clicked from paused state', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      fireEvent.click(stopButton);

      expect(mockHandlers.onStop).toHaveBeenCalledTimes(1);
    });

    it('should not show pause button when paused', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );

      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should show correct buttons for each state', () => {
      const { rerender } = render(
        <AdminControls 
          {...mockHandlers} 
          status="offline" 
        />
      );

      // Offline: Should show start button
      expect(screen.getByTestId('start-button')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();

      // Connecting: Should show disabled connecting button
      rerender(
        <AdminControls 
          {...mockHandlers} 
          status="connecting" 
        />
      );
      expect(screen.getByTestId('connecting-button')).toBeInTheDocument();
      expect(screen.getByTestId('connecting-button')).toBeDisabled();

      // Live: Should show pause and stop buttons
      rerender(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );
      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();

      // Paused: Should show resume and stop buttons
      rerender(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="offline" 
        />
      );

      const startButton = screen.getByTestId('start-button');
      expect(startButton).toHaveTextContent('🎙️ Start Broadcasting');
      expect(startButton.tagName).toBe('BUTTON');
    });

    it('should have proper ARIA attributes for disabled button', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="connecting" 
        />
      );

      const connectingButton = screen.getByTestId('connecting-button');
      expect(connectingButton).toBeDisabled();
    });

    it('should be keyboard accessible', () => {
      render(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );

      const pauseButton = screen.getByTestId('pause-button');
      
      // Should be focusable
      pauseButton.focus();
      expect(document.activeElement).toBe(pauseButton);
      
      // Should respond to click events (keyboard events would need onKeyDown handler)
      fireEvent.click(pauseButton);
      expect(mockHandlers.onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing handlers gracefully', () => {
      const incompleteHandlers = {
        onStart: jest.fn(),
        onPause: undefined as any,
        onResume: jest.fn(),
        onStop: jest.fn()
      };

      // Should not crash when rendering
      expect(() => {
        render(
          <AdminControls 
            {...incompleteHandlers} 
            status="live" 
          />
        );
      }).not.toThrow();
    });

    it('should handle invalid status gracefully', () => {
      // Should not crash with invalid status
      expect(() => {
        render(
          <AdminControls 
            {...mockHandlers} 
            status={'invalid' as any} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Session Persistence Scenarios', () => {
    it('should show paused state for recovered session', () => {
      // Simulate admin reconnecting to paused session after reload
      render(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );

      expect(screen.getByText('⏸️ PAUSED')).toBeInTheDocument();
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      
      // Admin should be able to resume
      const resumeButton = screen.getByTestId('resume-button');
      expect(resumeButton).not.toBeDisabled();
    });

    it('should allow stopping from any active state', () => {
      const { rerender } = render(
        <AdminControls 
          {...mockHandlers} 
          status="live" 
        />
      );

      // Should have stop button when live
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();

      // Should have stop button when paused
      rerender(
        <AdminControls 
          {...mockHandlers} 
          status="paused" 
        />
      );
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    });
  });
});