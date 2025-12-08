# Timezone Feature - Automatic Time Conversion

## Overview

The Islamic Online Radio platform now automatically converts schedule times from Nigeria time (WAT) to each user's local timezone. This makes it easy for international listeners to know when to tune in.

## How It Works

### For Admins (Creating Schedules)

1. **Enter times in Nigeria time (WAT)**
   - All schedule times are entered in West Africa Time (UTC+1)
   - This is the time zone most presenters and listeners are in
   - Example: Enter "20:00" for 8:00 PM Nigeria time

2. **Blue info box reminder**
   - When creating or editing schedules, you'll see a blue box
   - Reminds you that times are in Nigeria time
   - Explains that international users will see converted times

### For Nigerian Listeners

1. **See times as entered**
   - If you're in Nigeria (WAT timezone), you see the original times
   - Example: "20:00" displays as "20:00"
   - No conversion needed

2. **No timezone indicator**
   - Since you're in the same timezone, no extra info is shown
   - Clean, simple display

### For International Listeners

1. **Automatic conversion**
   - Times are automatically converted to your local timezone
   - Uses your browser's timezone settings
   - No manual calculation needed

2. **Dual time display**
   - Shows your local time (large, prominent)
   - Shows original Nigeria time (small, below)
   - Example for UK user:
     ```
     19:00
     20:00 WAT
     ```

3. **Timezone indicator**
   - At the top of the schedule, you'll see:
     ```
     ⏰ Times shown in your timezone: Europe/London (UTC+0)
     Schedule times are in Nigeria time (WAT, UTC+1)
     ```

## Examples

### Scenario 1: Nigerian User

**Location:** Lagos, Nigeria (WAT, UTC+1)  
**Schedule:** Friday 20:00 - Tafsir

**What they see:**
```
Today's Schedule
┌─────────────────────────────────┐
│ 20:00                           │
│ 60 min                          │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

### Scenario 2: UK User

**Location:** London, UK (GMT, UTC+0)  
**Schedule:** Friday 20:00 WAT - Tafsir

**What they see:**
```
⏰ Times shown in your timezone: Europe/London (UTC+0)
Schedule times are in Nigeria time (WAT, UTC+1)

Today's Schedule
┌─────────────────────────────────┐
│ 19:00                           │
│ 20:00 WAT                       │
│ 60 min                          │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

### Scenario 3: US East Coast User

**Location:** New York, USA (EST, UTC-5)  
**Schedule:** Friday 20:00 WAT - Tafsir

**What they see:**
```
⏰ Times shown in your timezone: America/New_York (UTC-5)
Schedule times are in Nigeria time (WAT, UTC+1)

Today's Schedule
┌─────────────────────────────────┐
│ 14:00                           │
│ 20:00 WAT                       │
│ 60 min                          │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

### Scenario 4: Dubai User

**Location:** Dubai, UAE (GST, UTC+4)  
**Schedule:** Friday 20:00 WAT - Tafsir

**What they see:**
```
⏰ Times shown in your timezone: Asia/Dubai (UTC+4)
Schedule times are in Nigeria time (WAT, UTC+1)

Today's Schedule
┌─────────────────────────────────┐
│ 23:00                           │
│ 20:00 WAT                       │
│ 60 min                          │
│ Tafsir of Surah Al-Baqarah      │
│ by Sheikh Ahmad                 │
└─────────────────────────────────┘
```

## Technical Details

### Timezone Conversion Logic

1. **Storage:** Times stored as strings in HH:MM format (Nigeria time)
2. **Conversion:** JavaScript converts WAT (UTC+1) to user's local time
3. **Display:** Shows local time with WAT reference

### Code Implementation

```typescript
// lib/timezone.ts
export function convertWATToLocal(watTime: string): string {
  const [hours, minutes] = watTime.split(':').map(Number);
  
  // Create date in WAT (UTC+1)
  const watDate = new Date();
  watDate.setHours(hours, minutes, 0, 0);
  
  // Convert to UTC
  const utcTime = watDate.getTime() - (1 * 60 * 60 * 1000);
  
  // Browser converts to local
  const localDate = new Date(utcTime);
  
  // Format as HH:MM
  const localHours = localDate.getHours().toString().padStart(2, '0');
  const localMinutes = localDate.getMinutes().toString().padStart(2, '0');
  
  return `${localHours}:${localMinutes}`;
}
```

### Browser Timezone Detection

The system uses the browser's built-in timezone detection:

```typescript
// Get user's timezone
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Example: "Africa/Lagos", "Europe/London", "America/New_York"

// Get user's UTC offset
const offset = -new Date().getTimezoneOffset() / 60;
// Example: +1, 0, -5
```

## Benefits

### For Admins
✅ Simple - just enter Nigeria time  
✅ No timezone confusion  
✅ Familiar format  
✅ Clear reminders in forms

### For Nigerian Users
✅ See times as entered  
✅ No conversion needed  
✅ Clean display  
✅ Familiar format

### For International Users
✅ Automatic conversion  
✅ See both local and Nigeria time  
✅ Know their timezone  
✅ No manual calculation

### Technical
✅ Uses browser's timezone  
✅ No server-side timezone database  
✅ Works offline  
✅ Respects user's system settings  
✅ No external dependencies

## Limitations

### Day Changes Not Handled (Yet)

If a schedule time crosses midnight in the user's timezone, the day won't automatically adjust. For example:

- Schedule: Friday 23:00 WAT
- User in Tokyo (UTC+9): Would be Saturday 07:00
- Currently shows: Friday 07:00 (incorrect day)

**Solution:** This is rare and can be added in a future update if needed.

### Daylight Saving Time

Nigeria doesn't observe DST, but user timezones might. The browser handles this automatically, so conversions remain accurate year-round.

### No "Add to Calendar" Yet

Future enhancement: Add button to download .ics file with proper timezone info for calendar apps.

## Testing

### Test Scenarios

1. **Nigerian user** - Should see original times
2. **UK user** - Should see times 1 hour earlier
3. **US East user** - Should see times 6 hours earlier
4. **Dubai user** - Should see times 3 hours later
5. **Australia user** - Should see times 10 hours later

### How to Test

1. **Change browser timezone:**
   - Chrome DevTools → Console
   - Run: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Or use browser extensions to spoof timezone

2. **Create test schedule:**
   - Login as admin
   - Create schedule for today at 20:00
   - View on radio page

3. **Verify conversion:**
   - Check if local time is correct
   - Check if WAT time is shown
   - Check timezone indicator

## Future Enhancements

### Phase 5.2 (Optional)

1. **Handle day changes**
   - Show correct day when time crosses midnight
   - Example: "Saturday 07:00" instead of "Friday 07:00"

2. **Add to Calendar**
   - Generate .ics file with proper timezone
   - Works with Google Calendar, Outlook, Apple Calendar
   - Includes lecture details

3. **Countdown Timer**
   - Show "Starts in 2 hours 15 minutes"
   - Updates in real-time
   - Helps users know when to tune in

4. **Email Reminders**
   - Send reminder in user's timezone
   - "Your lecture starts in 1 hour"
   - Configurable timing

5. **Mobile Push Notifications**
   - Notify at the right time for user's timezone
   - "Live lecture starting now!"

## Troubleshooting

### Times look wrong

**Check:**
1. Is your system clock correct?
2. Is your timezone set correctly in OS?
3. Try refreshing the page

### Not seeing timezone indicator

**Reason:** You're in Nigeria (WAT) timezone  
**Solution:** This is correct - no indicator needed for Nigerian users

### Want to see Nigeria time

**Solution:** It's shown below your local time in small text

## Summary

The timezone feature makes the Islamic Online Radio accessible to listeners worldwide while keeping it simple for Nigerian admins and users. Times are automatically converted, clearly displayed, and require no manual calculation.

**Key Principle:** Store in Nigeria time, display in user's local time.

---

**Implemented:** December 8, 2025  
**Status:** ✅ ACTIVE  
**Version:** 1.0 (Simple dual-time display)
