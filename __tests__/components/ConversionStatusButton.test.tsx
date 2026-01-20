/**
 * Property-based tests for ConversionStatusButton component
 * Feature: admin-conversion-updates
 * Tests Properties 1, 4: Button visibility, loading state consistency
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import ConversionStatusButton from '@/app/admin/audio/ConversionStatusButton';

// Mock audio file generator
const audioFileArbitrary = fc.record({
  id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  conversionStatus: fc.constantFrom('pending', 'processing', 'ready', 'failed')
});

describe('ConversionStatusButton - Property Tests', () => {
  // Clean up DOM after each test iteration
  afterEach(() => {
    cleanup();
  });

  /**
   * Property 1: Button visibility based on converting files
   * For any list of audio files, the conversion status button should be visible 
   * if and only if there are files with conversionStatus 'pending' or 'processing'
   */
  test('Feature: admin-conversion-updates, Property 1: Button visibility based on converting files', () => {
    const property = fc.property(
      fc.array(audioFileArbitrary, { minLength: 0, maxLength: 20 }),
      fc.boolean(), // isLoading
      (allFiles, isLoading) => {
        // Clean up before each property test iteration
        cleanup();
        
        // Filter to only converting files
        const convertingFiles = allFiles.filter(file => 
          ['pending', 'processing'].includes(file.conversionStatus)
        );

        const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

        const { container } = render(
          <ConversionStatusButton
            convertingFiles={convertingFiles}
            onStatusCheck={mockOnStatusCheck}
            isLoading={isLoading}
          />
        );

        // Button should be visible if and only if there are converting files
        const shouldBeVisible = convertingFiles.length > 0;
        
        if (shouldBeVisible) {
          // Should render the component
          expect(container.firstChild).not.toBeNull();
          
          // Should show the correct count
          const countText = convertingFiles.length === 1 ? '1 file currently' : `${convertingFiles.length} files currently`;
          expect(container.textContent).toMatch(new RegExp(countText));
          
          // Should show the check status button - use container to avoid multiple button issues
          const buttons = container.querySelectorAll('button');
          expect(buttons.length).toBe(1);
        } else {
          // Should not render anything
          expect(container.firstChild).toBeNull();
        }
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  /**
   * Property 4: Loading state consistency
   * For any conversion status check operation, the button should show loading state 
   * during the entire API call duration
   */
  test('Feature: admin-conversion-updates, Property 4: Loading state consistency', () => {
    const property = fc.property(
      fc.array(audioFileArbitrary.filter(file => 
        ['pending', 'processing'].includes(file.conversionStatus)
      ), { minLength: 1, maxLength: 10 }),
      fc.boolean(), // isLoading state
      (convertingFiles, isLoading) => {
        // Clean up before each property test iteration
        cleanup();
        
        const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

        const { container } = render(
          <ConversionStatusButton
            convertingFiles={convertingFiles}
            onStatusCheck={mockOnStatusCheck}
            isLoading={isLoading}
          />
        );

        // Use container to find button to avoid multiple button issues
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(1);
        const button = buttons[0];

        // Verify loading state is reflected correctly
        if (isLoading) {
          // Button should be disabled and show loading text
          expect(button).toBeDisabled();
          expect(container.textContent).toMatch(/Checking\.\.\./);
          
          // Should show loading spinner
          const spinner = button.querySelector('.animate-spin');
          expect(spinner).toBeInTheDocument();
          
          // Button should have loading styles
          expect(button).toHaveClass('bg-blue-300', 'text-blue-600', 'cursor-not-allowed');
        } else {
          // Button should be enabled and show normal text
          expect(button).not.toBeDisabled();
          expect(container.textContent).toMatch(/Check Status/);
          
          // Should not show loading spinner
          const spinner = button.querySelector('.animate-spin');
          expect(spinner).toBeNull();
          
          // Button should have normal styles
          expect(button).toHaveClass('bg-blue-600', 'text-white');
        }
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  // Unit tests for specific behaviors
  test('should call onStatusCheck when button is clicked', async () => {
    const convertingFiles = [
      { id: 'file1', title: 'Test File 1', conversionStatus: 'processing' as const },
      { id: 'file2', title: 'Test File 2', conversionStatus: 'pending' as const }
    ];
    
    const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

    render(
      <ConversionStatusButton
        convertingFiles={convertingFiles}
        onStatusCheck={mockOnStatusCheck}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnStatusCheck).toHaveBeenCalledTimes(1);
    });
  });

  test('should not call onStatusCheck when button is disabled (loading)', () => {
    const convertingFiles = [
      { id: 'file1', title: 'Test File 1', conversionStatus: 'processing' as const }
    ];
    
    const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

    render(
      <ConversionStatusButton
        convertingFiles={convertingFiles}
        onStatusCheck={mockOnStatusCheck}
        isLoading={true}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnStatusCheck).not.toHaveBeenCalled();
  });

  test('should display file list correctly', () => {
    const convertingFiles = [
      { id: 'file1', title: 'Test File 1', conversionStatus: 'processing' as const },
      { id: 'file2', title: 'Test File 2', conversionStatus: 'pending' as const },
      { id: 'file3', title: 'Test File 3', conversionStatus: 'processing' as const }
    ];
    
    const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

    render(
      <ConversionStatusButton
        convertingFiles={convertingFiles}
        onStatusCheck={mockOnStatusCheck}
        isLoading={false}
      />
    );

    // Should show all file titles
    expect(screen.getByText('Test File 1')).toBeInTheDocument();
    expect(screen.getByText('Test File 2')).toBeInTheDocument();
    expect(screen.getByText('Test File 3')).toBeInTheDocument();

    // Should show conversion status
    expect(screen.getAllByText('processing')).toHaveLength(2);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  test('should handle more than 5 files correctly', () => {
    const convertingFiles = Array.from({ length: 7 }, (_, i) => ({
      id: `file${i + 1}`,
      title: `Test File ${i + 1}`,
      conversionStatus: 'processing' as const
    }));
    
    const mockOnStatusCheck = jest.fn().mockResolvedValue(undefined);

    render(
      <ConversionStatusButton
        convertingFiles={convertingFiles}
        onStatusCheck={mockOnStatusCheck}
        isLoading={false}
      />
    );

    // Should show first 5 files
    expect(screen.getByText('Test File 1')).toBeInTheDocument();
    expect(screen.getByText('Test File 5')).toBeInTheDocument();
    
    // Should show "+2 more files..." message
    expect(screen.getByText('+2 more files...')).toBeInTheDocument();
    
    // Should not show files beyond 5
    expect(screen.queryByText('Test File 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Test File 7')).not.toBeInTheDocument();
  });

  test('should handle async errors gracefully', async () => {
    const convertingFiles = [
      { id: 'file1', title: 'Test File 1', conversionStatus: 'processing' as const }
    ];
    
    const mockOnStatusCheck = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ConversionStatusButton
        convertingFiles={convertingFiles}
        onStatusCheck={mockOnStatusCheck}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnStatusCheck).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check conversion status:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});