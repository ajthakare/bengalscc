# Theme Switching Guide

## Overview

The Bengals CC website has been architected for easy theme switching. All brand colors are now consolidated and controlled through CSS custom properties (variables), making it possible to rebrand the entire site by simply changing one import line.

## Architecture

### Theme Files Location

```
src/styles/
├── globals.css          # Main stylesheet (imports Tailwind + theme)
├── theme-config.css     # Theme switcher (EDIT THIS FILE TO SWITCH THEMES)
└── themes/
    ├── theme-bengals.css       # Original Bengals CC theme (orange/pink)
    └── theme-golden-state.css  # New Golden State CC theme (to be created)
```

### How to Switch Themes

**To switch the entire site theme, edit ONE line in `src/styles/theme-config.css`:**

```css
/* Current theme */
@import './themes/theme-bengals.css';

/* To switch to Golden State theme, change to: */
@import './themes/theme-golden-state.css';
```

That's it! The entire site will adopt the new color scheme.

## CSS Variables Reference

All components use these CSS variables for theming:

### Brand Colors
- `--color-primary`: Primary brand color (buttons, links, accents)
- `--color-primary-content`: Text color on primary background
- `--color-complementary`: Complementary/secondary brand color

### Background Colors
- `--color-bg-body`: Main background
- `--color-bg-card`: Card backgrounds
- `--color-bg-card-hover`: Card hover state
- `--color-bg-section-alt`: Alternate section background
- `--color-bg-hero`: Hero section background
- `--color-bg-hero-dark`: Hero section darker variant
- `--color-bg-input`: Form input background

### Text Colors
- `--color-text-body`: Main body text
- `--color-text-heading`: Heading text
- `--color-text-muted`: Muted/secondary text
- `--color-text-subtle`: Subtle text
- `--color-text-placeholder`: Input placeholder text

### Border Colors
- `--color-border`: Standard borders
- `--color-border-strong`: Emphasized borders

### Button Colors (Secondary)
- `--color-btn-secondary`: Secondary button background
- `--color-btn-secondary-hover`: Secondary button hover
- `--color-btn-secondary-text`: Secondary button text

## Current Theme - Bengals CC (Orange/Pink)

**Primary Color:** `#f97316` (Orange)
**Complementary:** `#355c7d` (Blue)

Full color palette defined in: `src/styles/themes/theme-bengals.css`

## Creating a New Theme

### Step 1: Create Theme File

Copy the existing theme file:

```bash
cp src/styles/themes/theme-bengals.css src/styles/themes/theme-golden-state.css
```

### Step 2: Update Colors

Edit `theme-golden-state.css` and replace all color values with your new brand colors:

```css
@theme {
    /* Brand Colors */
    --color-primary: #YOUR_NEW_PRIMARY;
    --color-primary-content: #ffffff;
    --color-complementary: #YOUR_NEW_COMPLEMENTARY;

    /* Background Colors */
    --color-bg-hero: #YOUR_LIGHT_TINT;
    --color-bg-hero-dark: #YOUR_DARKER_TINT;
    /* ... etc ... */
}
```

### Step 3: Activate New Theme

Edit `src/styles/theme-config.css`:

```css
@import './themes/theme-golden-state.css';
```

### Step 4: Test

Run the development server and verify all pages look correct:

```bash
npm run dev
```

## Pages That Use Theme Variables

All pages have been updated to use CSS variables:

### Public Pages
- `/` (Homepage)
- `/fixtures` (Fixtures listing)
- `/about`
- `/teams`
- `/gallery`
- `/contact`

### Admin Pages
- `/admin/login`
- `/admin/fixtures`
- `/admin/availability`
- `/admin/audit-logs`
- All other admin pages

### Components
- `Header.astro` (mobile navigation)
- `Card.astro`
- All button styles (`.btn`, `.btn-secondary`)
- All form inputs

## Fixed Hardcoded Colors

The following locations previously had hardcoded colors and have been fixed:

1. ✅ **Header.astro** (lines 139-146)
   - Mobile navigation hover and active states

2. ✅ **fixtures.astro** (lines 664-676)
   - Filter button active and hover states

3. ✅ **admin/audit-logs.astro** (lines 371, 415)
   - Form input focus state
   - Loading spinner color

4. ✅ **admin/login.astro** (lines 48, 63, 77, 85)
   - Input focus rings
   - Button background and hover
   - Link hover color

## Team-Specific Colors

Team badge colors are kept separate for differentiation (these don't change with theme):

```javascript
function getTeamColor(teamName) {
  if (teamName.includes('Tigers')) return 'bg-orange-100 border-orange-300 text-orange-800';
  if (teamName.includes('Bulls')) return 'bg-blue-100 border-blue-300 text-blue-800';
  if (teamName.includes('Thunder')) return 'bg-purple-100 border-purple-300 text-purple-800';
}
```

**Note:** When rebranding to Golden State CC, team names will likely change. Update this function accordingly.

## Golden State Rebrand Checklist

To complete the rebrand to Golden State Cricket Club:

### Theme/Styling
- [ ] Get new brand colors from logo/design
- [ ] Create `theme-golden-state.css` with new colors
- [ ] Update `theme-config.css` to import new theme
- [ ] Test all pages for color consistency

### Branding Content
- [ ] Replace logo file (`public/images/logo.png` or similar)
- [ ] Update site config (`src/config.ts`) with new club name
- [ ] Update team names throughout site
- [ ] Update `getTeamColor()` function if team names change

### Documentation
- [ ] Update `CLAUDE.md` with new color scheme
- [ ] Update `IMPLEMENTATION_STATUS.md`
- [ ] Update `README.md`

### Testing
- [ ] Verify all pages render correctly
- [ ] Check mobile navigation colors
- [ ] Test admin interface colors
- [ ] Verify button states (hover, active, focus)
- [ ] Check form input focus states

## Storage Impact

Theme files are tiny (< 5KB each). You can maintain multiple theme files for:
- Seasonal themes
- Special events
- A/B testing
- Dark mode variant (future enhancement)

## Benefits of This Architecture

1. **Single Point of Change**: Edit one line to switch entire site theme
2. **Consistent**: All components automatically use theme variables
3. **Maintainable**: No scattered hardcoded colors
4. **Flexible**: Easy to create seasonal or special event themes
5. **Fast**: CSS variables update instantly, no rebuild needed
6. **Future-Proof**: Easy to add dark mode or user-selectable themes

## Next Steps

Once you have your new Golden State Cricket Club brand colors:
1. Provide the hex codes for primary color, complementary color, and any specific background tints
2. Share the new logo file
3. I'll create the `theme-golden-state.css` file with all proper color values
4. We'll switch the theme and update all branding references

---

**Status:** ✅ Theme architecture complete and ready for Golden State rebrand
**Date:** 2026-02-06
