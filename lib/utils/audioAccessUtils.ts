/**
 * Audio Access Control Utilities for Frontend Components
 * Requirements: 8.5, 8.6, 8.7
 */

export interface UserContext {
  id: string;
  role: string;
  email?: string;
}

export interface AudioFile {
  id: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  createdBy: string | { _id: string; name: string; email: string };
  [key: string]: any;
}

/**
 * Check if user can access an audio file (client-side)
 */
export function canAccessAudio(audioFile: AudioFile, user: UserContext): boolean {
  // Super admins can access everything
  if (user.role === 'super_admin') {
    return true;
  }

  // Get creator ID
  const creatorId = typeof audioFile.createdBy === 'string' 
    ? audioFile.createdBy 
    : audioFile.createdBy._id;

  // Owner can always access
  if (creatorId === user.id) {
    return true;
  }

  // Check visibility-based access
  switch (audioFile.visibility) {
    case 'public':
      return true;
    
    case 'shared':
      return audioFile.sharedWith.includes(user.id);
    
    case 'private':
      return false;
    
    default:
      return false;
  }
}

/**
 * Check if user can modify an audio file (client-side)
 */
export function canModifyAudio(audioFile: AudioFile, user: UserContext): boolean {
  // Super admins can modify everything
  if (user.role === 'super_admin') {
    return true;
  }

  // Get creator ID
  const creatorId = typeof audioFile.createdBy === 'string' 
    ? audioFile.createdBy 
    : audioFile.createdBy._id;

  // Only owner can modify (except super admins)
  return creatorId === user.id;
}

/**
 * Check if user can share an audio file
 */
export function canShareAudio(audioFile: AudioFile, user: UserContext): boolean {
  return canModifyAudio(audioFile, user);
}

/**
 * Check if user can delete an audio file
 */
export function canDeleteAudio(audioFile: AudioFile, user: UserContext): boolean {
  return canModifyAudio(audioFile, user);
}

/**
 * Filter audio files based on user access
 */
export function filterAccessibleAudio(audioFiles: AudioFile[], user: UserContext): AudioFile[] {
  return audioFiles.filter(file => canAccessAudio(file, user));
}

/**
 * Get visibility display text
 */
export function getVisibilityDisplay(visibility: string): { text: string; icon: string; color: string } {
  switch (visibility) {
    case 'public':
      return { text: 'Public', icon: '🌍', color: 'text-green-700 bg-green-100' };
    case 'shared':
      return { text: 'Shared', icon: '🤝', color: 'text-blue-700 bg-blue-100' };
    case 'private':
      return { text: 'Private', icon: '🔒', color: 'text-gray-700 bg-gray-100' };
    default:
      return { text: 'Unknown', icon: '❓', color: 'text-gray-700 bg-gray-100' };
  }
}

/**
 * Get role display information
 */
export function getRoleDisplay(role: string): { text: string; icon: string; color: string } {
  switch (role) {
    case 'super_admin':
      return { text: 'Super Admin', icon: '👑', color: 'text-purple-700 bg-purple-100' };
    case 'admin':
      return { text: 'Admin', icon: '🛡️', color: 'text-red-700 bg-red-100' };
    case 'presenter':
      return { text: 'Presenter', icon: '🎙️', color: 'text-blue-700 bg-blue-100' };
    default:
      return { text: 'User', icon: '👤', color: 'text-gray-700 bg-gray-100' };
  }
}

/**
 * Check if user has minimum role requirement
 */
export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'presenter': 1,
    'admin': 2,
    'super_admin': 3
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Get default visibility for user role
 */
export function getDefaultVisibility(userRole: string): 'private' | 'shared' | 'public' {
  switch (userRole) {
    case 'super_admin':
    case 'admin':
      return 'public'; // Admins default to public for station-wide access
    case 'presenter':
      return 'private'; // Presenters default to private for personal use
    default:
      return 'private';
  }
}

/**
 * Validate sharing permissions
 */
export function validateSharing(
  audioFile: AudioFile, 
  user: UserContext, 
  targetVisibility: string, 
  sharedWith: string[]
): { isValid: boolean; error?: string } {
  // Check if user can modify the file
  if (!canModifyAudio(audioFile, user)) {
    return { isValid: false, error: 'You can only modify your own audio files' };
  }

  // Validate visibility value
  if (!['private', 'shared', 'public'].includes(targetVisibility)) {
    return { isValid: false, error: 'Invalid visibility setting' };
  }

  // If shared, must have at least one presenter
  if (targetVisibility === 'shared' && (!sharedWith || sharedWith.length === 0)) {
    return { isValid: false, error: 'Shared audio must be shared with at least one presenter' };
  }

  // Cannot share with self
  if (targetVisibility === 'shared' && sharedWith.includes(user.id)) {
    return { isValid: false, error: 'Cannot share audio with yourself' };
  }

  return { isValid: true };
}

/**
 * Format sharing information for display
 */
export function formatSharingInfo(audioFile: AudioFile): string {
  switch (audioFile.visibility) {
    case 'public':
      return 'Available to all presenters';
    case 'shared':
      const count = audioFile.sharedWith.length;
      return `Shared with ${count} presenter${count !== 1 ? 's' : ''}`;
    case 'private':
      return 'Only visible to you';
    default:
      return 'Unknown sharing status';
  }
}

/**
 * Get audio file actions based on user permissions
 */
export function getAudioActions(audioFile: AudioFile, user: UserContext): {
  canView: boolean;
  canPlay: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  canFavorite: boolean;
} {
  const canAccess = canAccessAudio(audioFile, user);
  const canModify = canModifyAudio(audioFile, user);

  return {
    canView: canAccess,
    canPlay: canAccess,
    canEdit: canModify,
    canShare: canModify,
    canDelete: canModify,
    canFavorite: canAccess
  };
}

/**
 * Sort audio files by access level and usage
 */
export function sortAudioByRelevance(audioFiles: AudioFile[], user: UserContext): AudioFile[] {
  return [...audioFiles].sort((a, b) => {
    // Owner files first
    const aIsOwner = canModifyAudio(a, user) ? 1 : 0;
    const bIsOwner = canModifyAudio(b, user) ? 1 : 0;
    if (aIsOwner !== bIsOwner) return bIsOwner - aIsOwner;

    // Then by broadcast usage count
    const aUsage = a.broadcastUsageCount || 0;
    const bUsage = b.broadcastUsageCount || 0;
    if (aUsage !== bUsage) return bUsage - aUsage;

    // Finally by creation date (newest first)
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}