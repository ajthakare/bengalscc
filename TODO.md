# Bengals CC - TODO List

## Priority Enhancements

### 1. Team Member Photos
**Status**: Waiting for content
**Page**: Team page
**Details**:
- Update photos of team members
- Photos will be provided by admin later
- Ensure consistent photo sizing and styling

---

### 2. Instagram Feed Widget
**Status**: Not implemented
**Page**: Gallery page
**Details**:
- Add Instagram feed widget to display latest posts
- Consider options:
  - Instagram's official embed widget
  - Third-party services (SnapWidget, Behold, etc.)
  - Custom API integration
- Add static gallery images as fallback/additional content
- Need to organize and add images to gallery page

**Technical Considerations**:
- Instagram Basic Display API requires Facebook Developer account
- Widget may need to be embedded via iframe or React component
- Consider loading performance and lazy loading for images

---

### 3. WhatsApp Contact Field
**Status**: Not implemented
**Page**: Contact page (`src/pages/contact.astro`)
**Details**:
- Add WhatsApp number field to contact information section
- Display as clickable link using `https://wa.me/` format
- Add to SITE_CONFIG in `src/config.ts`

**Implementation Notes**:
```astro
<a href="https://wa.me/1234567890" target="_blank">
  WhatsApp: +1 234 567 890
</a>
```

---

### 4. Consistent Social Media Buttons
**Status**: Needs refactoring
**Pages**: Multiple pages (Home, Contact, About, etc.)
**Details**:
- Social buttons currently implemented differently across pages
- Create reusable `SocialLinks.astro` component
- Ensure consistent styling, icons, and behavior
- Standardize layout (horizontal vs vertical, button style vs icon-only)

**Files to Review**:
- `src/pages/index.astro`
- `src/pages/contact.astro`
- `src/components/Header.astro`
- `src/layouts/Layout.astro`

**Proposed Solution**:
- Create `src/components/SocialLinks.astro` with props for layout variant
- Replace all social link implementations with this component

---

### 5. Teams Page Enhancement
**Status**: Needs design and implementation
**Page**: Teams page
**Details**:
- Add new teams with team logos
- Display Captain and Vice-Captain information for each team
- Need to design visual layout for team cards

**Data Structure Needed**:
```typescript
interface Team {
  name: string;
  logo: string; // path to team logo image
  captain: {
    name: string;
    photo?: string;
  };
  viceCaptain: {
    name: string;
    photo?: string;
  };
  description?: string;
  achievements?: string[];
}
```

**Design Considerations**:
- Team card layout (logo + info)
- Captain/Vice-Captain badges or labels
- Responsive grid for multiple teams
- Color scheme per team (optional)

---

### 6. "How to Join" Section Links
**Status**: Not implemented
**Page**: Home page (or dedicated Join page)
**Details**:
- Add appropriate links to each step in the "How to Join" section
- Links should direct users to:
  - Contact page for "Get in Touch" step
  - Teams page for "Learn About Teams" step
  - Registration form (if separate) or contact form for "Sign Up" step

**Implementation**:
- Update existing "How to Join" component/section
- Add clickable call-to-action buttons or links
- Consider using anchor links for smooth scrolling

---

### 7. Achievement Icons
**Status**: Not implemented
**Page**: Home page - Recent Achievements section
**Details**:
- Add cup/trophy icons or emojis to each achievement
- Visual enhancement to make achievements stand out
- Options:
  - Emoji: 🏆 (trophy), 🥇 (gold medal), 🏏 (cricket), 🎯 (target)
  - Icon library (Heroicons, Font Awesome)
  - Custom SVG icons

**Implementation Options**:
```astro
<div class="achievement-item">
  <span class="text-4xl">🏆</span>
  <h3>Championship Win 2024</h3>
</div>
```

---

## Completed

### Contact Form with Netlify Forms
**Status**: Planned (documented, not yet implemented)
**Documentation**: See plan in `/Users/aj/.claude/projects/` transcript
**Details**:
- Netlify Forms integration for contact form
- Email notifications setup
- Thank-you page creation
- Spam protection with honeypot

---

## Notes

- Priorities can be adjusted based on content availability and business needs
- Some items may require external assets (photos, logos) before implementation
- Consider creating a staging environment for testing new features before production deployment
