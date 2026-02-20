# Coding Standards

**Last Updated:** February 20, 2026

This document establishes consistent patterns and conventions for the GSCC codebase.

---

## File Naming Conventions

### Pages (Astro)
- **Format:** `kebab-case.astro`
- **Examples:** `about-us.astro`, `my-fixtures.astro`, `non-profit.astro`

### Components
- **Format:** `PascalCase.astro` or `PascalCase.tsx`
- **Examples:** `SponsorCard.astro`, `MemberGrid.tsx`, `HeroSection.astro`

### Netlify Functions
- **Format:** `[resource]-[action]-[object].ts`
- **Examples:** `admin-users-create.ts`, `fixtures-update.ts`, `roster-bulk-update.ts`

### CSS Files
- **Format:** `kebab-case.css`
- **Examples:** `globals.css`, `mobile-responsive.css`, `theme-golden-state-v2.css`

---

## Styling Hierarchy

Use in this order of preference:

1. **Tailwind Utility Classes** (Primary)
2. **CSS Custom Variables** (For theming)
3. **CSS Classes** (For reusable components)
4. **Inline Styles** (Special cases only - e.g., gallery images)

---

## Error Handling Patterns

### Netlify Functions
```typescript
return {
  statusCode: 200,
  body: JSON.stringify({ success: true, data: result })
};

// OR on error:
return {
  statusCode: 400,
  body: JSON.stringify({ error: 'Descriptive error message' })
};
```

---

## Type Definitions

All types in `/src/types/` directory. Import from index:

```typescript
import type { Player, Season, Sponsor } from '../types';
```

---

## Asset Location Guidelines

| Asset Type | Location | Reason |
|------------|----------|--------|
| Gallery Images | `/public/media/` | Node.js readdir() pattern |
| Sponsor Logos | `/public/sponsors/` | Direct URL access |
| Club Logo (optimized) | `/src/assets/logo.svg` | Astro Image component |
| Club Logo (public) | `/public/logo.svg` | Direct access (favicon) |
| Documentation Assets | `/docs/assets/` | Docs images/diagrams |
| Debug Scripts | `/local-debug/` | NEVER committed |

---

## Security Best Practices

- ✅ Store secrets in `.env` (git-ignored)
- ❌ NEVER commit `.env` to git
- ✅ Validate sessions on admin endpoints
- ✅ Hash passwords with salt
- ❌ NEVER store passwords in plain text

---

**See Also:**
- `/docs/guides/THEME_GUIDE.md` - Theme system
- `/docs/implementation/STATUS.md` - Implementation status
