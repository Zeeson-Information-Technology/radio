/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LecturerComboBox from '@/app/admin/audio/LecturerComboBox';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('LecturerComboBox', () => {
  const mockOnChange = jest.fn();
  
  const mockLecturers = [
    {
      _id: '1',
      name: 'Dr. Ahmed Hassan',
      recordingCount: 15,
      isVerified: true
    },
    {
      _id: '2', 
      name: 'Sheikh Omar Ali',
      recordingCount: 8,
      isVerified: false
    },
    {
      _id: '3',
      name: 'Prof. Fatima Said',
      recordingCount: 22,
      isVerified: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        lecturers: mockLecturers
      })
    } as Response);
  });

  it('should render input field with placeholder', () => {
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
        placeholder="Select lecturer"
      />
    );

    expect(screen.getByPlaceholderText('Select lecturer')).toBeInTheDocument();
  });

  it('should load lecturers on mount', async () => {
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/lecturers');
    });
  });

  it('should show dropdown when input is focused', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
      expect(screen.getByText('Sheikh Omar Ali')).toBeInTheDocument();
      expect(screen.getByText('Prof. Fatima Said')).toBeInTheDocument();
    });
  });

  it('should filter lecturers based on input value', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'Ahmed');

    await waitFor(() => {
      expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
      expect(screen.queryByText('Sheikh Omar Ali')).not.toBeInTheDocument();
      expect(screen.queryByText('Prof. Fatima Said')).not.toBeInTheDocument();
    });

    expect(mockOnChange).toHaveBeenCalledWith('Ahmed');
  });

  it('should show verified checkmark for verified lecturers', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      // Dr. Ahmed Hassan and Prof. Fatima Said are verified
      const verifiedMarks = screen.getAllByText('✓');
      expect(verifiedMarks).toHaveLength(2);
    });
  });

  it('should show recording count for each lecturer', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('15 recordings')).toBeInTheDocument();
      expect(screen.getByText('8 recordings')).toBeInTheDocument();
      expect(screen.getByText('22 recordings')).toBeInTheDocument();
    });
  });

  it('should select lecturer when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Dr. Ahmed Hassan'));

    expect(mockOnChange).toHaveBeenCalledWith('Dr. Ahmed Hassan');
  });

  it('should show "Create new" option for non-existing names', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'New Lecturer Name');

    await waitFor(() => {
      expect(screen.getByText('Create new: "New Lecturer Name"')).toBeInTheDocument();
      expect(screen.getByText('Add as new lecturer')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
    });

    // Test arrow down navigation
    await user.keyboard('{ArrowDown}');
    
    // The first item should be highlighted (we can't easily test visual highlighting in jsdom)
    // But we can test that Enter selects the first item
    await user.keyboard('{Enter}');

    expect(mockOnChange).toHaveBeenCalledWith('Dr. Ahmed Hassan');
  });

  it('should close dropdown on Escape key', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Dr. Ahmed Hassan')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Dr. Ahmed Hassan')).not.toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Network error loading lecturers')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, lecturers: [] })
        } as Response), 100)
      )
    );
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    // Should show loading state initially
    expect(screen.getByText('Loading lecturers...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading lecturers...')).not.toBeInTheDocument();
    });
  });

  it('should handle empty lecturer list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        lecturers: []
      })
    } as Response);
    
    render(
      <LecturerComboBox
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('No lecturers found. Start typing to create a new one.')).toBeInTheDocument();
    });
  });
});