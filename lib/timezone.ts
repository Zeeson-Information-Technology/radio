/**
 * Timezone utilities for converting schedule times to user's local time
 * 
 * Schedule times are stored in UTC and converted to user's local timezone
 */

/**
 * Convert UTC time to user's local time
 * @param utcTime - Time in UTC (HH:MM format)
 * @returns Local time string (HH:MM format)
 */
export function convertUTCToLocal(utcTime: string): string {
  const [hours, minutes] = utcTime.split(':').map(Number);
  
  // Create a date object in UTC
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hours,
    minutes,
    0,
    0
  ));
  
  // Format as HH:MM in user's local timezone
  const localHours = utcDate.getHours().toString().padStart(2, '0');
  const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
  
  return `${localHours}:${localMinutes}`;
}

/**
 * Convert local time to UTC
 * @param localTime - Time in local timezone (HH:MM format)
 * @returns UTC time string (HH:MM format)
 */
export function convertLocalToUTC(localTime: string): string {
  const [hours, minutes] = localTime.split(':').map(Number);
  
  // Create a date object in local time
  const now = new Date();
  const localDate = new Date(now);
  localDate.setHours(hours, minutes, 0, 0);
  
  // Get UTC hours and minutes
  const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${utcHours}:${utcMinutes}`;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use convertUTCToLocal instead
 */
export function convertWATToLocal(watTime: string): string {
  // Assume WAT times are stored as UTC+1, convert to UTC first
  const [hours, minutes] = watTime.split(':').map(Number);
  const utcHours = (hours - 1 + 24) % 24;
  const utcTime = `${utcHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return convertUTCToLocal(utcTime);
}

/**
 * Get user's timezone name
 * @returns Timezone string (e.g., "America/New_York", "Europe/London")
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
 * Check if user is in a specific timezone
 * @param timezone - IANA timezone name (e.g., "Africa/Lagos")
 * @returns true if user is in the specified timezone
 */
export function isUserInTimezone(timezone: string): boolean {
  return getUserTimezone() === timezone;
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
