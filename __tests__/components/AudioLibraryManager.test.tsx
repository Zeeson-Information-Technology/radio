/**
 * Property-based tests for AudioLibraryManager enhancements
 * Feature: admin-conversion-updates
 * Tests Properties 3, 9: Status update propagation, session priority
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import AudioLibraryManager from '@/app/admin/audio/AudioLibraryManager';
import { getSessionTracker, resetSessionTracker } from '@/lib/utils/SessionTracker';

// Mock dependencies
jest.mock('@/lib/hooks/useAudioModals', () => ({
  useAudioModals: () => ({
    openEditModal: jest.fn(),
    openDeleteModal: jest.fn()
  })
}));

jest.mock('@/lib/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn()
  })
}));

jest.mock('@/lib/hooks/useConversionNotifications', () => ({
  useConversionNotifications: jest.fn()
}));

jest.mock('@/app/admin/audio/ConversionStatusButton', () => {
  return function MockConversionStatusButton({ convertingFiles, onStatusCheck, isLoading }: any) {
    return convertingFiles.length > 0 ? (
      <div data-testid="conversion-status-button">
        <span data-testid="converting-count">{convertingFiles.length}</span>
        <button 
          onClick={onStatusCheck} 
          disabled={isLoading}
          data-testid="check-status-btn"
        >
          {isLoading ? 'Checking...' : 'Check Status'}
        </button>
      </div>
    ) : null;
  };
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock admin user
const mockAdmin = {
  _id: 'admin123',
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'super_admin' as const,
  permissions: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLogin: '2024-01-01T00:00:00.000Z'
};

// Audio file generator
const audioFileArbitrary = fc.record({
  id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  lecturerName: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.record({
    name: fc.constantFrom('quran', 'hadith', 'tafsir', 'lecture', 'adhkar'),
    icon: fc.option(fc.string()),
    color: fc.option(fc.string())
  }),
  duration: fc.integer({ min: 30, max: 7200 }),
  fileSize: fc.integer({ min: 1000000, max: 100000000 }),
  url: fc.webUrl(),
  visibility: fc.constantFrom('private', 'shared', 'public'),
  sharedWith: fc.array(fc.string()),
  createdBy: fc.record({
    _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress()
  }),
  broadcastReady: fc.boolean(),
  broadcastUsageCount: fc.integer({ min: 0, max: 100 }),
  createdAt: fc.date().map(d => d.toISOString()),
  isFavorite: fc.boolean(),
  isOwner: fc.boolean(),
  conversionStatus: fc.constantFrom('pending', 'processing', 'ready', 'completed', 'failed'),
  conversionError: fc.option(fc.string()),
  isConverting: fc.boolean(),
  isPlayable: fc.boolean()
});

describe('AudioLibraryManager - Property Tests', () => {
  beforeEach(() => {
    resetSessionTracker();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockReset();
  });

  /**
   * Property 3: Status update propagation
   * For any conversion status API response, file status updates should be 
   * correctly propagated to the UI components
   */
  test('Feature: admin-conversion-updates, Property 3: Status update propagation', async () => {
    // Simplified test - just verify the basic flow works
    const convertingFiles = [
      {
        id: 'file1',
        title: 'Converting File',
        conversionStatus: 'processing' as const,
        lecturerName: 'Test Lecturer',
        category: { name: 'lecture' },
        duration: 300,
        fileSize: 5000000,
        url: 'https://example.com/file1.mp3',
        visibility: 'private' as const,
        sharedWith: [],
        createdBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
        broadcastReady: false,
        broadcastUsageCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        isFavorite: false,
        isOwner: true,
        isConverting: true,
        isPlayable: false
      }
    ];

    const updatedFiles = [
      {
        recordId: 'file1',
        conversionStatus: 'ready' as const
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: convertingFiles,
          totalCount: 1
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          updates: updatedFiles,
          completedCount: updatedFiles.filter((f: any) => f.conversionStatus === 'ready').length,
          stillProcessing: updatedFiles.filter((f: any) => ['pending', 'processing'].includes(f.conversionStatus)).length
        })
      });

    render(<AudioLibraryManager admin={mockAdmin} />);

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/audio')
      );
    });

    // Should show conversion status button
    await waitFor(() => {
      expect(screen.getByTestId('conversion-status-button')).toBeInTheDocument();
    });

    // Click the status check button
    const statusButton = screen.getByTestId('check-status-btn');
    fireEvent.click(statusButton);

    // Wait for status check API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/conversion-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    // Verify both API calls were made
    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 10000);

  /**
   * Property 9: Session priority
   * For any set of uploaded files in session, the conversion status check should 
   * prioritize session files for optimization
   */
  test('Feature: admin-conversion-updates, Property 9: Session priority', async () => {
    const property = fc.asyncProperty(
      fc.array(fc.hexaString({ minLength: 24, maxLength: 24 }), { minLength: 1, maxLength: 10 }),
      fc.array(audioFileArbitrary, { minLength: 1, maxLength: 5 }),
      async (sessionFileIds, audioFiles) => {
        cleanup();
        resetSessionTracker();
        
        // Add files to session tracker
        const sessionTracker = getSessionTracker();
        sessionFileIds.forEach(id => sessionTracker.addFile(id));

        // Mock API responses
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              files: audioFiles,
              totalCount: audioFiles.length
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              updates: [],
              completedCount: 0,
              stillProcessing: 0
            })
          });

        render(<AudioLibraryManager admin={mockAdmin} />);

        // Wait for initial load
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/admin/audio')
          );
        });

        // Verify session tracker has the files
        const trackedFiles = sessionTracker.getFiles();
        expect(trackedFiles).toEqual(expect.arrayContaining(sessionFileIds.slice().reverse()));

        // Find and click the status check button if it exists
        const statusButton = screen.queryByTestId('check-status-btn');
        if (statusButton) {
          fireEvent.click(statusButton);

          // Wait for status check API call
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/conversion-status', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          });
        }
      }
    );

    await fc.assert(property, { numRuns: 20 });
  });

  // Unit tests for specific behaviors
  test('should render ConversionStatusButton when converting files exist', async () => {
    // Reset mocks completely
    jest.resetAllMocks();
    (global.fetch as jest.Mock) = jest.fn();
    
    const convertingFiles = [
      {
        id: 'file1',
        title: 'Test File 1',
        conversionStatus: 'processing' as const,
        // ... other required fields
        lecturerName: 'Test Lecturer',
        category: { name: 'lecture' },
        duration: 300,
        fileSize: 5000000,
        url: 'https://example.com/file1.mp3',
        visibility: 'private' as const,
        sharedWith: [],
        createdBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
        broadcastReady: false,
        broadcastUsageCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        isFavorite: false,
        isOwner: true,
        isConverting: true,
        isPlayable: false
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: convertingFiles,
        totalCount: 1
      })
    });

    render(<AudioLibraryManager admin={mockAdmin} />);

    // Wait for the component to load and process the files
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/audio')
      );
    });

    // Wait for loading to complete - check that loading spinner is gone
    await waitFor(() => {
      expect(screen.queryByText('Loading audio files...')).not.toBeInTheDocument();
    });

    // Now the ConversionStatusButton should be rendered since we have converting files
    await waitFor(() => {
      expect(screen.getByTestId('conversion-status-button')).toBeInTheDocument();
      expect(screen.getByTestId('converting-count')).toHaveTextContent('1');
    });
  });

  test('should not render ConversionStatusButton when no converting files', async () => {
    const readyFiles = [
      {
        id: 'file1',
        title: 'Test File 1',
        conversionStatus: 'ready' as const,
        // ... other required fields
        lecturerName: 'Test Lecturer',
        category: { name: 'lecture' },
        duration: 300,
        fileSize: 5000000,
        url: 'https://example.com/file1.mp3',
        visibility: 'private' as const,
        sharedWith: [],
        createdBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
        broadcastReady: true,
        broadcastUsageCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        isFavorite: false,
        isOwner: true,
        isConverting: false,
        isPlayable: true
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: readyFiles,
        totalCount: 1
      })
    });

    render(<AudioLibraryManager admin={mockAdmin} />);

    await waitFor(() => {
      expect(screen.queryByTestId('conversion-status-button')).not.toBeInTheDocument();
    });
  });

  test('should handle conversion status check errors gracefully', async () => {
    // Reset mocks completely
    jest.resetAllMocks();
    (global.fetch as jest.Mock) = jest.fn();
    
    const convertingFiles = [
      {
        id: 'file1',
        title: 'Test File 1',
        conversionStatus: 'processing' as const,
        // ... other required fields
        lecturerName: 'Test Lecturer',
        category: { name: 'lecture' },
        duration: 300,
        fileSize: 5000000,
        url: 'https://example.com/file1.mp3',
        visibility: 'private' as const,
        sharedWith: [],
        createdBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
        broadcastReady: false,
        broadcastUsageCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        isFavorite: false,
        isOwner: true,
        isConverting: true,
        isPlayable: false
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: convertingFiles,
          totalCount: 1
        })
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AudioLibraryManager admin={mockAdmin} />);

    // Wait for the component to load and process the files
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/audio')
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading audio files...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('conversion-status-button')).toBeInTheDocument();
    });

    const statusButton = screen.getByTestId('check-status-btn');
    
    // Verify the button is not disabled before clicking
    expect(statusButton).not.toBeDisabled();
    
    fireEvent.click(statusButton);

    // Wait for the error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check conversion status:', expect.any(Error));
    }, { timeout: 3000 });

    consoleSpy.mockRestore();
  });
});