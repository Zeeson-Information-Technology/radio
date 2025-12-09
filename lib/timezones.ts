/**
 * Common timezones for schedule creation
 * Organized by region for easy selection
 */

export interface TimezoneOption {
  value: string; // IANA timezone identifier
  label: string; // Display name
  offset: string; // UTC offset for reference
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // Africa
  { value: "Africa/Lagos", label: "Nigeria (Lagos) - WAT", offset: "UTC+1" },
  { value: "Africa/Cairo", label: "Egypt (Cairo) - EET", offset: "UTC+2" },
  { value: "Africa/Johannesburg", label: "South Africa (Johannesburg) - SAST", offset: "UTC+2" },
  { value: "Africa/Nairobi", label: "Kenya (Nairobi) - EAT", offset: "UTC+3" },
  { value: "Africa/Accra", label: "Ghana (Accra) - GMT", offset: "UTC+0" },
  
  // Middle East
  { value: "Asia/Riyadh", label: "Saudi Arabia (Riyadh) - AST", offset: "UTC+3" },
  { value: "Asia/Dubai", label: "UAE (Dubai) - GST", offset: "UTC+4" },
  { value: "Asia/Qatar", label: "Qatar (Doha) - AST", offset: "UTC+3" },
  { value: "Asia/Kuwait", label: "Kuwait - AST", offset: "UTC+3" },
  
  // Europe
  { value: "Europe/London", label: "UK (London) - GMT/BST", offset: "UTC+0/+1" },
  { value: "Europe/Paris", label: "France (Paris) - CET", offset: "UTC+1/+2" },
  { value: "Europe/Berlin", label: "Germany (Berlin) - CET", offset: "UTC+1/+2" },
  { value: "Europe/Istanbul", label: "Turkey (Istanbul) - TRT", offset: "UTC+3" },
  
  // North America
  { value: "America/New_York", label: "USA (New York) - EST/EDT", offset: "UTC-5/-4" },
  { value: "America/Chicago", label: "USA (Chicago) - CST/CDT", offset: "UTC-6/-5" },
  { value: "America/Denver", label: "USA (Denver) - MST/MDT", offset: "UTC-7/-6" },
  { value: "America/Los_Angeles", label: "USA (Los Angeles) - PST/PDT", offset: "UTC-8/-7" },
  { value: "America/Toronto", label: "Canada (Toronto) - EST/EDT", offset: "UTC-5/-4" },
  
  // Asia
  { value: "Asia/Karachi", label: "Pakistan (Karachi) - PKT", offset: "UTC+5" },
  { value: "Asia/Kolkata", label: "India (Delhi) - IST", offset: "UTC+5:30" },
  { value: "Asia/Dhaka", label: "Bangladesh (Dhaka) - BST", offset: "UTC+6" },
  { value: "Asia/Jakarta", label: "Indonesia (Jakarta) - WIB", offset: "UTC+7" },
  { value: "Asia/Singapore", label: "Singapore - SGT", offset: "UTC+8" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia (Kuala Lumpur) - MYT", offset: "UTC+8" },
  
  // Australia
  { value: "Australia/Sydney", label: "Australia (Sydney) - AEDT", offset: "UTC+10/+11" },
  { value: "Australia/Melbourne", label: "Australia (Melbourne) - AEDT", offset: "UTC+10/+11" },
];

/**
 * Get timezone display name with offset
 */
export function getTimezoneDisplay(timezone: string): string {
  const tz = COMMON_TIMEZONES.find(t => t.value === timezone);
  return tz ? tz.label : timezone;
}

/**
 * Convert time from one timezone to another
 * @param time - Time in HH:MM format
 * @param fromTimezone - Source timezone
 * @param toTimezone - Target timezone
 * @param dayOfWeek - Day of week (0-6)
 * @returns Converted time in HH:MM format
 */
export function convertTimeBetweenTimezones(
  time: string,
  fromTimezone: string,
  toTimezone: string,
  dayOfWeek: number
): { time: string; dayOfWeek: number } {
  try {
    // Create a date object for the given day and time in the source timezone
    const [hours, minutes] = time.split(':').map(Number);
    
    // Get a date for the specified day of week
    const now = new Date();
    const currentDay = now.getDay();
    const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // Format in source timezone
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    // Format in target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    
    const targetTime = targetFormatter.format(targetDate);
    const [day, timeStr] = targetTime.split(', ');
    
    // Map day name to number
    const dayMap: { [key: string]: number } = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    return {
      time: timeStr,
      dayOfWeek: dayMap[day] ?? dayOfWeek,
    };
  } catch (error) {
    console.error('Error converting timezone:', error);
    return { time, dayOfWeek };
  }
}
