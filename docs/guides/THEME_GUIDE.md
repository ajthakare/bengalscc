# GSCC Theme Guide

**Last Updated:** February 20, 2026

## Overview

The Golden State Cricket Club website uses a comprehensive theming system based on CSS custom properties (variables). This guide consolidates all theme-related documentation.

## Current Active Theme

**Theme:** Golden State Cricket Club v2  
**File:** `src/styles/themes/theme-golden-state-v2.css` (735 lines)  
**Status:** Active and Production-Ready

This is the **only** theme file in the codebase (as of February 2026 cleanup).

## Theme Architecture

### File Structure

```
src/styles/
├── theme-config.css           # Imports active theme
├── components.css             # Shared component styles
├── mobile-responsive.css      # Mobile-specific fixes
├── globals.css                # Base typography
├── admin.css                  # Admin panel styles
└── themes/
    └── theme-golden-state-v2.css  # Active theme (ONLY ONE)
```

### How Themes Work

1. **CSS Custom Properties:** All colors, shadows, borders, and design tokens are defined as CSS variables in the theme file
2. **Component Integration:** Components reference these variables (e.g., `var(--color-primary)`)
3. **Single Import:** `theme-config.css` imports the active theme, which is then imported by all CSS files

### Import Order (in each CSS file)

```css
@import 'tailwindcss';
@import './theme-config.css';      /* Loads active theme variables */
@import './components.css';         /* Uses theme variables */
@import './mobile-responsive.css'; /* Uses theme variables */
/* File-specific styles */
```

## Theme Variables Reference

The theme defines variables in these categories:

### Colors
- **Primary Colors:** `--color-primary`, `--color-primary-dark`, `--color-primary-light`
- **Secondary Colors:** `--color-secondary`, etc.
- **Background Colors:** `--color-bg-page`, `--color-bg-card`, `--color-bg-card-hover`
- **Text Colors:** `--color-text-heading`, `--color-text-body`, `--color-text-muted`
- **Border Colors:** `--color-border`, `--color-border-strong`
- **Button Colors:** `--color-btn-secondary`, `--color-btn-secondary-hover`

### Design Tokens
- **Border Radius:** `--border-radius-button`, `--border-radius-card`
- **Shadows:** `--shadow-card`, `--shadow-card-hover`, `--shadow-elevated`, `--shadow-button`
- **Transitions:** `--transition-base`, `--transition-hover`
- **Gradients:** `--gradient-primary`, `--gradient-hero`, `--gradient-section`, `--gradient-card-header`

## Creating New Theme Variables

When adding new components that need theming:

1. **Add variables to theme file** (`themes/theme-golden-state-v2.css`):
   ```css
   :root {
     --color-new-component-bg: #ffffff;
     --color-new-component-text: #1a1a1a;
   }
   ```

2. **Use variables in components** (`components.css` or component file):
   ```css
   .new-component {
     background-color: var(--color-new-component-bg);
     color: var(--color-new-component-text);
   }
   ```

## Theme Switching (If Needed in Future)

**Note:** Currently there is only ONE theme. If you need to add theme switching:

1. Create new theme file: `src/styles/themes/theme-name.css`
2. Copy structure from `theme-golden-state-v2.css`
3. Update all CSS custom property values
4. Change import in `theme-config.css`:
   ```css
   @import './themes/theme-name.css';
   ```

## Component Integration

All components automatically use theme variables:

### Example: Card Component
```css
.card {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-card);
    box-shadow: var(--shadow-card);
    transition: all var(--transition-hover);
}
```

### Example: Button Component
```css
.btn {
    background: var(--gradient-primary);
    border-radius: var(--border-radius-button);
    box-shadow: var(--shadow-button);
    transition: all var(--transition-hover);
}
```

## Best Practices

1. **Never hardcode colors** - Always use CSS variables
2. **Add new variables to theme file** - Don't define colors in component files
3. **Use semantic naming** - `--color-card-bg` not `--color-gray-100`
4. **Test in context** - View changes across multiple pages
5. **Document new variables** - Update this guide when adding theme variables

## Migration Notes

**February 2026 Cleanup:**
- Removed 4 unused theme files (theme-bengals.css, theme-golden-state.css, theme-basic.css, theme-rich.css)
- Consolidated to single active theme: `theme-golden-state-v2.css`
- Extracted component styles to `components.css`
- Extracted mobile fixes to `mobile-responsive.css`

## Troubleshooting

**Issue:** Colors not applying  
**Solution:** Check import order - `theme-config.css` must be imported before components

**Issue:** Hover effects not working  
**Solution:** Ensure `--transition-hover` variable is defined in theme

**Issue:** Mobile styles breaking  
**Solution:** Check `mobile-responsive.css` is imported after theme

---

**See Also:**
- `/src/styles/themes/theme-golden-state-v2.css` - Active theme file
- `/src/styles/components.css` - Component library
- `/docs/guides/CODING_STANDARDS.md` - CSS coding standards

