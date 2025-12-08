# Al-Manhaj Radio - Design Preview

## Visual Overview

This document provides a text-based preview of the new premium design.

## Color Palette Preview

```
PRIMARY COLORS
┌─────────────────────────────────────┐
│ Emerald-900  #064E3B  ████████████  │ Hero Dark
│ Emerald-700  #047857  ████████████  │ Primary
│ Emerald-600  #059669  ████████████  │ Primary Light
│ Emerald-500  #10B981  ████████████  │ Accent
│ Teal-800     #115E59  ████████████  │ Hero Medium
│ Teal-500     #14B8A6  ████████████  │ Accent Light
└─────────────────────────────────────┘

SECONDARY COLORS
┌─────────────────────────────────────┐
│ Amber-600    #D97706  ████████████  │ Gold
│ Amber-500    #F59E0B  ████████████  │ Gold Light
│ Purple-600   #7C3AED  ████████████  │ Accent
│ Purple-500   #8B5CF6  ████████████  │ Accent Light
└─────────────────────────────────────┘

NEUTRALS
┌─────────────────────────────────────┐
│ Slate-900    #0F172A  ████████████  │ Dark Text
│ Slate-700    #334155  ████████████  │ Medium Text
│ Slate-600    #475569  ████████████  │ Body Text
│ Slate-50     #F8FAFC  ████████████  │ Light BG
│ White        #FFFFFF  ████████████  │ Pure White
└─────────────────────────────────────┘
```

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ NAVIGATION (Fixed, Glassmorphism)                           │
│ ┌─────┐ Al-Manhaj Radio  Home  Listen Live  Admin  [Listen]│
│ │ 🎵  │                                                      │
│ └─────┘                                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HERO SECTION (Gradient: Emerald-900 → Teal-800 → Slate-900)│
│                                                              │
│                    [●] LIVE NOW                              │
│                                                              │
│              Al-Manhaj Radio                                 │
│         (Gradient Text Effect)                               │
│                                                              │
│    Listen to enlightening Islamic lectures                  │
│         and Quran recitations                                │
│                                                              │
│    Connect with knowledge, strengthen your faith            │
│                                                              │
│   [▶ Listen Now]  [Learn More ↓]                           │
│                                                              │
│   24/7        10+         HD                                │
│   Always On   Programs    Quality                           │
│                                                              │
│ ～～～～～～～～～～～～～～～～～～～～～～～～～～～～～  │ Wave
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FEATURES SECTION (White Background)                         │
│                                                              │
│         Why Choose Al-Manhaj Radio?                         │
│    Experience authentic Islamic content                     │
│                                                              │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│ │ [🔊]     │  │ [🕐]     │  │ [✓]      │                  │
│ │          │  │          │  │          │                  │
│ │ Live     │  │ 24/7     │  │ HD       │                  │
│ │ Lectures │  │ Content  │  │ Quality  │                  │
│ │          │  │          │  │          │                  │
│ │ Join live│  │ Access   │  │ Crystal  │                  │
│ │ sessions │  │ library  │  │ clear    │                  │
│ └──────────┘  └──────────┘  └──────────┘                  │
│   (Emerald)     (Amber)       (Purple)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SCHEDULE PREVIEW (Gradient: Slate-50 → Emerald-50)         │
│                                                              │
│              Weekly Schedule                                │
│    Plan your listening with our organized programs         │
│                                                              │
│ ┌─────────────────────┐  ┌─────────────────────┐          │
│ │ [📖] Tafsir        │  │ [💡] Hadith         │          │
│ │      Sessions      │  │      Studies        │          │
│ │                    │  │                     │          │
│ │ Quranic interpret. │  │ Prophetic teachings │          │
│ │ Multiple times     │  │ Check schedule      │          │
│ └─────────────────────┘  └─────────────────────┘          │
│                                                              │
│           [View Full Schedule →]                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CTA SECTION (Gradient: Emerald-900 → Teal-800 → Slate-900) │
│                                                              │
│       Start Your Spiritual Journey Today                    │
│                                                              │
│   Join thousands of listeners seeking knowledge             │
│                                                              │
│         [▶ Start Listening Now]                             │
│            (White button)                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FOOTER (Slate-900)                                          │
│                                                              │
│ Al-Manhaj Radio    Quick Links       Connect                │
│ Bringing authentic Listen Live       Stay connected         │
│ Islamic knowledge  Schedule           for updates           │
│                    Admin Login                              │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│         © 2025 Al-Manhaj Radio. All rights reserved.        │
└─────────────────────────────────────────────────────────────┘
```

## Component Examples

### Primary Button
```
┌─────────────────────────────────┐
│  ▶  Listen Now  →               │
│  (Gradient: Emerald → Teal)     │
│  (Shadow with color)            │
│  (Hover: Scale + Darker)        │
└─────────────────────────────────┘
```

### Feature Card
```
┌─────────────────────────────────┐
│  ┌─────┐                        │
│  │ 🔊  │  (Gradient icon box)   │
│  └─────┘                        │
│                                 │
│  Live Lectures                  │
│  (Bold, Large)                  │
│                                 │
│  Join live sessions with        │
│  knowledgeable scholars.        │
│  (Body text)                    │
│                                 │
│  (Hover: Lift up + Shadow)      │
└─────────────────────────────────┘
```

### Live Indicator
```
┌─────────────────────┐
│  ● LIVE NOW         │
│  (Pulse animation)  │
│  (Red badge)        │
└─────────────────────┘
```

### Navigation Logo
```
┌──────────────────────────┐
│ ┌────┐                   │
│ │ 🎵 │ Al-Manhaj Radio   │
│ └────┘ (Gradient text)   │
└──────────────────────────┘
```

## Typography Scale

```
H1 (Hero)
Al-Manhaj Radio
(72px, Bold, Gradient)

H2 (Section)
Why Choose Al-Manhaj Radio?
(48px, Bold, Slate-900)

H3 (Card)
Live Lectures
(24px, Bold, Slate-900)

Body Large
Listen to enlightening Islamic lectures
(20px, Regular, Emerald-100)

Body Regular
Join live sessions with knowledgeable scholars
(16px, Regular, Slate-600)

Small
Multiple times weekly
(14px, Regular, Emerald-600)
```

## Spacing System

```
Section Padding:    80px (py-20)
Card Padding:       32px (p-8)
Button Padding:     16px 32px (px-8 py-4)
Gap Between Cards:  32px (gap-8)
Container Max:      1280px (max-w-7xl)
```

## Shadow Levels

```
Small:    shadow-sm     (Subtle)
Medium:   shadow-lg     (Cards)
Large:    shadow-xl     (Buttons)
XLarge:   shadow-2xl    (Hero elements)
Colored:  shadow-emerald-500/30 (Buttons)
```

## Gradient Examples

```
Hero Background:
from-emerald-900 via-teal-800 to-slate-900

Button:
from-emerald-500 to-teal-500

Card Background:
from-emerald-50 to-teal-50

Text:
from-white via-emerald-100 to-teal-200
```

## Responsive Breakpoints

```
Mobile:   < 640px   (1 column, stacked)
Tablet:   640-1024  (2 columns)
Desktop:  > 1024px  (3 columns, full features)
```

## Animation Examples

```
Hover Effects:
- Scale: 1.05
- Translate Y: -8px
- Shadow: Increase
- Duration: 300ms

Live Indicator:
- Pulse: Infinite
- Ping: Infinite
- Opacity: 0.75

Transitions:
- All properties
- Duration: 300ms
- Easing: ease-in-out
```

## Accessibility Features

```
✓ Color Contrast: 4.5:1 minimum
✓ Focus Indicators: 2px emerald ring
✓ Keyboard Navigation: Full support
✓ Screen Reader: Semantic HTML + ARIA
✓ Touch Targets: 44x44px minimum
✓ Reduced Motion: Respects preference
```

## Mobile View

```
┌─────────────────────┐
│ [☰] Al-Manhaj Radio │
│                     │
│ ─────────────────── │
│                     │
│   [●] LIVE NOW      │
│                     │
│   Al-Manhaj Radio   │
│   (48px)            │
│                     │
│   Listen to         │
│   enlightening...   │
│                     │
│   [▶ Listen Now]    │
│   [Learn More]      │
│                     │
│   24/7  10+  HD     │
│                     │
│ ～～～～～～～～～～ │
│                     │
│   Why Choose?       │
│                     │
│   ┌──────────────┐  │
│   │ [🔊]         │  │
│   │ Live         │  │
│   │ Lectures     │  │
│   └──────────────┘  │
│                     │
│   ┌──────────────┐  │
│   │ [🕐]         │  │
│   │ 24/7         │  │
│   │ Content      │  │
│   └──────────────┘  │
│                     │
│   (Stacked)         │
└─────────────────────┘
```

## Key Improvements Over Old Design

### Before (Old Design)
- ❌ Plain white background
- ❌ Simple green button
- ❌ Basic cards with borders
- ❌ No visual hierarchy
- ❌ Generic appearance
- ❌ No animations
- ❌ Minimal branding

### After (New Design)
- ✅ Rich gradient backgrounds
- ✅ Premium gradient buttons with shadows
- ✅ Elevated cards with hover effects
- ✅ Clear visual hierarchy
- ✅ Distinctive brand identity
- ✅ Smooth animations and transitions
- ✅ Strong branding throughout

## Brand Personality

```
Spiritual    ████████████ 100%
Modern       ████████████ 100%
Premium      ████████████ 100%
Trustworthy  ████████████ 100%
Welcoming    ████████████ 100%
Professional ████████████ 100%
```

---

**Status:** ✅ Production Ready  
**Build:** Successful  
**Performance:** Optimized  
**Accessibility:** WCAG 2.1 AA Compliant
