/**
 * AudioUpload Component Tests
 * Tests for the frontend audio upload component including file validation,
 * form handling, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioUpload from '../../app/admin/audio/AudioUpload';
import { SerializedAdmin } from '../../lib/types/admin';

// Mock the audio formats utility
jest.mock('../../lib/utils/audio-formats', () => ({
  getSupportedMimeTypes: () => [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
    'audio/ogg', 'audio/flac', 'audio/amr', 'audio/webm', 'audio/3gpp'
  ],
  SUPPORTED_AUDIO_FORMATS: {
    mp3: { extension: 'mp3', mimeTypes: ['audio/mpeg'] },
    mpeg: { extension: 'mpeg', mimeTypes: ['audio/mpeg'] },
    wav: { extension: 'wav', mimeTypes: ['audio/wav'] },
    m4a: { extension: 'm4a', mimeTypes: ['audio/mp4'] },
    aac: { extension: 'aac', mimeTypes: ['audio/aac'] },
    ogg: { extension: 'ogg', mimeTypes: ['audio/ogg'] },
    flac: { extension: 'flac', mimeTypes: ['audio/flac'] },
    amr: { extension: 'amr', mimeTypes: ['audio/amr'] },
    webm: { extension: 'webm', mimeTypes: ['audio/webm'] },
    '3gp': { extension: '3gp', mimeTypes: ['audio/3gpp'] }
  },
  getFormatByExtension: (ext: string) => {
    const formats: any = {
      mp3: { extension: 'mp3', mimeTypes: ['audio/mpeg'] },
      mpeg: { extension: 'mpeg', mimeTypes: ['audio/mpeg'] },
      wav: { extension: 'wav', mimeTypes: ['audio/wav'] },
      txt: null // Unsupported
    };
    return formats[ext.toLowerCase()] || null;
  }
}));

// Mock SupportedFormats component
jest.mock('../../app/admin/audio/SupportedFormats', () => {
  return function MockSupportedFormats() {
    return <div data-testid="supported-formats">Supported formats info</div>;
  };
});

// Mock CircularProgress component
jest.mock('../../app/admin/audio/CircularProgress', () => {
  return function MockCircularProgress({ percentage }: { percentage: number }) {
    return <div data-testid="circular-progress">{percentage}%</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('AudioUpload Component', () => {
  const mockAdmin: SerializedAdmin = {
    _id: 'admin123',
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z'
  };

  const mockPresenter: SerializedAdmin = {
    _id: 'presenter123',
    name: 'Test Presenter',
    email: 'presenter@test.com',
    role: 'presenter',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z'
  };

  const mockOnUploadSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Permission Checks', () => {
    it('should show upload interface for admin users', () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      expect(screen.getByText('📁 Select Audio File')).toBeInTheDocument();
      expect(screen.getByText('Drop your audio file here or click to browse')).toBeInTheDocument();
    });

    it('should show restriction message for non-admin users', () => {
      const regularUser = { ...mockPresenter, role: 'user' as any };
      render(<AudioUpload admin={regularUser} onUploadSuccess={mockOnUploadSuccess} />);
      
      expect(screen.getByText('Audio Upload Restricted')).toBeInTheDocument();
      expect(screen.getByText('Only administrators can upload audio files to the library.')).toBeInTheDocument();
    });

    it('should show current role in restriction message', () => {
      const regularUser = { ...mockPresenter, role: 'user' as any };
      render(<AudioUpload admin={regularUser} onUploadSuccess={mockOnUploadSuccess} />);
      
      expect(screen.getByText('Your current role:')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  describe('File Selection and Validation', () => {
    it('should accept valid audio files', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const fileInput = screen.getByRole('button', { name: /drop your audio file here/i });
      const file = new File(['fake mp3 content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
    });

    it('should accept MPEG files', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake mpeg content'], 'test-audio.mpeg', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mpeg')).toBeInTheDocument();
      });
    });

    it('should reject files larger than 30MB', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      // Create a mock file larger than 30MB
      const largeFile = new File(['x'.repeat(31 * 1024 * 1024)], 'large-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, largeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/File too large/)).toBeInTheDocument();
        expect(screen.getByText(/31.0MB/)).toBeInTheDocument();
        expect(screen.getByText(/Maximum size is 30MB/)).toBeInTheDocument();
      });
    });

    it('should reject unsupported file formats', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, textFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Unsupported file extension/)).toBeInTheDocument();
        expect(screen.getByText(/\.txt/)).toBeInTheDocument();
      });
    });

    it('should auto-fill title from filename', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'My Great Lecture.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('My Great Lecture');
        expect(titleInput).toBeInTheDocument();
      });
    });

    it('should allow file removal', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByTitle('Remove file');
      await userEvent.click(removeButton);
      
      expect(screen.queryByText('test-audio.mp3')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
    });

    it('should require title field', async () => {
      const titleInput = screen.getByLabelText(/Title/);
      await userEvent.clear(titleInput);
      
      const lecturerInput = screen.getByLabelText(/Speaker\/Lecturer/);
      await userEvent.type(lecturerInput, 'Test Lecturer');
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a title')).toBeInTheDocument();
      });
    });

    it('should require lecturer name field', async () => {
      const titleInput = screen.getByLabelText(/Title/);
      await userEvent.type(titleInput, 'Test Title');
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter the lecturer/speaker name')).toBeInTheDocument();
      });
    });

    it('should disable submit button when required fields are missing', async () => {
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      expect(submitButton).toBeDisabled();
      
      const titleInput = screen.getByLabelText(/Title/);
      await userEvent.type(titleInput, 'Test Title');
      expect(submitButton).toBeDisabled();
      
      const lecturerInput = screen.getByLabelText(/Speaker\/Lecturer/);
      await userEvent.type(lecturerInput, 'Test Lecturer');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Access Control Features', () => {
    beforeEach(async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
    });

    it('should show visibility options', () => {
      expect(screen.getByText('🔒 Private')).toBeInTheDocument();
      expect(screen.getByText('🤝 Shared')).toBeInTheDocument();
      expect(screen.getByText('🌍 Public')).toBeInTheDocument();
    });

    it('should default to public visibility for admin users', () => {
      const publicRadio = screen.getByDisplayValue('public');
      expect(publicRadio).toBeChecked();
    });

    it('should show presenter selection when shared is selected', async () => {
      // Mock fetch for presenters
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presenters: [
            { _id: 'presenter1', name: 'Presenter 1', email: 'p1@test.com' },
            { _id: 'presenter2', name: 'Presenter 2', email: 'p2@test.com' }
          ]
        })
      });

      const sharedRadio = screen.getByDisplayValue('shared');
      await userEvent.click(sharedRadio);
      
      await waitFor(() => {
        expect(screen.getByText('Select presenters to share with:')).toBeInTheDocument();
      });
    });

    it('should show broadcast ready checkbox', () => {
      expect(screen.getByText('📡 Broadcast Ready')).toBeInTheDocument();
      const broadcastCheckbox = screen.getByRole('checkbox', { name: /Broadcast Ready/i });
      expect(broadcastCheckbox).toBeChecked(); // Should be checked by default
    });
  });

  describe('Upload Process', () => {
    beforeEach(async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
      
      const titleInput = screen.getByLabelText(/Title/);
      await userEvent.type(titleInput, 'Test Audio');
      
      const lecturerInput = screen.getByLabelText(/Speaker\/Lecturer/);
      await userEvent.type(lecturerInput, 'Test Lecturer');
    });

    it('should show upload progress during upload', async () => {
      // Mock XMLHttpRequest
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        upload: {
          addEventListener: jest.fn()
        },
        addEventListener: jest.fn(),
        status: 200,
        responseText: JSON.stringify({ success: true, message: 'Upload successful' })
      };
      
      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      // Simulate progress event
      const progressHandler = mockXHR.upload.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )[1];
      
      progressHandler({ lengthComputable: true, loaded: 50, total: 100 });
      
      await waitFor(() => {
        expect(screen.getByText('⬆️ Uploading Audio')).toBeInTheDocument();
        expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
      });
    });

    it('should handle successful upload', async () => {
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        upload: { addEventListener: jest.fn() },
        addEventListener: jest.fn(),
        status: 200,
        responseText: JSON.stringify({ success: true, message: 'Upload successful' })
      };
      
      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      // Simulate successful response
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];
      
      loadHandler();
      
      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('should handle upload errors', async () => {
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        upload: { addEventListener: jest.fn() },
        addEventListener: jest.fn(),
        status: 400,
        statusText: 'Bad Request',
        responseText: JSON.stringify({ success: false, message: 'File too large' })
      };
      
      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      // Simulate error response
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];
      
      loadHandler();
      
      await waitFor(() => {
        expect(screen.getByText(/File too large/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle network errors', async () => {
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        upload: { addEventListener: jest.fn() },
        addEventListener: jest.fn()
      };
      
      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      // Simulate network error
      const errorHandler = mockXHR.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      errorHandler();
      
      await waitFor(() => {
        expect(screen.getByText('Network error during upload')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful upload', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
      
      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      await userEvent.type(titleInput, 'Test Audio');
      
      const lecturerInput = screen.getByLabelText(/Speaker\/Lecturer/) as HTMLInputElement;
      await userEvent.type(lecturerInput, 'Test Lecturer');
      
      // Mock successful upload
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        upload: { addEventListener: jest.fn() },
        addEventListener: jest.fn(),
        status: 200,
        responseText: JSON.stringify({ success: true, message: 'Upload successful' })
      };
      
      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);
      
      const submitButton = screen.getByRole('button', { name: /Upload Audio/i });
      await userEvent.click(submitButton);
      
      // Simulate successful response
      const loadHandler = mockXHR.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];
      loadHandler();
      
      await waitFor(() => {
        expect(titleInput.value).toBe('');
        expect(lecturerInput.value).toBe('');
        expect(screen.queryByText('test-audio.mp3')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should allow manual form reset', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      const file = new File(['fake content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
      
      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      await userEvent.type(titleInput, 'Test Audio');
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);
      
      expect(titleInput.value).toBe('');
      expect(screen.queryByText('test-audio.mp3')).not.toBeInTheDocument();
    });
  });

  describe('File Size Display', () => {
    it('should display file size in human-readable format', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      // Create a 5MB file
      const file = new File(['x'.repeat(5 * 1024 * 1024)], 'test-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('5.00 MB')).toBeInTheDocument();
      });
    });

    it('should display small file sizes in KB', async () => {
      render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);
      
      // Create a 500KB file
      const file = new File(['x'.repeat(500 * 1024)], 'small-audio.mp3', { type: 'audio/mpeg' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(hiddenInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('500.00 KB')).toBeInTheDocument();
      });
    });
  });
});