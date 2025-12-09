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

/**
 * Convert time from a specific timezone to user's local timezone
 * @param time - Time in HH:MM format
 * @param fromTimezone - Source timezone (IANA format, e.g., "Africa/Lagos")
 * @returns Local time string in HH:MM format
 */
export function convertTimezoneToLocal(time: string, fromTimezone: string = "Africa/Lagos"): string {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    
    // Get today's date components
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Create a date string that represents "today at this time" in the source timezone
    // We'll use the locale string to create a date in that timezone
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Create a date object representing this moment in UTC
    const referenceDate = new Date();
    
    // Format the reference date in the source timezone to understand the offset
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: fromTimezone,
    });
    
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
    
    // Get the same moment in both timezones
    const sourceParts = sourceFormatter.formatToParts(referenceDate);
    const utcParts = utcFormatter.formatToParts(referenceDate);
    
    // Extract hours and minutes
    const sourceHour = parseInt(sourceParts.find(p => p.type === 'hour')?.value || '0');
    const sourceMinute = parseInt(sourceParts.find(p => p.type === 'minute')?.value || '0');
    const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0');
    const utcMinute = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0');
    
    // Calculate the offset in minutes
    const sourceMinutes = sourceHour * 60 + sourceMinute;
    const utcMinutes = utcHour * 60 + utcMinute;
    let offsetMinutes = sourceMinutes - utcMinutes;
    
    // Handle day boundary crossing
    if (offsetMinutes > 720) offsetMinutes -= 1440;
    if (offsetMinutes < -720) offsetMinutes += 1440;
    
    // Convert input time to minutes
    const inputMinutes = hours * 60 + minutes;
    
    // Subtract offset to get UTC time
    const utcTotalMinutes = inputMinutes - offsetMinutes;
    
    // Create a UTC date with this time
    const utcDate = new Date(Date.UTC(year, month, day, Math.floor(utcTotalMinutes / 60), utcTotalMinutes % 60, 0));
    
    // Get local time
    const localHours = utcDate.getHours().toString().padStart(2, '0');
    const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
    
    return `${localHours}:${localMinutes}`;
  } catch (error) {
    console.error('Error converting timezone:', error, 'from', fromTimezone, 'time', time);
    // Fallback: return original time
    return time;
  }
}
