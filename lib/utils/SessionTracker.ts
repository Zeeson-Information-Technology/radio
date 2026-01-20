/**
 * SessionTracker Utility
 * Tracks files uploaded in current browser session for optimization
 * Requirements: 4.1, 4.3, 4.5
 */

export class SessionTracker {
  private static readonly STORAGE_KEY = 'admin_uploaded_files';
  private static readonly MAX_FILES = 50;
  private uploadedFiles: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add a file to session tracking (Requirement 4.1)
   * Implements FIFO overflow handling when limit is reached (Requirement 4.5)
   */
  addFile(fileId: string): void {
    if (!fileId || typeof fileId !== 'string') {
      return;
    }

    // Remove if already exists to update position
    this.uploadedFiles.delete(fileId);
    
    // Add to end
    this.uploadedFiles.add(fileId);

    // Enforce limit with FIFO (Requirement 4.5)
    if (this.uploadedFiles.size > SessionTracker.MAX_FILES) {
      const iterator = this.uploadedFiles.values();
      const firstFile = iterator.next().value;
      if (firstFile) {
        this.uploadedFiles.delete(firstFile);
      }
    }

    this.saveToStorage();
  }

  /**
   * Get all tracked files in order (most recent first)
   */
  getFiles(): string[] {
    return Array.from(this.uploadedFiles).reverse();
  }

  /**
   * Check if a file is tracked in current session
   */
  isSessionFile(fileId: string): boolean {
    return this.uploadedFiles.has(fileId);
  }

  /**
   * Clear all session tracking
   */
  clearSession(): void {
    this.uploadedFiles.clear();
    this.removeFromStorage();
  }

  /**
   * Get count of tracked files
   */
  getCount(): number {
    return this.uploadedFiles.size;
  }

  /**
   * Remove a specific file from tracking
   */
  removeFile(fileId: string): void {
    this.uploadedFiles.delete(fileId);
    this.saveToStorage();
  }

  /**
   * Load session data from browser storage (Requirement 4.3)
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return; // Server-side rendering
    }

    try {
      const stored = sessionStorage.getItem(SessionTracker.STORAGE_KEY);
      if (stored) {
        const fileArray = JSON.parse(stored);
        if (Array.isArray(fileArray)) {
          // Maintain order and enforce limit
          this.uploadedFiles = new Set(fileArray.slice(-SessionTracker.MAX_FILES));
        }
      }
    } catch (error) {
      console.warn('Failed to load session tracking data:', error);
      this.uploadedFiles = new Set();
    }
  }

  /**
   * Save session data to browser storage (Requirement 4.3)
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return; // Server-side rendering
    }

    try {
      const fileArray = Array.from(this.uploadedFiles);
      sessionStorage.setItem(SessionTracker.STORAGE_KEY, JSON.stringify(fileArray));
    } catch (error) {
      console.warn('Failed to save session tracking data:', error);
    }
  }

  /**
   * Remove session data from browser storage
   */
  private removeFromStorage(): void {
    if (typeof window === 'undefined') {
      return; // Server-side rendering
    }

    try {
      sessionStorage.removeItem(SessionTracker.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove session tracking data:', error);
    }
  }
}

// Singleton instance for global use
let sessionTrackerInstance: SessionTracker | null = null;

/**
 * Get the global SessionTracker instance
 */
export function getSessionTracker(): SessionTracker {
  if (!sessionTrackerInstance) {
    sessionTrackerInstance = new SessionTracker();
  }
  return sessionTrackerInstance;
}

/**
 * Reset the global SessionTracker instance (useful for testing)
 */
export function resetSessionTracker(): void {
  sessionTrackerInstance = null;
}