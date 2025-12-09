# Timezone Flexibility Feature

## Overview

The schedule system now supports flexible timezone selection, allowing presenters from anywhere in the world to schedule lectures in their local timezone. Listeners will automatically see times converted to their local timezone.

## Features

### 1. Nigeria Quick Select
- **Checkbox Option**: "🇳🇬 Nigeria Time (WAT, UTC+1)"
- When checked, automatically uses `Africa/Lagos` timezone
- Perfect for Nigerian-based presenters
- Default option for convenience

### 2. International Timezone Support
- When Nigeria checkbox is unchecked, a timezone dropdown appears
- Supports 25+ common timezones worldwide including:
  - **Africa**: Nigeria, Egypt, South Africa, Kenya, Ghana
  - **Middle East**: Saudi Arabia, UAE, Qatar, Kuwait
  - **Europe**: UK, France, Germany, Turkey
  - **North America**: USA (4 zones), Canada
  - **Asia**: Pakistan, India, Bangladesh, Indonesia, Singapore, Malaysia
  - **Australia**: Sydney, Melbourne

### 3. Automatic Time Conversion
- Schedule times are stored with their timezone
- Public radio page automatically converts times to listener's local timezone
- No manual calculation needed

## How It Works

### For Admins/Presenters

1. **Navigate to Schedule Creation**
   - Go to `/admin/schedule`
   - Click "Add Schedule Entry"

2. **Select Timezone**
   - **Option A**: Check "Nigeria Time" for WAT timezone
   - **Option B**: Uncheck and select your timezone from dropdown

3. **Enter Time**
   - Enter the time in YOUR local timezone
   - Example: If you're in New York and want to broadcast at 8 PM your time, enter `20:00`

4. **Submit**
   - The system stores the time with your timezone
   - Listeners worldwide will see it converted to their time

### For Listeners

- Visit `/radio` page
- All schedule times are automatically shown in YOUR timezone
- Timezone info displayed: "Times shown in your timezone: America/New_York (UTC-5)"
- No configuration needed - browser automatically detects timezone

## Database Schema

```typescript
interface ISchedule {
  dayOfWeek: number;        // 0-6 (Sunday-Saturday)
  startTime: string;        // "20:00" in 24h format
  timezone: string;         // IANA timezone (e.g., "Africa/Lagos")
  durationMinutes: number;
  lecturer: string;
  topic: string;
  active: boolean;
}
```

## Examples

### Example 1: Nigerian Presenter
- **Presenter Location**: Lagos, Nigeria
- **Selects**: ✅ Nigeria Time checkbox
- **Enters**: Monday, 20:00 (8 PM)
- **Stored As**: `dayOfWeek: 1, startTime: "20:00", timezone: "Africa/Lagos"`
- **Listener in New York sees**: Monday, 2:00 PM (EST)
- **Listener in London sees**: Monday, 7:00 PM (GMT)

### Example 2: American Presenter
- **Presenter Location**: New York, USA
- **Selects**: ❌ Unchecks Nigeria, selects "USA (New York) - EST/EDT"
- **Enters**: Sunday, 15:00 (3 PM)
- **Stored As**: `dayOfWeek: 0, startTime: "15:00", timezone: "America/New_York"`
- **Listener in Nigeria sees**: Sunday, 8:00 PM (WAT)
- **Listener in Dubai sees**: Sunday, 11:00 PM (GST)

### Example 3: UK Presenter
- **Presenter Location**: London, UK
- **Selects**: ❌ Unchecks Nigeria, selects "UK (London) - GMT/BST"
- **Enters**: Friday, 19:00 (7 PM)
- **Stored As**: `dayOfWeek: 5, startTime: "19:00", timezone: "Europe/London"`
- **Listener in Nigeria sees**: Friday, 8:00 PM (WAT) in winter, 9:00 PM in summer
- **Listener in Pakistan sees**: Friday, 11:00 PM (PKT) in winter, 12:00 AM Saturday in summer

## Benefits

### For Nigerian Presenters
- ✅ Quick one-click Nigeria timezone selection
- ✅ No confusion - just check the box
- ✅ Familiar interface

### For International Presenters
- ✅ Schedule in their own timezone
- ✅ No mental math required
- ✅ Accurate across daylight saving changes
- ✅ Professional global radio experience

### For Listeners
- ✅ Always see times in their local timezone
- ✅ No confusion about time zones
- ✅ Automatic conversion
- ✅ Works worldwide

## Technical Implementation

### Timezone Storage
- Uses IANA timezone identifiers (e.g., "Africa/Lagos", "America/New_York")
- Standard format supported by all modern browsers
- Handles daylight saving time automatically

### Time Conversion
- Client-side conversion using browser's `Intl.DateTimeFormat` API
- No server-side calculation needed
- Accurate and performant

### Backward Compatibility
- Existing schedules without timezone default to "Africa/Lagos"
- No data migration required
- Seamless upgrade

## UI/UX Design

### Schedule Creation Form
```
┌─────────────────────────────────────────┐
│ Timezone                                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ 🇳🇬 Nigeria Time (WAT, UTC+1)    │ │
│ │   Check this if you're scheduling   │ │
│ │   in Nigeria timezone               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [If unchecked, dropdown appears]        │
│ ┌─────────────────────────────────────┐ │
│ │ Select Your Timezone ▼              │ │
│ │ Nigeria (Lagos) - WAT (UTC+1)       │ │
│ │ USA (New York) - EST/EDT (UTC-5/-4) │ │
│ │ UK (London) - GMT/BST (UTC+0/+1)    │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Schedule List Display
```
┌──────────────────────────────────────────────┐
│ Day      │ Time & Timezone                   │
├──────────┼───────────────────────────────────┤
│ Monday   │ 20:00                             │
│          │ 🇳🇬 Nigeria (Lagos) - WAT         │
├──────────┼───────────────────────────────────┤
│ Sunday   │ 15:00                             │
│          │ USA (New York) - EST/EDT          │
└──────────┴───────────────────────────────────┘
```

## Migration Notes

### For Existing Schedules
- All existing schedules will default to `timezone: "Africa/Lagos"`
- No action required
- Can be edited later to change timezone

### For New Schedules
- Must select timezone (Nigeria checkbox checked by default)
- Timezone is required field
- Validation ensures valid IANA timezone

## Future Enhancements

Potential future improvements:
1. Auto-detect presenter's timezone from browser
2. Show multiple timezone previews when creating schedule
3. Recurring schedule templates
4. Timezone-aware notifications
5. Calendar export with timezone support

## Support

For questions or issues:
- Check the timezone dropdown for your location
- Nigeria presenters: Just check the Nigeria box
- International presenters: Select your timezone from the list
- Contact admin if your timezone is not listed
