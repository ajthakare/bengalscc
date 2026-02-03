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

### 8. Sponsors Section
**Status**: Not implemented
**Page**: About Us page (`src/pages/about.astro`)
**Details**:
- Add "Our Sponsors" section at the bottom of the About Us page
- Display sponsor logos and names
- Links to sponsor websites (optional)
- Waiting for sponsor logos and information

**Design Considerations**:
- Responsive grid layout for sponsor logos
- Consistent logo sizing (maintain aspect ratios)
- Grayscale logos with color on hover (optional)
- "Become a Sponsor" call-to-action button

**Data Structure Needed**:
```typescript
interface Sponsor {
  name: string;
  logo: string; // path to sponsor logo
  website?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze'; // sponsorship level
}
```

**Implementation Ideas**:
```astro
<Section>
  <h2>Our Sponsors</h2>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
    {sponsors.map(sponsor => (
      <a href={sponsor.website} target="_blank">
        <img src={sponsor.logo} alt={sponsor.name} />
      </a>
    ))}
  </div>
</Section>
```

---

### 9. CAPTCHA on Contact Form
**Status**: Not implemented
**Page**: Contact page (`src/pages/contact.astro`)
**Details**:
- Add CAPTCHA to contact form for additional spam protection
- Integrate with Netlify Forms reCAPTCHA feature
- Alternative: Use hCaptcha or Cloudflare Turnstile

**Netlify reCAPTCHA Integration**:
- Add `data-netlify-recaptcha="true"` attribute to form
- Add reCAPTCHA div in form:
  ```html
  <div data-netlify-recaptcha="true"></div>
  ```
- Configure reCAPTCHA site key in Netlify dashboard

**Technical Notes**:
- Netlify Forms supports reCAPTCHA v2 out of the box
- No additional API keys needed when using Netlify's built-in feature
- CAPTCHA appears automatically when form is submitted
- Works alongside honeypot spam protection

**Alternative Options**:
- Google reCAPTCHA v3 (invisible, score-based)
- hCaptcha (privacy-focused alternative)
- Cloudflare Turnstile (privacy-friendly, free)

---

### 10. Match Results Display on Fixtures
**Status**: Not implemented
**Page**: Fixtures page (`src/pages/fixtures.astro`)
**Details**:
- Add "Result" column to fixtures CSV for completed matches
- Display Won/Lost/Tied status on past fixture cards
- Visual indicators (green for won, red for lost, yellow for tied)
- Show score summary if available

**CSV Column Addition**:
```csv
Result,Score
Won,"Bengal Tigers: 180/5, Opponent: 175/8"
Lost,"Bengal Tigers: 165/9, Opponent: 170/4"
Tied,"Bengal Tigers: 155/7, Opponent: 155/8"
```

**Implementation Ideas**:
- Add colored badge on past fixture cards
- Trophy icon 🏆 for wins
- Display score details on hover or expanded view
- Filter by result (Show only wins/losses)

---

### 11. Team Statistics Dashboard
**Status**: Not implemented
**Page**: New page - `src/pages/stats.astro` or section on fixtures page
**Details**:
- Calculate and display team statistics based on match results
- Win/Loss/Tie records for each team
- Win percentage calculation
- Head-to-head records against specific opponents
- Performance trends over time

**Statistics to Display**:
- **Overall Record**: Wins, Losses, Ties, Total Matches
- **Win Percentage**: (Wins / Total Matches) × 100
- **Home vs Away Performance**: Separate stats for home and away games
- **Recent Form**: Last 5-10 matches trend (W-W-L-W-T)
- **Best Performances**: Highest scores, biggest wins
- **Division Performance**: Stats by division (WB-D2, WB-D3, PB-D1)
- **Monthly Breakdown**: Performance by month
- **Opponent Analysis**: Which teams we've beaten/lost to most

**Visual Elements**:
- Progress bars for win percentage
- Charts/graphs for trends (Chart.js or similar)
- Color-coded performance indicators
- Comparison cards for each team (Tigers vs Bulls vs Thunder Cats)

**Data Source**:
- Parse results from fixtures CSV
- Calculate stats dynamically at build time
- Cache calculations for performance

---

### 12. Match Fixtures Page with CSV/Excel Import
**Status**: ✅ Completed
**Page**: `src/pages/fixtures.astro`
**Details**:
- Display team fixtures from CSV or Excel file
- Show upcoming matches and past results
- Multiple display options: table view, calendar view, or card-based list
- Highlight next match prominently
- Add filters (upcoming vs past, by format, by competition)

**Data Source Options**:
- **Option 1 (Recommended)**: CSV file in `src/data/fixtures.csv` - parsed at build time
- **Option 2**: Excel file (.xlsx) - requires `xlsx` library
- **Option 3 (Future)**: Google Sheets integration - auto-fetch latest data

**CSV Format**:
```csv
date,opponent,venue,home_away,format,time,competition,status
2025-03-15,Mumbai Riders,Bengals Ground,home,T20,14:00,League Match,scheduled
2025-03-22,Delhi Warriors,Warriors Stadium,away,ODI,10:00,Cup Quarter-Final,scheduled
```

**Display Options**:

**A. Table View** (Desktop-optimized):
- Sortable columns (date, opponent, venue)
- Filterable by format/status
- Responsive for mobile
- "Add to Calendar" buttons per match

**B. Calendar View** (Visual):
- Full calendar with marked fixture dates
- Click dates to see match details
- Month navigation
- Use FullCalendar library or custom CSS grid
- More visual but heavier implementation

**C. Card/List View** (Mobile-friendly):
- Match cards with all details
- Clean layout for mobile
- Easy to scan
- Highlight home vs away with colors

**Recommended Implementation**:
1. Start with CSV parsing using `papaparse` library
2. Create table view for desktop, card view for mobile
3. Add "Next Match" highlight section at top
4. Split fixtures into "Upcoming" and "Recent Results"
5. Add basic filters (All/Home/Away, by format)
6. Future: Add mini calendar showing fixture dates

**Technical Requirements**:
- Install: `npm install papaparse`
- For Excel: `npm install xlsx`
- Parse data at build time (static generation)
- No runtime processing needed

**Implementation Steps**:
```astro
---
// src/pages/fixtures.astro
import Papa from 'papaparse';
import { readFileSync } from 'fs';

const csvData = readFileSync('src/data/fixtures.csv', 'utf-8');
const { data: fixtures } = Papa.parse(csvData, { header: true });

// Split into upcoming and past
const today = new Date();
const upcoming = fixtures.filter(f => new Date(f.date) >= today);
const past = fixtures.filter(f => new Date(f.date) < today).reverse();
---
```

**Features to Include**:
- Next match highlight card
- Upcoming fixtures section
- Recent results section (with scores if available)
- Home vs Away indicators
- Match format badges (T20, ODI, Test)
- Venue information
- Competition/tournament names
- "Add to Calendar" (.ics export)
- Social sharing buttons

**Future Enhancements**:
- Google Sheets integration for easy updates
- Admin interface to add/edit fixtures
- Live score updates during matches
- Match detail pages with lineups and stats
- Weather forecast for match days
- Ground directions/maps

**Update Workflow**:
- Edit fixtures in CSV file or Google Sheets
- For CSV: Drop updated file into `src/data/fixtures.csv`
- Commit and push to Git
- Netlify auto-deploys with latest fixtures
- For Google Sheets: Fetches automatically on each build

**Benefits**:
- Easy to maintain (simple CSV/Excel format)
- Fast loading (static generation)
- SEO-friendly
- No backend required
- Free hosting

---

## Completed

### Match Fixtures Page with CSV Import
**Status**: ✅ Completed
**Page**: `src/pages/fixtures.astro`
**Completed Features**:
- ✅ CSV parsing with papaparse library
- ✅ Month-wise card layout displaying all match details
- ✅ Split into "Upcoming" and "Past Fixtures" sections
- ✅ Past Fixtures section collapsible by default
- ✅ Next match highlight card at top
- ✅ Team filtering (Bengal Tigers, Bengal Bulls, Bengal Thunder Cats)
- ✅ Dynamic stats (total matches, home/away games)
- ✅ Home vs Away indicators with emojis
- ✅ Ground addresses and venue information
- ✅ Team-specific color coding (Orange/Blue/Purple)
- ✅ Responsive design for mobile and desktop
- ✅ Generic implementation - dates include years in CSV
- ✅ Added to navigation header

**File Locations**:
- Page: `src/pages/fixtures.astro`
- Data: `src/data/fixtures.csv`
- Navigation: Updated in `src/components/Header.astro`

---

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
