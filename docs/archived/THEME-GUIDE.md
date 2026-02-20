# Theme System Guide

## Overview

The Bengals CC website now features a **configurable theme system** that allows easy switching between design styles.

## Current Themes

### 1. **Basic Theme** (`theme-basic.css`)
- Clean, minimal, flat design
- Subtle shadows and transitions
- Original design aesthetic
- Best for: Simple, professional look

### 2. **Rich Theme** (`theme-rich.css`) ✨ **CURRENTLY ACTIVE**
- Enhanced visual depth with layered shadows
- Rich gradient backgrounds
- Smooth, premium animations
- Better typography hierarchy
- Best for: Modern, polished, premium feel

## How to Switch Themes

### Quick Switch
Open `src/styles/theme-config.css` and change line 13:

**For Rich Theme (current):**
```css
@import './themes/theme-rich.css';
```

**For Basic Theme:**
```css
@import './themes/theme-basic.css';
```

Save the file and the dev server will auto-reload with the new theme.

## Theme Architecture

```
src/styles/
├── globals.css              # Base styles (colors, typography, layout)
├── theme-config.css         # Theme switcher (one line to change)
└── themes/
    ├── theme-basic.css      # Original/basic theme
    └── theme-rich.css       # Enhanced/rich theme
```

### How It Works

1. **Base Styles** (`globals.css`) contains:
   - Color palette (primary orange, complementary blue)
   - Typography settings
   - Component base styles (buttons, cards, etc.)

2. **Theme Files** define:
   - Shadow depths
   - Gradient styles
   - Animation timings
   - Border radius values
   - Font weights

3. **Theme Config** (`theme-config.css`):
   - Imports the active theme
   - One line change switches entire site

## What Changes Between Themes

### Rich Theme Enhancements

#### Shadows & Depth
- **Cards**: Subtle elevation that lifts on hover
- **Buttons**: Soft shadows with primary color tint
- **Elevated elements**: Deep, layered shadows

#### Gradients
- **Hero sections**: Multi-stop gradients (orange tones)
- **Buttons**: Gradient backgrounds instead of flat colors
- **Card headers**: Subtle gradient overlays
- **Sections**: Alternating background gradients

#### Animations
- **Hover effects**: Smooth lift and shadow transitions
- **Cards**: Transform on hover (translateY)
- **Buttons**: Press and release states
- **Transitions**: Premium cubic-bezier easing

#### Typography
- **Headings**: Bolder weights (800 for display)
- **Better hierarchy**: Varied font weights (600-800)
- **Smoother rendering**: Enhanced letter spacing

## Using Theme Features

### CSS Classes Available in Rich Theme

```css
/* Shadow utilities */
.shadow-card             /* Card elevation */
.shadow-card-hover       /* Hovered card elevation */
.shadow-button           /* Button depth */
.shadow-elevated         /* Maximum elevation */

/* Gradient utilities */
.gradient-primary        /* Button/accent gradient */
.gradient-hero-rich      /* Hero section gradient */
.gradient-section        /* Section background */
.gradient-card-header    /* Card header overlay */

/* Animation utilities */
.animate-fade-in         /* Fade in from below */
.animate-slide-in-up     /* Slide up entrance */
.animate-pulse-subtle    /* Subtle pulse effect */
```

### Enhanced Component Styles

All standard components automatically use theme variables:

- `.btn` - Buttons with gradients and shadows
- `.card` - Cards with hover lift effects
- `.hero-bg` - Hero sections with rich gradients
- `.team-card` - Team cards with enhanced depth
- `.stat-box` - Statistics with hover effects
- `.badge` - Badges with gradient backgrounds

## CSS Variables

### Theme-Specific Variables

```css
/* Shadows */
--shadow-card
--shadow-card-hover
--shadow-button
--shadow-elevated

/* Gradients */
--gradient-hero
--gradient-section
--gradient-card-header
--gradient-primary

/* Typography */
--font-weight-display
--font-weight-heading
--font-weight-subheading

/* Transitions */
--transition-base
--transition-hover

/* Border Radius */
--border-radius-card
--border-radius-button
```

## Testing Themes

1. Start dev server: `npm run dev`
2. Open `src/styles/theme-config.css`
3. Switch between theme imports
4. Save and watch auto-reload
5. Compare the visual differences

## Adding a New Theme

1. Create `src/styles/themes/theme-custom.css`
2. Copy structure from `theme-basic.css` or `theme-rich.css`
3. Modify CSS variables to your preference
4. Update `theme-config.css` to import your new theme

Example:
```css
/* src/styles/theme-config.css */
@import './themes/theme-custom.css';
```

## Browser Support

Both themes work in all modern browsers:
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

All animations respect `prefers-reduced-motion` for accessibility.

## Performance

- **No runtime overhead**: Themes are pure CSS
- **Instant switching**: Change is immediate in dev mode
- **Production optimized**: Unused theme is tree-shaken
- **Fast animations**: GPU-accelerated transforms

## Design Principles

Both themes maintain:
- ✅ Brand colors (orange primary, blue complementary)
- ✅ Responsive design (mobile-first)
- ✅ Accessibility (WCAG AA contrast)
- ✅ Cricket club professionalism
- ✅ Clean, readable typography

## Summary

The theme system gives you:
- ✅ **Easy switching**: One line change
- ✅ **Zero risk**: Original design preserved
- ✅ **Maintainable**: Themes are separate files
- ✅ **Extensible**: Add more themes easily
- ✅ **Future-proof**: Could add user theme selection

Currently using the **Rich Theme** for a modern, polished look with depth and visual interest. Switch to **Basic Theme** anytime for the original clean, minimal design.
