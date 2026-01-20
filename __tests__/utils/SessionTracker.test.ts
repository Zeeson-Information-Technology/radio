/**
 * Property-based tests for SessionTracker utility
 * Feature: admin-conversion-updates
 * Tests Properties 8, 10, 11: Session tracking, persistence, limits
 */

import * as fc from 'fast-check';
import { SessionTracker, getSessionTracker, resetSessionTracker } from '@/lib/utils/SessionTracker';

// Mock sessionStorage for testing
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Mock window and sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('SessionTracker - Property Tests', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    jest.clearAllMocks();
    resetSessionTracker();
    // Ensure clean state for each test
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  /**
   * Property 8: Session tracking
   * For any file uploaded by an admin, it should be added to the current session tracking
   */
  test('Feature: admin-conversion-updates, Property 8: Session tracking', () => {
    const property = fc.property(
      fc.array(fc.hexaString({ minLength: 24, maxLength: 24 }), { minLength: 1, maxLength: 20 }),
      (fileIds) => {
        const tracker = new SessionTracker();
        
        // Add all files to tracking
        fileIds.forEach(fileId => {
          tracker.addFile(fileId);
        });

        // Verify all unique files are tracked
        const uniqueFileIds = [...new Set(fileIds)];
        const trackedFiles = tracker.getFiles();
        
        // Should track all unique files (up to limit of 50)
        const expectedCount = Math.min(uniqueFileIds.length, 50);
        expect(trackedFiles).toHaveLength(expectedCount);
        
        // All tracked files should be findable
        trackedFiles.forEach(fileId => {
          expect(tracker.isSessionFile(fileId)).toBe(true);
        });

        // If under limit, should contain all unique files
        if (uniqueFileIds.length <= 50) {
          // Files should be in reverse order (most recent first)
          const expectedOrder = [...uniqueFileIds].reverse();
          expect(trackedFiles).toEqual(expectedOrder);
        }
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  /**
   * Property 10: Session persistence
   * For any browser navigation within the same session, session-tracked files should remain available
   */
  test('Feature: admin-conversion-updates, Property 10: Session persistence', () => {
    // Create a separate storage mock for this test to avoid interference
    const persistentStorage: Record<string, string> = {};
    const persistentMock = {
      getItem: jest.fn((key: string) => persistentStorage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        persistentStorage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete persistentStorage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(persistentStorage).forEach(key => delete persistentStorage[key]);
      })
    };

    // Temporarily replace the mock
    const originalMock = mockSessionStorage;
    Object.assign(mockSessionStorage, persistentMock);

    try {
      const property = fc.property(
        fc.array(fc.hexaString({ minLength: 24, maxLength: 24 }), { minLength: 1, maxLength: 10 }),
        (fileIds) => {
          // First tracker instance - simulate initial page load
          const tracker1 = new SessionTracker();
          
          fileIds.forEach(fileId => {
            tracker1.addFile(fileId);
          });

          const filesBeforeNavigation = tracker1.getFiles();

          // Second tracker instance - simulate navigation/page reload
          // Storage should persist, so new instance should load from storage
          const tracker2 = new SessionTracker();
          const filesAfterNavigation = tracker2.getFiles();

          // Files should persist across navigation
          expect(filesAfterNavigation).toEqual(filesBeforeNavigation);
          
          // All unique files should still be tracked
          const uniqueFileIds = [...new Set(fileIds)];
          uniqueFileIds.forEach(fileId => {
            expect(tracker2.isSessionFile(fileId)).toBe(true);
          });
        }
      );

      fc.assert(property, { numRuns: 50 }); // Reduced runs for this complex test
    } finally {
      // Restore original mock
      Object.assign(mockSessionStorage, originalMock);
    }
  });

  /**
   * Property 11: Session limits
   * For any session tracking operation, the maximum number of tracked files should not exceed 50
   */
  test('Feature: admin-conversion-updates, Property 11: Session limits', () => {
    const property = fc.property(
      fc.array(fc.hexaString({ minLength: 24, maxLength: 24 }), { minLength: 51, maxLength: 100 }),
      (fileIds) => {
        const tracker = new SessionTracker();
        
        // Add more than 50 files
        fileIds.forEach(fileId => {
          tracker.addFile(fileId);
        });

        // Should never exceed 50 files
        expect(tracker.getCount()).toBeLessThanOrEqual(50);
        expect(tracker.getFiles()).toHaveLength(tracker.getCount());

        // Should contain the most recent 50 unique files
        const uniqueFileIds = [...new Set(fileIds)];
        if (uniqueFileIds.length > 50) {
          const expectedFiles = uniqueFileIds.slice(-50).reverse();
          expect(tracker.getFiles()).toEqual(expectedFiles);
        }
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  // Unit tests for specific behaviors
  test('should handle duplicate file IDs correctly', () => {
    const tracker = new SessionTracker();
    
    tracker.addFile('file1');
    tracker.addFile('file2');
    tracker.addFile('file1'); // Duplicate
    
    const files = tracker.getFiles();
    expect(files).toEqual(['file1', 'file2']); // file1 moved to end
    expect(tracker.getCount()).toBe(2);
  });

  test('should handle invalid inputs gracefully', () => {
    const tracker = new SessionTracker();
    
    // Should not crash or add invalid entries
    tracker.addFile('');
    tracker.addFile(null as any);
    tracker.addFile(undefined as any);
    tracker.addFile(123 as any);
    
    expect(tracker.getCount()).toBe(0);
    expect(tracker.getFiles()).toEqual([]);
  });

  test('should clear session correctly', () => {
    const tracker = new SessionTracker();
    
    tracker.addFile('file1');
    tracker.addFile('file2');
    expect(tracker.getCount()).toBe(2);
    
    tracker.clearSession();
    expect(tracker.getCount()).toBe(0);
    expect(tracker.getFiles()).toEqual([]);
    expect(tracker.isSessionFile('file1')).toBe(false);
  });

  test('should remove specific files correctly', () => {
    const tracker = new SessionTracker();
    
    tracker.addFile('file1');
    tracker.addFile('file2');
    tracker.addFile('file3');
    
    tracker.removeFile('file2');
    
    expect(tracker.getFiles()).toEqual(['file3', 'file1']);
    expect(tracker.isSessionFile('file2')).toBe(false);
    expect(tracker.getCount()).toBe(2);
  });

  test('should handle storage errors gracefully', () => {
    // Mock storage failure
    mockSessionStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    const tracker = new SessionTracker();
    
    // Should not crash when storage fails
    expect(() => {
      tracker.addFile('file1');
    }).not.toThrow();
    
    expect(tracker.isSessionFile('file1')).toBe(true); // Still works in memory
  });

  test('should work with singleton pattern', () => {
    const tracker1 = getSessionTracker();
    const tracker2 = getSessionTracker();
    
    expect(tracker1).toBe(tracker2); // Same instance
    
    tracker1.addFile('file1');
    expect(tracker2.isSessionFile('file1')).toBe(true);
  });

  test('should reset singleton correctly', () => {
    const tracker1 = getSessionTracker();
    tracker1.addFile('file1');
    
    // Clear storage to simulate fresh start
    mockSessionStorage.clear();
    resetSessionTracker();
    
    const tracker2 = getSessionTracker();
    expect(tracker2).not.toBe(tracker1); // Different instance
    expect(tracker2.isSessionFile('file1')).toBe(false); // Data cleared
  });
});