# Configuration Guide

## Overview

All site-wide configuration values (social media links, contact info, site metadata) are centralized in `src/config.ts`. This makes it easy to update information in one place rather than searching through multiple files.

## Configuration File

**Location:** `src/config.ts`

```typescript
export const SITE_CONFIG = {
    name: 'Bengals Cricket Club',
    location: 'Bay Area, California',
    email: 'bengalscc@gmail.com',
    description: '...',

    social: {
        instagram: {
            url: 'https://www.instagram.com/bengalsinc_org/',
            label: 'Instagram',
            description: 'Photos and highlights'
        },
        youtube: {
            url: 'https://www.youtube.com/@BengalsCricketClubBayArea',
            label: 'YouTube',
            description: 'Match videos'
        }
    }
};
```

## How to Update

### Change Social Media Links

Edit `src/config.ts`:

```typescript
social: {
    instagram: {
        url: 'https://www.instagram.com/YOUR_HANDLE/',  // Update URL
        label: 'Instagram',                              // Change display name if needed
        description: 'Photos and highlights'             // Update description
    }
}
```

The change will automatically apply to:
- Footer (all pages)
- Contact page
- Gallery page

### Change Contact Information

Edit `src/config.ts`:

```typescript
email: 'newemail@example.com',        // Updates contact page and mailto links
location: 'New Location, State',       // Updates footer and contact page
```

### Change Site Metadata

Edit `src/config.ts`:

```typescript
name: 'New Club Name',                 // Updates footer and site references
description: 'New site description',   // Updates meta description for SEO
```

## Adding New Social Media

To add a new social media platform:

1. Add to `src/config.ts`:
```typescript
social: {
    instagram: { ... },
    youtube: { ... },
    facebook: {  // New platform
        url: 'https://facebook.com/yourpage',
        label: 'Facebook',
        description: 'Updates and events'
    }
}
```

2. Update components where social links appear:
   - `src/components/Footer.astro`
   - `src/pages/contact.astro`
   - `src/pages/gallery.astro`

Add the new link:
```astro
<a href={SITE_CONFIG.social.facebook.url} target="_blank" rel="noopener noreferrer">
    {SITE_CONFIG.social.facebook.label}
</a>
```

## Benefits

✅ **Single Source of Truth** - Update once, applies everywhere
✅ **Easy Maintenance** - No need to search multiple files
✅ **Consistent Data** - Same information across the site
✅ **Type Safety** - TypeScript ensures correct usage
✅ **Quick Updates** - Change social links in seconds

## Files Using Config

- `src/layouts/Layout.astro` - Site description
- `src/components/Footer.astro` - Social links, site name, location
- `src/pages/contact.astro` - Email, location, social links
- `src/pages/gallery.astro` - Social links

## Example: Updating Instagram URL

**Before centralization:** Edit 3 files (Footer, Contact, Gallery)
**After centralization:** Edit 1 file (config.ts)

```typescript
// src/config.ts
social: {
    instagram: {
        url: 'https://www.instagram.com/NEW_HANDLE/',  // Change here only!
        label: 'Instagram',
        description: 'Photos and highlights'
    }
}
```

All pages automatically update! 🎉
