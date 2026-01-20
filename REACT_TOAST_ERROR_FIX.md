# React Toast Error Fix - BroadcastControlPanel

## Issue Description

**Error**: `Cannot update a component (ToastProvider) while rendering a different component (BroadcastControlPanel)`

**Root Cause**: The `stopCurrentPreview` function in `BroadcastControlPanel.tsx` was calling `showInfo` toast inside a `setPreviewState` callback, which violates React's rules about side effects during the render phase.

**Stack Trace Location**: 
- File: `app/admin/live/BroadcastControlPanel.tsx` (line ~90)
- Function: `stopCurrentPreview`
- Context: `ToastProvider.useCallback[showToast]` → `ToastProvider.useCallback[showInfo]` → `BroadcastControlPanel.useCallback[stopCurrentPreview]`

## Solution

**Fix Applied**: Moved the toast call outside of the render phase using `setTimeout` with 0 delay.

### Before (Problematic Code):
```typescript
const stopCurrentPreview = useCallback((showToast: boolean = true) => {
  setPreviewState(prev => {
    // Only show toast if there's actually audio being previewed AND showToast is true
    if (prev.fileId && showToast) {
      showInfo('Preview Stopped', 'Audio preview stopped'); // ❌ Called during render
    }
    return { fileId: null, data: null };
  });
}, [showInfo]);
```

### After (Fixed Code):
```typescript
const stopCurrentPreview = useCallback((showToast: boolean = true) => {
  setPreviewState(prev => {
    // Store whether we should show toast for useEffect
    if (prev.fileId && showToast) {
      // Use setTimeout to move toast call outside of render phase
      setTimeout(() => {
        showInfo('Preview Stopped', 'Audio preview stopped'); // ✅ Called after render
      }, 0);
    }
    return { fileId: null, data: null };
  });
}, [showInfo]);
```

## Why This Fix Works

1. **Render Phase Separation**: `setTimeout` with 0 delay schedules the toast call to run after the current render cycle completes
2. **No Functional Change**: The user experience remains identical - the toast still appears immediately
3. **React Compliance**: Follows React's rules by keeping side effects out of the render phase
4. **Minimal Impact**: Only affects the timing of when the toast is triggered, not the functionality

## Testing

Created comprehensive test suite in `__tests__/components/BroadcastControlPanel.toast-fix.test.tsx`:

- ✅ Verifies no React errors occur during component lifecycle
- ✅ Tests rapid state changes that could trigger the original error
- ✅ Confirms the fix doesn't break existing functionality

## Files Modified

1. **`app/admin/live/BroadcastControlPanel.tsx`**
   - Fixed `stopCurrentPreview` function (line ~86-94)
   - Added `data-testid` for testing

2. **`__tests__/components/BroadcastControlPanel.toast-fix.test.tsx`** (new)
   - Comprehensive test coverage for the fix
   - Validates no React warnings are generated

## Impact

- **User Experience**: No change - toasts still appear as expected
- **Performance**: Negligible impact (setTimeout with 0 delay)
- **Stability**: Eliminates React warnings and potential future issues
- **Maintainability**: Code now follows React best practices

## Prevention

To prevent similar issues in the future:

1. **Never call state setters or side effects inside other state setters**
2. **Use `useEffect` or `setTimeout` to defer side effects**
3. **Watch for React warnings in development mode**
4. **Test components thoroughly with rapid state changes**

## Status

✅ **RESOLVED** - React toast error eliminated, tests passing, no functional regressions.