# Timezone Implementation Guide

## Problem

- Most presenters and listeners are in Nigeria (WAT - UTC+1)
- Some users are in other timezones
- Need to make it easy for everyone to join at the right time

## Recommended Solution

**Store schedules in Nigeria time (WAT), display in user's local time**

This approach:
- ✅ Simple for admins (they enter Nigeria time)
- ✅ Automatic conversion for international users
- ✅ No confusion about "what timezone is this?"
- ✅ Works with browser's built-in timezone detection

## Implementation Steps

### 1. Update Schedule Model (Optional - for clarity)

Add a timezone field to document what timezone the schedule is in:

```typescript
// lib/models/Schedule.ts
interface ISchedule {
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  lecturer: string;
  topic: string;
  active: boolean;
  timezone: string; // "Africa/Lagos" (WAT)
}
```

### 2. Update Admin Forms

Add a note that times are in Nigeria time:

```typescript
// In ScheduleForm.tsx and EditScheduleForm.tsx
<p className="text-sm text-gray-600 mb-4">
  ⏰ All times are in Nigeria time (West Africa Time - WAT, UTC+1)
</p>
```

### 3. Create Timezone Utility

```typescript
// lib/timezone.ts

/**
 * Convert Nigeria time to user's local time
 * @param dayOfWeek - Day in Nigeria (0-6)
 * @param timeStr - Time in Nigeria (HH:MM)
 * @returns Object with local day and time
 */
export function convertNigeriaTimeToLocal(
  dayOfWeek: number,
  timeStr: string
): {
  localDay: number;
  localTime: string;
  localDayName: string;
  isNextDay: boolean;
  isPrevDay: boolean;
} {
  // Nigeria is UTC+1 (no DST)
  const NIGERIA_OFFSET = 1;
  
  // Parse the time
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create a date in Nigeria time
  // Use a reference week starting on Sunday
  const referenceDate = new Date('2025-01-05'); // A Sunday
  const nigeriaDate = new Date(referenceDate);
  nigeriaDate.setDate(referenceDate.getDate() + dayOfWeek);
  nigeriaDate.setHours(hours, minutes, 0, 0);
  
  // Convert to UTC by subtracting Nigeria offset
  const utcTime = new Date(nigeriaDate.getTime() - (NIGERIA_OFFSET * 60 * 60 * 1000));
  
  // Get user's local time (browser automatically converts)
  const localDate = new Date(utcTime);
  
  // Calculate local day and time
  const localDay = localDate.getDay();
  const localHours = localDate.getHours().toString().padStart(2, '0');
  const localMinutes = localDate.getMinutes().toString().padStart(2, '0');
  const localTime = `${localHours}:${localMinutes}`;
  
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const localDayName = DAYS[localDay];
  
  // Check if day changed
  const isNextDay = localDay === (dayOfWeek + 1) % 7;
  const isPrevDay = localDay === (dayOfWeek - 1 + 7) % 7;
  
  return {
    localDay,
    localTime,
    localDayName,
    isNextDay,
    isPrevDay,
  };
}

/**
 * Get user's timezone name
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get user's timezone offset in hours
 */
export function getUserTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

/**
 * Format time with timezone info
 */
export function formatTimeWithTimezone(time: string): string {
  const userTz = getUserTimezone();
  const offset = getUserTimezoneOffset();
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  
  return `${time} (${userTz}, UTC${offsetStr})`;
}
```

### 4. Update RadioPlayer to Show Local Times

```typescript
// In RadioPlayer.tsx

import { convertNigeriaTimeToLocal, getUserTimezone } from '@/lib/timezone';

// In the component:
const userTimezone = getUserTimezone();
const isNigeria = userTimezone === 'Africa/Lagos';

// When displaying schedule:
{todaySchedule.map((item) => {
  const converted = convertNigeriaTimeToLocal(item.dayOfWeek, item.startTime);
  const isToday = converted.localDay === new Date().getDay();
  
  return (
    <div key={item._id} className="...">
      <div className="flex-shrink-0">
        {/* Show both Nigeria time and local time if different */}
        <div className="text-lg font-semibold text-green-600">
          {converted.localTime}
          {!isNigeria && (
            <span className="text-xs text-gray-500 block">
              ({item.startTime} WAT)
            </span>
          )}
        </div>
        {/* Show day if it changed */}
        {!isToday && (
          <div className="text-xs text-gray-500">
            {converted.localDayName}
          </div>
        )}
      </div>
      {/* ... rest of the display */}
    </div>
  );
})}
```

### 5. Add Timezone Indicator

Add a small indicator showing the user's timezone:

```typescript
// In RadioPlayer.tsx, add near the top:

<div className="text-center mb-4">
  <p className="text-xs text-gray-500">
    Times shown in your local timezone: {getUserTimezone()}
    {!isNigeria && (
      <span className="ml-2 text-blue-600">
        (Schedules are in Nigeria time - WAT)
      </span>
    )}
  </p>
</div>
```

## Alternative: Simpler Approach (Recommended for MVP)

If the above is too complex for now, use this simpler approach:

### Just Show Both Times

```typescript
// In RadioPlayer.tsx
<div className="text-lg font-semibold text-green-600">
  {item.startTime} WAT
</div>
<div className="text-xs text-gray-500">
  Your time: {convertToUserTime(item.startTime)}
</div>

// Simple conversion function
function convertToUserTime(watTime: string): string {
  const [hours, minutes] = watTime.split(':').map(Number);
  
  // Create date in WAT (UTC+1)
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  // Subtract 1 hour to get UTC
  const utcDate = new Date(date.getTime() - (1 * 60 * 60 * 1000));
  
  // Browser automatically converts to local
  const localHours = utcDate.getHours().toString().padStart(2, '0');
  const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
  
  return `${localHours}:${localMinutes}`;
}
```

## User Experience Examples

### For Nigerian Users (WAT, UTC+1)
```
Today's Schedule
┌─────────────────────────────────┐
│ 20:00                           │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

### For UK Users (GMT, UTC+0)
```
Today's Schedule
┌─────────────────────────────────┐
│ 19:00                           │
│ (20:00 WAT)                     │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

### For US East Coast Users (EST, UTC-5)
```
Today's Schedule
┌─────────────────────────────────┐
│ 14:00                           │
│ (20:00 WAT)                     │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

## Recommended Implementation Order

### Phase 5.1 (Quick Win - 30 minutes)

1. ✅ Add timezone note to admin forms
2. ✅ Create simple conversion utility
3. ✅ Update RadioPlayer to show both times
4. ✅ Add timezone indicator

### Phase 5.2 (Full Solution - 2 hours)

1. ✅ Add timezone field to Schedule model
2. ✅ Create comprehensive timezone utility
3. ✅ Handle day changes (e.g., 23:00 WAT = 00:00 next day in some zones)
4. ✅ Add "Add to Calendar" feature with proper timezone
5. ✅ Test with multiple timezones

## Testing

Test with these timezone scenarios:

1. **Nigeria (WAT, UTC+1)** - Should show original times
2. **UK (GMT, UTC+0)** - 1 hour behind
3. **US East (EST, UTC-5)** - 6 hours behind
4. **Dubai (GST, UTC+4)** - 3 hours ahead
5. **Australia (AEDT, UTC+11)** - 10 hours ahead (may change day)

## Benefits of This Approach

✅ **For Admins:**
- Enter times in familiar Nigeria time
- No confusion about timezones
- Simple to manage

✅ **For Nigerian Users:**
- See times in their local time (same as entered)
- No conversion needed
- Familiar format

✅ **For International Users:**
- Automatically see times in their timezone
- Can still see original Nigeria time for reference
- No manual calculation needed

✅ **Technical:**
- Uses browser's built-in timezone detection
- No server-side timezone database needed
- Works offline
- Respects user's system settings

## Future Enhancements

- Add "Add to Calendar" button (generates .ics file with proper timezone)
- Show countdown timer to next lecture
- Email reminders in user's timezone
- Mobile push notifications at the right time

## Conclusion

**Recommended:** Start with the simpler approach (show both times) and upgrade to full timezone conversion if needed. This gives you 80% of the benefit with 20% of the complexity.

The key insight: Store in Nigeria time (what admins know), display in user's local time (what users need).
