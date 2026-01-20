/**
 * Drag and Drop tests for AudioUpload component
 * Tests the visual feedback when dragging files over the upload area
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AudioUpload from '@/app/admin/audio/AudioUpload';

// Mock dependencies
jest.mock('@/lib/utils/audio-formats', () => ({
  getSupportedMimeTypes: () => ['audio/mp3', 'audio/wav', 'audio/m4a'],
  SUPPORTED_AUDIO_FORMATS: {
    mp3: { name: 'MP3', mimeTypes: ['audio/mp3'] },
    wav: { name: 'WAV', mimeTypes: ['audio/wav'] },
    m4a: { name: 'M4A', mimeTypes: ['audio/m4a'] }
  },
  getFormatByExtension: (ext: string) => ext === 'mp3' ? { name: 'MP3' } : null
}));

jest.mock('@/app/admin/audio/SupportedFormats', () => {
  return function MockSupportedFormats() {
    return <div data-testid="supported-formats">Supported formats info</div>;
  };
});

jest.mock('@/app/admin/audio/LecturerComboBox', () => {
  return function MockLecturerComboBox({ value, onChange, placeholder }: any) {
    return (
      <input
        data-testid="lecturer-combobox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  };
});

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

const mockOnUploadSuccess = jest.fn();

describe('AudioUpload - Drag and Drop Visual Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show visual feedback when dragging files over drop zone', () => {
    render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);

    const dropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    expect(dropZone).toBeInTheDocument();

    // Initially should not have drag-over styles
    expect(dropZone).not.toHaveClass('border-emerald-500');
    expect(dropZone).not.toHaveClass('bg-emerald-50');

    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [new File(['test'], 'test.mp3', { type: 'audio/mp3' })]
      }
    });

    // Should now have drag-over styles
    expect(dropZone).toHaveClass('border-emerald-500');
    expect(dropZone).toHaveClass('bg-emerald-50');
    expect(dropZone).toHaveClass('shadow-lg');
    expect(dropZone).toHaveClass('scale-[1.02]');

    // Should show different text and icon
    expect(screen.getByText('Drop your audio file here!')).toBeInTheDocument();
    expect(screen.getByText('📥')).toBeInTheDocument();
  });

  test('should remove visual feedback when drag leaves drop zone', () => {
    render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);

    const dropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    
    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [new File(['test'], 'test.mp3', { type: 'audio/mp3' })]
      }
    });

    // Should have drag-over styles
    expect(dropZone).toHaveClass('border-emerald-500');

    // Simulate drag leave
    fireEvent.dragLeave(dropZone!, {
      clientX: 0,
      clientY: 0
    });

    // Should remove drag-over styles immediately
    expect(dropZone).not.toHaveClass('border-emerald-500');
    expect(dropZone).not.toHaveClass('bg-emerald-50');

    // Should show original text and icon
    expect(screen.getByText('Drop your audio file here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  test('should remove visual feedback when file is dropped', () => {
    render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);

    const dropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    
    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [new File(['test'], 'test.mp3', { type: 'audio/mp3' })]
      }
    });

    // Should have drag-over styles
    expect(dropZone).toHaveClass('border-emerald-500');

    // Simulate drop
    const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mp3' });
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile]
      }
    });

    // After dropping, the file should be selected and the drop zone should be hidden
    // Instead, we should see the selected file UI
    expect(screen.getByText('test.mp3')).toBeInTheDocument();
    
    // The drop zone should no longer be visible
    expect(screen.queryByText('Drop your audio file here or click to browse')).not.toBeInTheDocument();
  });

  test('should maintain hover styles when not dragging', () => {
    render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);

    const dropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    
    // Should have hover styles in normal state
    expect(dropZone).toHaveClass('hover:border-emerald-400');
  });

  test('should reset drag state when form is reset', () => {
    render(<AudioUpload admin={mockAdmin} onUploadSuccess={mockOnUploadSuccess} />);

    const dropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    
    // First, select a file to show the form
    const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mp3' });
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile]
      }
    });

    // Should show the selected file
    expect(screen.getByText('test.mp3')).toBeInTheDocument();

    // Simulate drag enter on the now-hidden drop zone (form is showing)
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [new File(['test'], 'test2.mp3', { type: 'audio/mp3' })]
      }
    });

    // Find and click the remove button (✕)
    const removeButton = screen.getByTitle('Remove file');
    fireEvent.click(removeButton);

    // Should be back to the drop zone without drag styles
    const newDropZone = screen.getByText('Drop your audio file here or click to browse').closest('div');
    expect(newDropZone).not.toHaveClass('border-emerald-500');
    expect(newDropZone).not.toHaveClass('bg-emerald-50');
  });
});