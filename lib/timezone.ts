/**
 * Timezone utilities for converting Nigeria time (WAT) to user's local time
 * 
 * Nigeria uses West Africa Time (WAT) which is UTC+1 with no DST
 */

const NIGERIA_UTC_OFFSET = 1; // WAT is UTC+1

/**
 * Convert Nigeria time (WAT) to user's local time
 * @param watTime - Time in Nigeria (HH:MM format)
 * @returns Local time string (HH:MM format)
 */
export function convertWATToLocal(watTime: string): string {
  const [hours, minutes] = watTime.split(':').map(Number);
  
  // Create a date object for today in WAT
  const now = new Date();
  const watDate = new Date(now);
  watDate.setHours(hours, minutes, 0, 0);
  
  // Convert WAT to UTC by subtracting the offset
  const utcTime = watDate.getTime() - (NIGERIA_UTC_OFFSET * 60 * 60 * 1000);
  
  // Create local date (browser automatically converts to user's timezone)
  const localDate = new Date(utcTime);
  
  // Format as HH:MM
  const localHours = localDate.getHours().toString().padStart(2, '0');
  const localMinutes = localDate.getMinutes().toString().padStart(2, '0');
  
  return `${localHours}:${localMinutes}`;
}

/**
 * Get user's timezone name
 * @returns Timezone string (e.g., "Africa/Lagos", "America/New_York")
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

/**
 * Get user's timezone offset in hours from UTC
 * @returns Offset in hours (e.g., +1, -5)
 */
export function getUserTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

/**
 * Check if user is in Nigeria timezone
 * @returns true if user is in WAT timezone
 */
export function isUserInNigeria(): boolean {
  const tz = getUserTimezone();
  return tz === 'Africa/Lagos' || getUserTimezoneOffset() === NIGERIA_UTC_OFFSET;
}

/**
 * Format timezone offset as string
 * @param offset - Offset in hours
 * @returns Formatted string (e.g., "UTC+1", "UTC-5")
 */
export function formatTimezoneOffset(offset: number): string {
  if (offset === 0) return 'UTC';
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

/**
 * Get user's timezone display string
 * @returns Formatted timezone string (e.g., "Africa/Lagos (UTC+1)")
 */
export function getUserTimezoneDisplay(): string {
  const tz = getUserTimezone();
  const offset = getUserTimezoneOffset();
  const offsetStr = formatTimezoneOffset(offset);
  
  return `${tz} (${offsetStr})`;
}
