# Al-Manhaj Radio - Design System

## Brand Identity

### Overview
The Al-Manhaj Radio platform embodies the simplicity, authenticity, and purity of the Salaf (righteous predecessors). Our design reflects traditional Islamic values through geometric patterns, classical colors, and a focus on clarity and substance over ornamentation.

### Design Philosophy
- **Simplicity (Basāṭah)**: Clean, uncluttered interfaces that focus on content
- **Authenticity (Aṣālah)**: Traditional Islamic aesthetics without modern excess
- **Clarity (Wuḍūḥ)**: Clear hierarchy and easy navigation
- **Dignity (Waqār)**: Respectful, serious tone befitting Islamic knowledge

## Color Palette

### Primary Colors - Traditional Islamic Green

**Deep Islamic Green**
- Purpose: Main brand color representing Islam, peace, and the prophetic tradition
- Primary: `#047857` (emerald-800) - Deep, traditional green
- Medium: `#059669` (emerald-700)
- Light: `#10B981` (emerald-600)
- Usage: Primary buttons, headers, logo, key accents
- Symbolism: The color of the Prophet's ﷺ banner and Islamic tradition

**Classical Gold**
- Purpose: Wisdom, illumination, and the light of knowledge
- Primary: `#D4AF37` (Traditional Islamic gold)
- Medium: `#C9A227` (Darker gold)
- Light: `#E5C158` (Lighter gold)
- Usage: Arabic text, accents, borders, highlights
- Symbolism: The light of knowledge and prophetic guidance

### Secondary Colors

**Pure White & Cream**
- Purpose: Purity, clarity, and simplicity
- Pure White: `#FFFFFF`
- Cream: `#FEFCF3` (Warm off-white)
- Light Beige: `#F5F1E8`
- Usage: Backgrounds, cards, content areas
- Symbolism: Purity and the blank slate of learning

**Deep Charcoal**
- Purpose: Text and serious content
- Primary: `#1F2937` (gray-800)
- Medium: `#374151` (gray-700)
- Usage: Body text, headings
- Symbolism: Seriousness and depth of knowledge

### Neutral Colors

**Warm Grays**
- Background: `#FAFAF9` (stone-50)
- Light Gray: `#E7E5E4` (stone-200)
- Medium Gray: `#78716C` (stone-500)
- Dark Gray: `#44403C` (stone-700)

### Semantic Colors

**Success/Live**
- Green: `#059669` (emerald-700)
- Usage: Success states, live indicators

**Warning**
- Amber: `#F59E0B` (amber-500)
- Usage: Warnings, important notices

**Error**
- Red: `#EF4444` (red-500)
- Usage: Errors, critical alerts

**Info**
- Blue: `#3B82F6` (blue-500)
- Usage: Information, tips

**Live Indicator**
- Red: `#EF4444` (red-500)
- Usage: Live streaming indicator with pulse animation

## Typography

### Font Family
- Primary: System font stack (optimized for performance)
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

### Font Sizes

**Headings**
- H1: `text-5xl md:text-7xl` (48px/72px) - Hero titles
- H2: `text-4xl md:text-5xl` (36px/48px) - Section titles
- H3: `text-2xl` (24px) - Card titles
- H4: `text-xl` (20px) - Subsections

**Body Text**
- Large: `text-xl` (20px) - Hero descriptions
- Regular: `text-base` (16px) - Body text
- Small: `text-sm` (14px) - Captions, labels
- Extra Small: `text-xs` (12px) - Fine print

### Font Weights
- Bold: `font-bold` (700) - Headings, emphasis
- Semibold: `font-semibold` (600) - Subheadings
- Medium: `font-medium` (500) - Navigation, buttons
- Regular: `font-normal` (400) - Body text

## Spacing System

### Padding/Margin Scale
- xs: `2` (8px)
- sm: `4` (16px)
- md: `6` (24px)
- lg: `8` (32px)
- xl: `12` (48px)
- 2xl: `16` (64px)
- 3xl: `20` (80px)

### Container Widths
- Max Width: `max-w-7xl` (1280px)
- Content Width: `max-w-4xl` (896px)
- Text Width: `max-w-2xl` (672px)

## Components

### Buttons

**Primary Button**
```tsx
className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-semibold shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:scale-105"
```

**Secondary Button**
```tsx
className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-8 py-4 rounded-xl hover:bg-white/20 transition-all duration-300 font-semibold"
```

**Ghost Button**
```tsx
className="text-emerald-600 hover:text-emerald-700 font-semibold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors"
```

### Cards

**Feature Card**
```tsx
className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-emerald-100 hover:border-emerald-300 hover:-translate-y-2"
```

**Content Card**
```tsx
className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow"
```

### Icons

**Icon Container**
```tsx
className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg"
```

**Icon Size**
- Small: `w-4 h-4`
- Medium: `w-6 h-6`
- Large: `w-8 h-8`

## Effects & Animations

### Shadows

**Elevation Levels**
- sm: `shadow-sm` - Subtle elevation
- md: `shadow-lg` - Cards, buttons
- lg: `shadow-xl` - Prominent elements
- xl: `shadow-2xl` - Hero elements

**Colored Shadows**
- Emerald: `shadow-emerald-500/30`
- Teal: `shadow-teal-500/30`

### Gradients

**Background Gradients**
```tsx
// Hero gradient
className="bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900"

// Card gradient
className="bg-gradient-to-br from-emerald-50 to-teal-50"

// Button gradient
className="bg-gradient-to-r from-emerald-500 to-teal-500"
```

**Text Gradients**
```tsx
className="bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent"
```

### Transitions

**Standard Transition**
```tsx
className="transition-all duration-300"
```

**Hover Effects**
- Scale: `hover:scale-105`
- Translate: `hover:-translate-y-2`
- Shadow: `hover:shadow-2xl`

### Animations

**Pulse (Live Indicator)**
```tsx
className="animate-pulse"
```

**Ping (Live Dot)**
```tsx
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
```

## Layout Patterns

### Hero Section
- Full-width gradient background
- Decorative blur elements
- Islamic pattern overlay (subtle)
- Wave divider at bottom
- Centered content with max-width container

### Feature Section
- 3-column grid on desktop
- Stacked on mobile
- Hover effects on cards
- Icon + heading + description pattern

### CTA Section
- Full-width gradient background
- Centered content
- Large heading + description + button
- Decorative blur elements

## Accessibility

### Color Contrast
- All text meets WCAG AA standards
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text

### Focus States
- Visible focus indicators on all interactive elements
- Focus ring: `focus:ring-2 focus:ring-emerald-500`

### Semantic HTML
- Proper heading hierarchy
- Semantic section elements
- ARIA labels where needed

## Responsive Design

### Breakpoints
- sm: `640px`
- md: `768px`
- lg: `1024px`
- xl: `1280px`

### Mobile-First Approach
- Base styles for mobile
- Progressive enhancement for larger screens
- Touch-friendly tap targets (min 44x44px)

## Islamic Design Elements

### Patterns
- Subtle geometric patterns in backgrounds
- Opacity: 5-10% for non-intrusive effect
- SVG-based for scalability

### Color Philosophy
- Green/Teal: Traditional Islamic color, represents paradise
- Gold: Represents wisdom and enlightenment
- Purple: Represents nobility and spirituality
- White: Purity and peace

### Typography Considerations
- Clear, readable fonts
- Generous line height for readability
- Proper text hierarchy

## Brand Voice

### Tone
- Respectful and reverent
- Welcoming and inclusive
- Professional yet warm
- Educational and inspiring

### Messaging
- Focus on knowledge and spiritual growth
- Emphasize authenticity and quality
- Highlight community and connection
- Use positive, uplifting language

## Usage Guidelines

### Do's
✅ Use gradient backgrounds for hero sections
✅ Apply hover effects to interactive elements
✅ Maintain consistent spacing
✅ Use semantic color meanings
✅ Ensure proper contrast ratios
✅ Test on multiple devices

### Don'ts
❌ Don't use pure black (#000000)
❌ Don't mix too many colors in one section
❌ Don't use small font sizes for body text
❌ Don't forget hover states
❌ Don't ignore mobile responsiveness
❌ Don't use low-contrast color combinations

## Performance Considerations

### Optimization
- Use Tailwind's JIT mode for minimal CSS
- Lazy load images and heavy components
- Optimize SVG icons
- Use system fonts for fast loading
- Minimize animation complexity

### Loading States
- Skeleton screens for content loading
- Smooth transitions between states
- Progress indicators for long operations

## Future Enhancements

### Planned Additions
- Dark mode support
- Custom Islamic calligraphy elements
- Animated illustrations
- Interactive schedule calendar
- Audio visualizer component
- User preference system

---

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** ✅ Active
