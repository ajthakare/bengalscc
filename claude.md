# Golden State Cricket Club (GSCC) - Project Documentation

## Project Overview

**Project Name:** Golden State Cricket Club (GSCC) / Bengals Inc.
**Type:** Cricket club website with comprehensive admin management system
**Organization:** Bengals Inc. - 501(c)(3) non-profit organization (EIN: 93-4696065)
**Location:** Bay Area, California (8 counties: San Jose, Sunnyvale, Fremont, Milpitas, Livermore, Morgan Hill, Tracy, Davis)

**Technology Stack:**
- **Framework**: Astro.js v5.17.1 (Static Site Generator with SSR capabilities)
- **Styling**: Tailwind CSS v4 (utility-first CSS framework)
- **UI Components**: React v19 integration for interactive components
- **Backend**: Netlify Functions (serverless functions for API endpoints)
- **Storage**: Netlify Blobs (key-value storage for data persistence)
- **Authentication**: JWT-based sessions with role-based access control
- **Deployment**: Netlify with platform-specific features (Edge Functions, CDN, Blobs)
- **Font**: Inter Variable (modern sans-serif)
- **CSV Processing**: PapaParse v5.5.3

## Project Structure

```
bengalscc/
├── src/
│   ├── pages/                      # Route-based pages (file-based routing)
│   │   ├── index.astro             # Homepage with carousel
│   │   ├── about.astro             # About GSCC page
│   │   ├── gallery.astro           # Photo gallery with lightbox
│   │   ├── contact.astro           # Contact form
│   │   ├── fixtures.astro          # Public fixtures display
│   │   ├── non-profit.astro        # Non-profit info & donation
│   │   ├── admin/                  # Admin panel (protected)
│   │   │   ├── index.astro         # Admin dashboard (inquiries)
│   │   │   ├── login.astro         # Admin login
│   │   │   ├── users.astro         # User management
│   │   │   ├── seasons.astro       # Season management
│   │   │   ├── fixtures.astro      # Fixture management
│   │   │   ├── players.astro       # Player management
│   │   │   ├── players/
│   │   │   │   └── import.astro    # Player import wizard
│   │   │   ├── roster.astro        # Team roster management
│   │   │   ├── availability.astro  # Availability tracking
│   │   │   ├── statistics.astro    # Statistics dashboard
│   │   │   └── audit-logs.astro    # Audit log viewer (super admin)
│   │   └── api/                    # API endpoints
│   ├── layouts/
│   │   ├── Layout.astro            # Main public layout
│   │   └── AdminLayout.astro       # Admin panel layout
│   ├── components/                 # Reusable components
│   │   ├── HeroSection.astro       # Hero banner
│   │   ├── Section.astro           # Content sections
│   │   ├── StatsGrid.astro         # Stats display
│   │   ├── Card.astro              # Card component
│   │   ├── MemberCard.astro        # Team member cards
│   │   ├── NonProfitBadge.astro    # 501(c)(3) badge
│   │   ├── ZeffyDonation.astro     # Zeffy donation widget
│   │   └── [other components]
│   ├── styles/
│   │   └── globals.css             # Global styles, Tailwind config, custom classes
│   ├── middleware/
│   │   └── auth.ts                 # Authentication helpers
│   ├── types/
│   │   └── player.ts               # TypeScript interfaces (Season, Player, Fixture, etc.)
│   ├── config.ts                   # Site-wide configuration
│   └── utils.ts                    # Helper functions
├── public/                         # Static assets
│   ├── media/                      # Photo gallery images (add images here!)
│   └── favicon.svg
├── netlify/
│   ├── functions/                  # Serverless API functions (40+ functions)
│   │   ├── admin-login.ts          # Authentication
│   │   ├── admin-users-*.ts        # User management
│   │   ├── seasons-*.ts            # Season CRUD
│   │   ├── fixtures-*.ts           # Fixture CRUD
│   │   ├── players-*.ts            # Player CRUD
│   │   ├── roster-*.ts             # Roster management
│   │   ├── availability-*.ts       # Availability tracking
│   │   ├── statistics-*.ts         # Statistics calculation
│   │   ├── audit-logs-*.ts         # Audit logging
│   │   └── [other functions]
│   └── edge-functions/             # Edge function handlers
├── docs/                           # Project documentation
│   ├── scripts/                    # Maintenance scripts (moved from root)
│   │   ├── check-blob-usage.js
│   │   ├── migrate-*.js
│   │   └── generate-session-secret.cjs
│   ├── guides/                     # User guides
│   │   └── PLAYER_MANAGEMENT_GUIDE.md
│   ├── assets/                     # Documentation assets
│   ├── PLAYER_MANAGEMENT_PLAN.md   # Implementation plan
│   ├── IMPLEMENTATION_STATUS.md    # Current status
│   └── [other docs]
├── astro.config.mjs                # Astro configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
└── CLAUDE.md                       # This file
```

## Site Configuration

**Global config location:** `/src/config.ts`

```typescript
export const SITE_CONFIG = {
  name: 'Golden State Cricket Club',
  contact: {
    email: 'gsbengalsinc@gmail.com',
    phone: '+1 (xxx) xxx-xxxx'
  },
  social: {
    instagram: {
      url: 'https://www.instagram.com/goldenstate_cc/',
      label: '@goldenstate_cc'
    },
    youtube: {
      url: 'https://www.youtube.com/@GoldenStateCricketClub',
      label: 'Golden State Cricket Club'
    }
  },
  nonProfit: {
    name: 'Bengals Inc.',
    status: '501(c)(3) non-profit organization',
    ein: '93-4696065',
    founded: '2018',
    mission: '...',
    impactStats: [...]
  }
}
```

## Teams

**Four competitive teams:**

1. **Bengal Tigers** - White Ball Division 2 (WB-D2)
2. **Bengal Bulls** - White Ball Division 3 (WB-D3)
3. **Bengal Thunder Cats** - Pink Ball Division 1 (PB-D1)
4. **Bengal Strikers** - (Division TBD)

**Recent Achievement:** 🏆 2025 Summer League – T20 Division 1 Champions (Bengal Tigers)

## Public Website Features

### 1. Homepage (`/`)
- Hero banner with latest championship announcement
- Quick highlights (Founded, Active Members, Teams, Counties)
- About GSCC section
- Recent achievements grid
- Where we play (locations)
- Media gallery carousel (horizontal scroll, first 8 images)
- Link to full gallery

### 2. About Page (`/about`)
- Club history and mission
- Team information with color-coded badges
- Board members
- Values and community focus

### 3. Gallery (`/gallery`)
- Responsive grid layout (2/3/4 columns)
- Automatic image detection from `/public/media/`
- Lightbox modal for full-size viewing
- Keyboard navigation (arrows, ESC)
- Social media links to Instagram/YouTube

### 4. Fixtures (`/fixtures`)
- Upcoming fixtures display
- Filter by team
- Match details (date, time, venue, opponent, division)

### 5. Contact (`/contact`)
- Contact form (stores in Netlify Blobs)
- Contact information
- Social media links

### 6. Non-Profit (`/non-profit`)
- 501(c)(3) information and badge
- Mission and impact stats
- Board of Directors
- Zeffy donation integration
- Tax deduction information
- Programs and community engagement

## Admin System (Comprehensive Player Management)

**Access:** `/admin` (password-protected)

**Authentication:**
- JWT-based sessions stored in Netlify Blobs
- Two roles: `super_admin` and `admin`
- Session expiry: 7 days

**Admin Features:**

### 1. Dashboard (`/admin`)
- View and manage contact form inquiries
- Bulk operations (mark as reviewed, delete)

### 2. User Management (`/admin/users`)
- Create/edit/delete admin users
- Role assignment (super_admin / admin)
- Password changes
- **Super admin only:** Change user roles

### 3. Season Management (`/admin/seasons`)
- Create and manage cricket seasons
- Set active season
- Configure teams per season (flexible team names/divisions)
- Season date ranges

### 4. Fixture Management (`/admin/fixtures`)
- Create/edit/delete fixtures per season
- Bulk import from CSV
- Export fixtures to CSV
- Match result tracking (score, result, notes)
- Fixture details (home/away, ground, umpiring team)
- YouTube video links and scoring app links

### 5. Player Management (`/admin/players`)
- Global player pool management
- Add/edit/delete individual players
- Bulk import from CSV
- Export players to CSV
- Player details (name, email, USAC ID, position, jersey number)
- Active/inactive status
- Search and filter (by season, team, status, position)

### 6. Roster Management (`/admin/roster`)
- Assign players to teams per season
- Track player roles (captain, vice-captain, player)
- Jersey number management
- Multiple team assignments possible
- Historical roster tracking across seasons

### 7. Availability Tracking (`/admin/availability`)
- Admin-managed availability records
- Two-step tracking: Available → Selected
- Link availability to specific fixtures
- Player duties tracking
- Availability statistics per fixture

### 8. Statistics Dashboard (`/admin/statistics`)
- Player statistics (games played, availability rates)
- Team-level statistics per season
- Season-level aggregations
- Career statistics across all seasons
- Advanced statistics with filters
- Export statistics to CSV
- Automatic calculation system

### 9. Audit Logs (`/admin/audit-logs`)
- **Super admin only**
- Complete log of all admin actions
- Filter by date range, action type, username
- Export logs to CSV

## Data Storage Architecture

**Storage:** Netlify Blobs (key-value storage)

**Current Usage:** ~79 KB / 1 GB free tier (0.0075%)

**Stores:**

1. **admin-users** - Admin user accounts
2. **admin-sessions** - Active JWT sessions
3. **seasons** - Cricket seasons data
4. **fixtures** - Match fixtures per season
5. **players** - Global player pool with season history
6. **fixture-availability** - Availability tracking per fixture
7. **player-statistics** - Calculated statistics (multi-season + career)
8. **audit-logs** - Admin action audit trail
9. **contact-submissions** - Contact form submissions

**Key Data Models:**

```typescript
// Season (from src/types/player.ts)
interface Season {
  id: string;
  name: string;              // "2025-2026"
  startDate: string;
  endDate: string;
  isActive: boolean;
  teams: TeamDefinition[];
  createdAt: string;
  createdBy: string;
}

// Player
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  dateJoined: string;
  isActive: boolean;
  seasonAssignments: SeasonAssignment[];
  createdAt: string;
  updatedAt: string;
}

// Fixture
interface Fixture {
  id: string;
  seasonId: string;
  gameNumber: string;
  date: string;
  time: string;
  team: string;
  opponent: string;
  venue: string;
  division: string;
  createdAt: string;
}

// See src/types/player.ts for complete interfaces
```

## Gallery System Implementation

**CRITICAL: Image Handling Pattern**

**Location:** `/public/media/`

**How it works:**
1. Images are stored in `/public/media/` folder as static assets
2. Node.js `readdir()` dynamically reads files at build time
3. Images served as direct URLs: `/media/filename.jpg`
4. Automatic detection - adding new images makes them appear automatically

**Important Technical Decision:**
- **DO NOT use Astro's Image component** for gallery images
- **DO NOT use CSS `aspect-ratio` property** - causes black box rendering issues
- **USE inline styles with explicit dimensions** and `object-fit: cover`

**Working Pattern (index.astro and gallery.astro):**

```typescript
// Frontmatter - Dynamic image loading
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

let galleryImages: { src: string; alt: string }[] = [];
try {
    const mediaDir = join(process.cwd(), 'public', 'media');
    const files = await readdir(mediaDir);

    galleryImages = files
        .filter(file => /\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i.test(file))
        .filter(file => file !== '.DS_Store')
        .sort()
        .map(file => ({
            src: `/media/${file}`,
            alt: file.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '')
        }));
} catch (error) {
    console.error('Error loading gallery images:', error);
}
```

```html
<!-- Image rendering - Use explicit dimensions + object-fit -->
<div style="width: 200px; height: 200px;">
    <img
        src={image.src}
        alt={image.alt}
        width="200"
        height="200"
        style="width: 100%; height: 100%; object-fit: cover; display: block;"
    />
</div>
```

**Lightbox Implementation:**
- Modal overlay with full-size image
- Navigation arrows (prev/next)
- Keyboard support (ESC, Arrow Left, Arrow Right)
- Click background to close
- Image counter (X / Total)

**To Add New Images:**
1. Simply drop images into `/public/media/`
2. Supported formats: jpg, jpeg, png (case-insensitive)
3. Images automatically appear on homepage carousel and gallery page
4. No code changes needed

## Design System

**Color Scheme:**
- **Primary:** `#f67280` (coral pink) - brand color
- **Secondary:** `#355c7d` (blue) - complementary color
- **Accent:** `#E5C878` (gold) - highlights

**Team Colors (used in badges):**
- Bengal Tigers: `orange-100/300/800`
- Bengal Bulls: `blue-100/300/800`
- Bengal Thunder Cats: `purple-100/300/800`

**Typography:**
- Font: Inter Variable
- Headings: Bold, varying sizes
- Body: Regular weight

**Custom CSS Classes (globals.css):**
- `.btn`, `.btn-lg` - Primary buttons
- `.btn-secondary` - Secondary buttons
- `.card`, `.card-elevated` - Card containers
- `.stat-box` - Statistics display
- `.accent-box` - Highlighted content boxes
- `.text-justified` - Responsive justified text (left on mobile, justified on desktop)
- `.page-title`, `.section-heading`, `.subsection-heading` - Heading styles
- `.text-body`, `.text-body-lg`, `.text-body-base` - Body text sizes
- `.tag` - Pill-shaped tags
- `.member-grid` - Member card grid layout

**Layout:**
- Max width: 1280px (standard container)
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Mobile-first approach

## Available Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## Common Tasks

### Add New Gallery Images
1. Add image files to `/public/media/`
2. Images automatically appear on homepage carousel and gallery page
3. No code changes needed

### Update Site Configuration
1. Edit `/src/config.ts`
2. Update contact info, social media links, or other global settings

### Create New Page
1. Create `.astro` file in `/src/pages/`
2. File-based routing: `/src/pages/example.astro` → `/example`

### Add New Admin Function
1. Create Netlify function in `/netlify/functions/`
2. Follow pattern from existing functions (auth check, Blobs operations)
3. Use `validateAdminSession()` for authentication

### Run Maintenance Scripts
```bash
node docs/scripts/script-name.js
```

### Generate New Admin Session Secret
```bash
node docs/scripts/generate-session-secret.cjs
```

## Important Technical Notes

### Image Rendering Issues (Historical)
- **Problem:** Astro Image component + CSS aspect-ratio = black boxes
- **Solution:** Public folder + direct URLs + inline styles
- **Never use:** `aspect-ratio` CSS property for gallery images
- **Always use:** Explicit width/height with `object-fit: cover`

### Mobile Responsiveness
- All pages are mobile-responsive
- Text justification disabled on mobile (readability)
- Gallery uses responsive grid (2/3/4 columns)
- Carousel has horizontal scroll with snap points

### Authentication
- JWT tokens stored in Netlify Blobs
- Cookie-based session management
- 7-day session expiry
- Secure password hashing with salt

### Data Integrity
- Audit logging for all admin actions
- Season-based data isolation
- Player history preserved across seasons
- Validation at both client and server levels

## Deployment

**Platform:** Netlify

**Build Settings:**
- Build command: `npm run build`
- Publish directory: `dist`

**Environment Variables Required:**
- `JWT_SECRET` - Session secret (generate with script)
- `CLOUDINARY_*` - If using Cloudinary (future enhancement)

**Netlify Features Used:**
- Functions (serverless API)
- Blobs (data storage)
- Edge Functions (geo-location, caching)
- Forms (contact form backup)
- CDN (image delivery)

## Documentation

**Key docs in `/docs/`:**
- `PLAYER_MANAGEMENT_PLAN.md` - Complete implementation plan
- `IMPLEMENTATION_STATUS.md` - Current feature status
- `guides/PLAYER_MANAGEMENT_GUIDE.md` - Admin user guide
- `MOBILE_TESTING_GUIDE.md` - Mobile testing checklist

## Development Notes

### File Routing
- Each `.astro` file in `pages/` becomes a route
- Server-rendered pages: Add `export const prerender = false;` in frontmatter
- API endpoints: Place in `pages/api/` directory

### Component Structure
- Mix Astro (`.astro`) and React (`.tsx`) components
- Astro components for static content
- React components for interactive features

### Styling Approach
- Tailwind utility classes for most styling
- Custom CSS in `globals.css` for reusable patterns
- Inline styles for gallery images (critical for rendering)

### State Management
- No client-side state management library
- Server-side data fetching in page frontmatter
- Form submissions to Netlify Functions

## Security Considerations

- Password hashing with salt
- JWT token validation on all admin endpoints
- Role-based access control (RBAC)
- Input sanitization
- CSRF protection via same-origin policy
- No sensitive data in client-side code

## Future Enhancements (Planned)

- Media gallery with Cloudinary integration
- Email notifications for fixtures/availability
- Player portal (self-service availability updates)
- Advanced statistics with charts/graphs
- Mobile app/PWA
- Enhanced match result tracking

## Support

For questions or issues, contact: gsbengalsinc@gmail.com

---

**Last Updated:** February 2026
**Current Version:** 1.0 (Production)
**Astro Version:** 5.17.1
