# Player Management System Implementation Plan

## Overview
Implement a comprehensive player management system for Bengals Cricket Club that enables admins to manage player pool, track team assignments, monitor availability for fixtures, and generate statistics at both team and club levels.

## Current State Analysis

### Existing Infrastructure
**Admin System** (Already Implemented):
- Authentication: JWT-based sessions with Netlify Blobs storage
- Admin pages: `/admin` (submissions), `/admin/users` (user management)
- AdminLayout with sidebar navigation
- Netlify Functions for CRUD operations
- PapaParse v5.5.3 for CSV parsing

**Teams** (Hardcoded in `/src/pages/teams.astro`):
- **Bengal Tigers** - White Ball Division 2 (WB-D2), Captain: Likith Gowda
- **Bengal Bulls** - White Ball Division 3 (WB-D3), Captain: Mazar Khan
- **Bengal Thunder Cats** - Pink Ball Division 1 (PB-D1), Captain: Sharan CK

**Fixtures** (CSV format):
- Location: `/src/data/fixtures.csv`
- 37 matches from November 2025 to March 2026
- Parsed with PapaParse in `/src/pages/fixtures.astro`

**Current Gap**:
- No season management system
- No player data management system
- No roster tracking per team per season
- No availability tracking for matches
- No statistics calculation
- No fixture upload/management per season (currently using single CSV)

## User Requirements

1. **Season Management**
   - Create and manage cricket seasons (e.g., "2025-2026")
   - Track which season is currently active
   - Teams and player rosters are season-specific
   - Players can change teams or join/leave between seasons

2. **Player Pool Management (Per Season)**
   - Bulk import players from Excel/CSV for a season
   - Add/edit/delete individual players
   - Track player details (name, contact, position, jersey number)
   - Assign players to multiple teams within a season
   - Track player history across multiple seasons

3. **Team Roster Management (Per Season)**
   - Track which players belong to which teams each season
   - Support multiple team assignments per player per season
   - Display team rosters with role indicators
   - View historical rosters from previous seasons

4. **Availability Tracking (Admin-Managed)**
   - **Admin marks** which players were available for each fixture
   - **Admin marks** which players were selected/played in the game
   - Two-step tracking: Availability → Selection
   - Link availability data to specific fixtures
   - Add notes per player per fixture

5. **Statistics Dashboard**
   - Games played per player (team level + club level + career)
   - Availability rates per season and career
   - Selection rates (how often available players get selected)
   - Team-level and season-level summaries
   - Historical comparisons across seasons

6. **Bulk Operations**
   - CSV/Excel import with validation
   - Bulk delete players
   - Export player data and statistics per season

---

## Data Models

### Season Schema
```typescript
interface Season {
  id: string;                    // UUID
  name: string;                  // "2025-2026"
  startDate: string;             // ISO date
  endDate: string;               // ISO date
  isActive: boolean;             // Only one season active at a time
  teams: TeamDefinition[];       // Teams for this season (flexible, can change)
  createdAt: string;
  createdBy: string;
}

interface TeamDefinition {
  teamName: string;              // Team name (flexible per season)
  division: string;              // "WB-D2", "WB-D3", "PB-D1", etc.
  captain?: string;              // Player ID
  viceCaptain?: string;          // Player ID
}
```

### Fixture Schema
```typescript
interface Fixture {
  id: string;                    // UUID
  seasonId: string;
  gameNumber: string;            // "Game 1", "Game 2", etc.
  date: string;                  // ISO date
  time: string;
  team: string;                  // Team name from season
  opponent: string;
  venue: string;
  division: string;
  createdAt: string;
  createdBy: string;
}
```

### Player Schema (Season-Based)
```typescript
interface Player {
  id: string;                    // UUID
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;              // Batsman, Bowler, All-rounder, Wicket-keeper
  dateJoined: string;             // First joined club (any season)
  isActive: boolean;              // Currently active in club
  seasonAssignments: SeasonAssignment[];  // History across all seasons
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface SeasonAssignment {
  seasonId: string;
  seasonName: string;             // "2025-2026"
  teams: TeamAssignment[];        // Can be in multiple teams per season
  joinedDate: string;             // When joined this season
  leftDate?: string;              // If left during season
}

interface TeamAssignment {
  teamName: 'Bengal Tigers' | 'Bengal Bulls' | 'Bengal Thunder Cats';
  division: string;
  role?: 'Captain' | 'Vice Captain' | 'Player';
  jerseyNumber?: number;
  assignedDate: string;
}
```

### Availability Schema (Admin-Managed)
```typescript
interface FixtureAvailability {
  id: string;
  fixtureId: string;             // Maps to Game# from fixtures.csv
  seasonId: string;
  gameNumber: string;
  date: string;
  team: string;
  opponent: string;
  venue: string;
  playerAvailability: PlayerAvailabilityRecord[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;             // Admin username who last updated
}

interface PlayerAvailabilityRecord {
  playerId: string;
  playerName: string;
  wasAvailable: boolean;         // Admin marks: Was player available?
  wasSelected: boolean;          // Admin marks: Was player selected/played?
  notes?: string;                // Optional notes
  lastUpdated: string;
}
```

### Statistics Schema (Multi-Season)
```typescript
interface PlayerStatistics {
  playerId: string;
  playerName: string;
  seasonStats: {
    [seasonId: string]: {
      seasonName: string;
      teamStats: {
        [teamName: string]: {
          totalFixtures: number;       // Total fixtures for team in season
          timesAvailable: number;      // Times marked available
          gamesPlayed: number;         // Times marked selected
          availabilityRate: number;    // (timesAvailable / totalFixtures) * 100
          selectionRate: number;       // (gamesPlayed / timesAvailable) * 100
        };
      };
      clubStats: {
        totalFixtures: number;
        timesAvailable: number;
        gamesPlayed: number;
        availabilityRate: number;
        selectionRate: number;
      };
    };
  };
  careerStats: {
    totalSeasons: number;
    totalFixtures: number;
    totalGamesPlayed: number;
    careerAvailabilityRate: number;
    careerSelectionRate: number;
  };
  lastUpdated: string;
}
```

---

## Storage Strategy

### Netlify Blobs Stores
```
Store: "seasons"
  - Key: "seasons-list" → Season[]
  - Key: "active-season" → Season (current active season)

Store: "fixtures"
  - Key: "fixtures-{seasonId}" → Fixture[] (fixtures for specific season)

Store: "players"
  - Key: "players-all" → Player[] (all players with season history)
  - Key: "players-{seasonId}" → Player[] (players active in specific season)

Store: "fixture-availability"
  - Key: "availability-{fixtureId}" → FixtureAvailability
  - Key: "availability-index-{seasonId}" → { fixtureId, gameNumber, date, team }[]

Store: "player-statistics"
  - Key: "player-stats-{playerId}" → PlayerStatistics (includes all seasons)
  - Key: "team-stats-{teamName}-{seasonId}" → TeamStatisticsSummary
  - Key: "season-stats-{seasonId}" → SeasonStatisticsSummary
```

### CSV Import/Export Format
**players-import.csv** (Season-Specific)
```csv
First Name,Last Name,Email,Phone,Teams,Position,Jersey Number,Role,Status
John,Doe,john@example.com,555-1234,"Bengal Tigers|Bengal Bulls",Batsman,10,Player,Active
Jane,Smith,jane@example.com,555-5678,Bengal Tigers,All-rounder,7,Captain,Active
```

**Validation Rules:**
- Required: First Name, Last Name, Email, Teams, Season (implied - importing to active season)
- Email must be unique within club (not per season)
- Teams must match existing team names for the season
- Jersey number: 1-99, unique per team per season
- Position: Batsman, Bowler, All-rounder, Wicket-keeper
- Role: Player, Captain, Vice Captain
- Multiple teams separated by pipe (|)

---

## File Structure

```
src/
├── pages/admin/
│   ├── seasons.astro              # Season management (list, create, set active)
│   ├── fixtures.astro             # Fixture management per season (list, upload CSV, add/edit)
│   ├── players.astro              # Player management (list, add, edit, delete)
│   ├── players/
│   │   └── import.astro           # CSV import wizard (per season)
│   ├── availability.astro         # Availability tracking per fixture (admin-managed)
│   └── statistics.astro           # Statistics dashboard (multi-season)
├── types/
│   └── player.ts                  # Season, Fixture, Player, FixtureAvailability, Statistics interfaces
└── layouts/
    └── AdminLayout.astro          # UPDATE: Add season, fixtures, & player management links

netlify/functions/
├── seasons-list.ts                # GET: List all seasons
├── seasons-create.ts              # POST: Create new season
├── seasons-update.ts              # PUT: Update season (set active, edit dates)
├── seasons-get-active.ts          # GET: Get currently active season
├── fixtures-list.ts               # GET: List fixtures for season
├── fixtures-create.ts             # POST: Create single fixture
├── fixtures-import.ts             # POST: Bulk import fixtures from CSV (per season)
├── fixtures-update.ts             # PUT: Update fixture details
├── fixtures-delete.ts             # DELETE: Delete fixture(s)
├── fixtures-export.ts             # GET: Export fixtures to CSV (per season)
├── players-list.ts                # GET: List players (filtered by season)
├── players-get.ts                 # GET: Get single player by ID (with full history)
├── players-create.ts              # POST: Create new player (for active season)
├── players-update.ts              # PUT: Update player details
├── players-delete.ts              # DELETE: Delete player from season (keeps history)
├── players-import.ts              # POST: Bulk import from CSV (for specific season)
├── players-export.ts              # GET: Export players to CSV (for specific season)
├── availability-create.ts         # POST: Create availability record for fixture
├── availability-get.ts            # GET: Get availability by fixture ID
├── availability-list.ts           # GET: List availability records (filtered by season/team)
├── availability-update.ts         # POST: Admin updates player availability & selection
├── statistics-calculate.ts        # POST: Recalculate statistics (for season or player)
├── statistics-player-get.ts       # GET: Get player statistics (all seasons + career)
├── statistics-team-get.ts         # GET: Get team statistics (specific season)
├── statistics-season-get.ts       # GET: Get season statistics (all teams)
└── statistics-export.ts           # GET: Export statistics to CSV

docs/
└── guides/
    └── PLAYER_MANAGEMENT_GUIDE.md # Admin user guide (NEW)
```

---

## Implementation Plan

### Phase 1: Foundation (Season Management & Data Models)

**Step 1.1: Create Data Models**
- File: `/src/types/player.ts`
- Define: Season, TeamDefinition, Player, SeasonAssignment, TeamAssignment, FixtureAvailability, PlayerAvailabilityRecord, PlayerStatistics
- Export all interfaces

**Step 1.2: Implement Season Management Functions**
Create Netlify functions for season management:

1. **seasons-list.ts**
   - GET: Returns all seasons (sorted by date, active first)
   - Returns: Season[]

2. **seasons-create.ts**
   - POST with body: `{ name, startDate, endDate, teams }`
   - Validate: Date range, team definitions
   - Generate UUID, set isActive to false initially
   - Returns: Created season

3. **seasons-update.ts**
   - PUT with body: `Partial<Season> & { id: string }`
   - Special handling: Setting isActive=true deactivates other seasons
   - Returns: Updated season

4. **seasons-get-active.ts**
   - GET: Returns currently active season
   - Returns: Season or null

**Step 1.3: Create Season Management Page**
- File: `/src/pages/admin/seasons.astro`
- Features:
  - List all seasons (active season highlighted)
  - Create new season button → Modal form
  - Set Active button per season
  - Edit season details
  - View teams configured for season

**Season Form Modal:**
- Season Name* (e.g., "2025-2026")
- Start Date*, End Date*
- Team Configuration:
  - For each team: Name, Division, Captain (dropdown of players), Vice Captain
  - Use existing 3 teams as default

**Step 1.4: Implement Player CRUD Functions**
Create Netlify functions following existing patterns from `admin-users-*`:

1. **players-list.ts**
   - GET with query params: `?seasonId=xxx&team=Bengal Tigers&status=active&search=john`
   - Filter by season (defaults to active season)
   - Returns: Player[]
   - Pattern: Load from Blobs, filter in memory

2. **players-get.ts**
   - GET with query: `?id=player-123`
   - Returns: Single Player object with full season history

3. **players-create.ts**
   - POST with body: `Omit<Player, 'id' | 'createdAt' | 'updatedAt'> & { seasonId }`
   - Validate: email uniqueness (across all seasons), jersey number per team per season
   - Generate UUID, timestamps
   - Create SeasonAssignment for specified season
   - Returns: Created player

4. **players-update.ts**
   - PUT with body: `Partial<Player> & { id: string, seasonId?: string }`
   - Update player details or add/modify season assignment
   - Returns: Updated player

5. **players-delete.ts**
   - DELETE with body: `{ id: string, seasonId: string } | { ids: string[], seasonId: string }`
   - **Season-specific deletion**: Removes player from specified season roster only
   - Player remains in historical data (other seasons)
   - If player only exists in this season, mark as inactive but keep record
   - Support bulk delete
   - Returns: `{ success: true, deletedCount: number }`

**Step 1.5: Create Player Management Page**
- File: `/src/pages/admin/players.astro`
- Features:
  - **Season selector** dropdown at top (defaults to active season)
  - Stats cards: Total Players, Active, Per Team (for selected season)
  - Search bar (name, email)
  - Filter dropdowns (team, status, position)
  - Table columns: Checkbox, Name, Email, Teams (badges), Position, Jersey #, Status, Actions
  - Bulk actions toolbar: Delete Selected, Export
  - Add Player button → Modal form
  - Import Players button → Link to import wizard
  - Edit/Delete actions per row
  - View player history button → Shows all seasons

**Player Form Modal:**
- First Name*, Last Name*, Email*
- Phone (optional)
- Position dropdown
- **Season**: Display active season (pre-selected)
- Team Assignments for this season (checkboxes with role dropdown and jersey number):
  - [ ] Bengal Tigers - Role: [Player ▼] - Jersey #: [__]
  - [ ] Bengal Bulls - Role: [Player ▼] - Jersey #: [__]
  - [ ] Bengal Thunder Cats - Role: [Player ▼] - Jersey #: [__]
- Status toggle (Active/Inactive in club)

**Step 1.6: Implement Fixture Management Functions**
Create Netlify functions for fixture management per season:

1. **fixtures-list.ts**
   - GET with query: `?seasonId=xxx`
   - Returns: Fixture[] for that season

2. **fixtures-create.ts**
   - POST with body: `Omit<Fixture, 'id' | 'createdAt'> & { seasonId }`
   - Validate: team name matches season teams
   - Returns: Created fixture

3. **fixtures-import.ts**
   - POST with form data: CSV file + seasonId
   - Parse CSV using PapaParse
   - Validate all rows (date, team names, required fields)
   - Bulk create fixtures
   - Returns: `{ created: N, errors: [...] }`

4. **fixtures-update.ts**
   - PUT with body: `Partial<Fixture> & { id: string }`
   - Returns: Updated fixture

5. **fixtures-delete.ts**
   - DELETE with body: `{ id: string } | { ids: string[] }`
   - Returns: `{ success: true, deletedCount: number }`

6. **fixtures-export.ts**
   - GET with query: `?seasonId=xxx`
   - Generate CSV
   - Returns: CSV file

**Step 1.7: Create Fixture Management Page**
- File: `/src/pages/admin/fixtures.astro`
- Features:
  - **Season selector** dropdown (defaults to active season)
  - Stats cards: Total Fixtures, Upcoming, Completed
  - Import Fixtures button → Upload CSV modal
  - Add Fixture button → Manual entry form
  - Fixtures table: Game #, Date, Team, Opponent, Venue, Division, Actions
  - Edit/Delete per fixture
  - Export to CSV button

**Fixture Import/Upload:**
- Upload CSV for selected season
- Preview table with validation errors
- CSV format:
  ```csv
  Game Number,Date,Time,Team,Opponent,Venue,Division
  Game 1,2025-11-10,10:00 AM,Bengal Tigers,Team A,Venue 1,WB-D2
  ```

**Step 1.8: Update AdminLayout Navigation**
- File: `/src/layouts/AdminLayout.astro`
- Add links:
  - Season Management
  - Fixture Management (NEW)
  - Player Management
  - Availability Tracking
  - Statistics
- Use appropriate icons and existing nav pattern

### Phase 2: Import/Export System

**Step 2.1: Implement Import Function**
- File: `/netlify/functions/players-import.ts`
- Parse CSV using PapaParse (already installed)
- Validation logic:
  - Check required fields
  - Validate email format and uniqueness
  - Validate teams against existing teams
  - Validate jersey numbers
- Mode support: 'create' | 'update' | 'upsert'
- Returns: `{ created: N, updated: M, errors: [...] }`

**Step 2.2: Implement Export Function**
- File: `/netlify/functions/players-export.ts`
- Generate CSV from player data
- Content-Type: text/csv
- Download filename: `players-export-YYYY-MM-DD.csv`

**Step 2.3: Create Import Wizard**
- File: `/src/pages/admin/players/import.astro`
- Multi-step process:
  1. **Upload**: Drag-drop zone, download template link
  2. **Validation**: Show preview table with errors highlighted
  3. **Confirmation**: Summary (X new, Y updates, Z errors)
  4. **Results**: Success/error report, link to player list

**Step 2.4: Add Bulk Operations**
- Bulk delete with confirmation
- Bulk status change (activate/deactivate)
- Bulk team assignment

### Phase 3: Availability Tracking (Admin-Managed)

**Step 3.1: Implement Availability Functions**

1. **availability-create.ts**
   - POST: `{ fixtureId, gameNumber, team, seasonId }`
   - Auto-populate players from team roster for this season
   - Initialize all records: wasAvailable=false, wasSelected=false
   - Returns: FixtureAvailability

2. **availability-get.ts**
   - GET: `?fixtureId=123`
   - Returns: Full FixtureAvailability with all player records

3. **availability-list.ts**
   - GET: `?seasonId=xxx&team=Bengal Tigers&dateFrom=2025-11-01`
   - Returns: Availability summaries (with stats: X available, Y selected)

4. **availability-update.ts**
   - POST: `{ fixtureId, updates: [{ playerId, wasAvailable, wasSelected, notes }] }`
   - Admin batch updates player availability and selection
   - Validation: wasSelected can only be true if wasAvailable is true
   - Timestamp updates, record admin username
   - Returns: Updated FixtureAvailability

**Step 3.2: Create Availability Page**
- File: `/src/pages/admin/availability.astro`
- Features:
  - **Season selector** dropdown (defaults to active season)
  - Fixture list (upcoming first, past fixtures below)
  - Filters: team, date range, status (pending/completed)
  - Click fixture → Show availability editor

  **Availability Editor (Two-Column Grid):**
  - Player list from team roster
  - Column 1: "Was Available?" checkbox
  - Column 2: "Was Selected?" checkbox (enabled only if available=true)
  - Notes field per player
  - Quick actions:
    - "Mark All Available" button
    - "Mark All Unavailable" button
  - Save button

  **Stats Display:**
  - Total players in team: X
  - Marked available: Y
  - Selected to play: Z
  - Availability rate: Y/X
  - Selection rate: Z/Y

**Step 3.3: Integrate with Fixtures**
- Add "Manage Availability" button on fixtures page (admin only)
- Link to availability editor for that fixture
- Show availability status badge on fixture cards (e.g., "5/11 available, 3 selected")

### Phase 4: Statistics System (Multi-Season)

**Step 4.1: Implement Statistics Functions**

1. **statistics-calculate.ts**
   - POST: `{ seasonId?, playerId? }` - Optional: recalculate specific season or player
   - Load players, availability records, fixtures
   - Calculate per-player stats (team + season + career levels)
   - Calculate team summaries per season
   - Save to Blobs
   - Returns: `{ success: true, playersUpdated: N, seasonsUpdated: M }`

2. **statistics-player-get.ts**
   - GET: `?playerId=123`
   - Returns: PlayerStatistics (all seasons + career totals)

3. **statistics-team-get.ts**
   - GET: `?teamName=Bengal Tigers&seasonId=xxx`
   - Returns: TeamStatisticsSummary for specific season

4. **statistics-season-get.ts**
   - GET: `?seasonId=xxx`
   - Returns: SeasonStatisticsSummary (all teams aggregated)

5. **statistics-export.ts**
   - GET: `?seasonId=xxx&format=csv`
   - Export statistics to CSV (for specific season or career)

**Statistics Calculation Logic:**
```typescript
For each player:
  For each season assignment:
    For each team in that season:
      - Count total fixtures for that team in season
      - Count times marked wasAvailable = true
      - Count times marked wasSelected = true
      - Calculate availability rate = (timesAvailable / totalFixtures) * 100
      - Calculate selection rate = (gamesPlayed / timesAvailable) * 100

    Season club level:
      - Aggregate across all teams in season
      - Total fixtures (deduplicated by fixture ID)
      - Total times available
      - Total games played
      - Season availability rate
      - Season selection rate

  Career level:
    - Aggregate across all seasons
    - Total seasons played
    - Total fixtures
    - Total games played
    - Career availability rate = (total available / total fixtures) * 100
    - Career selection rate = (total played / total available) * 100
```

**Step 4.2: Create Statistics Dashboard**
- File: `/src/pages/admin/statistics.astro`
- Features:
  - **Season selector** dropdown (or "All Seasons" for career view)
  - **Team selector** dropdown (or "All Teams")
  - View Mode toggle: Season | Career

  **Season View Stats Cards:**
  - Total Players This Season
  - Average Availability Rate
  - Average Selection Rate
  - Total Fixtures This Season
  - High Availability Players (>80%)
  - Low Availability Players (<50%)

  **Career View Stats Cards:**
  - Total Players (All Time)
  - Average Career Availability
  - Average Career Selection Rate
  - Total Seasons
  - Most Consistent Player (highest career availability)

  **Player Statistics Table (Sortable):**
  - Player Name
  - Team(s)
  - Fixtures (Total for season/career)
  - Available (Count + %)
  - Played (Count + %)
  - Selection Rate (%)

  **Actions:**
  - Export to CSV button
  - Recalculate Statistics button
  - Compare Seasons button (future enhancement)

**Step 4.3: Add Stats to Player Page**
- Show mini stats card in player detail modal:
  - Current season: X fixtures, Y played
  - Career: Z total games
- "View Full Statistics" link → Opens statistics dashboard filtered to this player

### Phase 5: Polish & Testing

**Step 5.1: UI/UX Improvements**
- Loading states (spinners, skeleton loaders)
- Toast notifications for actions
- Empty states with helpful messages
- Mobile responsive design
- Keyboard shortcuts (optional)

**Step 5.2: Validation & Error Handling**
- Client-side validation with helpful messages
- Server-side validation in all functions
- Graceful error handling with user-friendly messages
- Prevent duplicate emails
- Jersey number uniqueness per team

**Step 5.3: Documentation**
- Create `/docs/guides/PLAYER_MANAGEMENT_GUIDE.md`
- Include CSV import template
- Document availability tracking workflow
- Admin screenshots and instructions

---

## UI Patterns & Styling

### Reuse Existing Patterns

**From `/admin/index.astro`:**
- Table structure with checkboxes
- Bulk actions toolbar
- Search input with icon
- Modal overlays
- Loading/error/empty states
- Stats cards grid
- Page header with blue gradient (white text)

**From `/admin/users.astro`:**
- Form layouts
- Alert messages (success/error)
- Add/create forms in cards

### Team Color Coding
```typescript
const teamColors = {
  'Bengal Tigers': 'bg-orange-100 border-orange-300 text-orange-800',
  'Bengal Bulls': 'bg-blue-100 border-blue-300 text-blue-800',
  'Bengal Thunder Cats': 'bg-purple-100 border-purple-300 text-purple-800'
};
```

### Availability Status Colors
```typescript
const availabilityColors = {
  available: 'bg-green-100 text-green-800 border-green-300',
  notAvailable: 'bg-gray-100 text-gray-600 border-gray-300',
  selected: 'bg-blue-100 text-blue-800 border-blue-300' // Played in game
};
```

### Season Badge Styling
```typescript
const seasonBadgeColors = {
  active: 'bg-green-500 text-white',
  inactive: 'bg-gray-300 text-gray-700'
};
```

---

## Data Flow Diagrams

### Season Creation Flow
```
Admin → Create Season Form → Fill Details (Name, Dates, Teams)
  ↓
POST /api/seasons-create
  ↓
Function:
  - Validate session
  - Validate date range
  - Generate UUID
  - Load seasons from Blobs
  - Append new season (isActive=false)
  - Save to Blobs
  ↓
UI Update → Success Message
  ↓
Admin can then "Set Active" to activate season
```

### Player Creation Flow (Season-Based)
```
Admin → Fill Form → Validate (for active season)
  ↓
POST /api/players-create
  ↓
Function:
  - Validate session
  - Get active season
  - Validate data (email unique globally, jersey # per team per season)
  - Generate UUID
  - Create SeasonAssignment for active season
  - Load players from Blobs
  - Append new player
  - Save to Blobs (both players-all and players-{seasonId})
  ↓
UI Update → Success Message
```

### Availability Update Flow (Admin-Managed)
```
Admin → Select Fixture → Load Availability Editor
  ↓
GET /api/availability-get?fixtureId=X
  ↓
Display Team Players in Grid:
  - Column 1: "Was Available?" checkboxes
  - Column 2: "Was Selected?" checkboxes (enabled only if available)
  ↓
Admin marks availability and selection for each player
  ↓
POST /api/availability-update
  ↓
Function:
  - Validate session
  - Load FixtureAvailability from Blobs
  - Validate: wasSelected requires wasAvailable=true
  - Update PlayerAvailabilityRecord[] with timestamps
  - Record admin username in updatedBy
  - Save to Blobs
  ↓
UI Update → Success Message
  ↓
Stats recalculate (triggered manually or automatically)
```

### CSV Import Flow
```
Admin → Upload CSV → Parse (PapaParse)
  ↓
Validate Rows:
  - Required fields
  - Email format
  - Teams exist
  - Jersey numbers
  ↓
Show Preview (errors highlighted)
  ↓
Admin Confirms
  ↓
POST /api/players-import
  ↓
Function:
  - Validate session
  - Load existing players
  - For each row: create or update
  - Batch save to Blobs
  ↓
Return Summary (X created, Y updated, Z errors)
  ↓
Show Results Page
```

---

## Security Considerations

### Authentication
- All functions validate admin session using existing `validateAdminSession()`
- Reuse JWT + cookie pattern
- No public access to player management

### Data Validation
- Email format validation
- Sanitize all inputs
- Jersey number validation per team
- Team name validation against existing teams

### Access Control
- Admin-only access
- Audit trail: createdBy, updatedBy fields
- Consider soft delete (mark inactive instead of hard delete)

### Privacy
- Don't expose player emails publicly
- Phone numbers optional
- Secure export functionality (admin-only)

### Rate Limiting
- CSV import: Max 1000 rows
- Bulk delete: Max 100 players at once

---

## Testing Strategy

### Manual Testing Checklist

**Season Management:**
- [ ] Create new season
- [ ] Edit season details
- [ ] Set season as active (deactivates others)
- [ ] View all seasons
- [ ] Configure teams for season
- [ ] Validate date ranges

**Player Management (Season-Based):**
- [ ] Add new player to active season
- [ ] Edit existing player
- [ ] Add player to new season (existing player)
- [ ] Delete single player
- [ ] Bulk delete players
- [ ] Search players across seasons
- [ ] Filter by season, team, status, position
- [ ] Validate email uniqueness (global)
- [ ] Validate jersey number per team per season
- [ ] View team badges with season context
- [ ] View player season history
- [ ] Active/inactive toggle

**Import/Export:**
- [ ] Download import template
- [ ] Import valid CSV to active season
- [ ] Import CSV with errors (validate preview)
- [ ] Export players to CSV (for specific season)
- [ ] Handle duplicate emails
- [ ] Handle jersey number conflicts

**Availability (Admin-Managed):**
- [ ] Create availability record for fixture
- [ ] View player list for team (from season roster)
- [ ] Mark players as available
- [ ] Mark available players as selected
- [ ] Verify cannot select unavailable players
- [ ] Add notes to player records
- [ ] View availability statistics (X available, Y selected)
- [ ] Filter fixtures by season/team/date
- [ ] Save and persist changes

**Statistics:**
- [ ] View player statistics (single season)
- [ ] View player career statistics (all seasons)
- [ ] View team statistics (specific season)
- [ ] View season statistics (all teams)
- [ ] Sort by availability rate
- [ ] Sort by selection rate
- [ ] Switch between season and career views
- [ ] Export statistics to CSV
- [ ] Recalculate statistics
- [ ] Verify calculations (spot check)
- [ ] Verify career aggregations correct

**Error Handling:**
- [ ] Session expired
- [ ] Network error
- [ ] Invalid data submission
- [ ] Missing required fields
- [ ] Blob storage failure
- [ ] Invalid season selection
- [ ] Attempting to select unavailable player

---

## Critical Files

### To Create (Priority Order)

1. **`/src/types/player.ts`**
   - All TypeScript interfaces (Season, Fixture, Player, FixtureAvailability, Statistics)
   - Foundation for entire system

2. **`/netlify/functions/seasons-list.ts`**
   - List all seasons
   - Required first to set up seasons

3. **`/netlify/functions/seasons-create.ts`**
   - Create new seasons
   - Core setup function

4. **`/src/pages/admin/seasons.astro`**
   - Season management UI
   - Must be created before fixture/player management

5. **`/netlify/functions/fixtures-list.ts`**
   - List fixtures for season
   - Required before availability tracking

6. **`/netlify/functions/fixtures-import.ts`**
   - Bulk import fixtures from CSV (per season)
   - CSV parsing with validation

7. **`/src/pages/admin/fixtures.astro`**
   - Fixture management UI (upload CSV, add/edit fixtures)
   - Must be created before availability tracking

8. **`/netlify/functions/players-list.ts`**
   - List players (filtered by season)
   - Most frequently called function

9. **`/netlify/functions/players-create.ts`**
   - Create new players (for active season)
   - Validation logic with season context

10. **`/src/pages/admin/players.astro`**
    - Main player management UI (with season selector)
    - Follows pattern from `/admin/index.astro`

11. **`/netlify/functions/players-import.ts`**
    - Bulk import feature (per season)
    - CSV parsing and validation

12. **`/src/pages/admin/players/import.astro`**
    - Import wizard UI
    - Multi-step process

13. **`/src/pages/admin/availability.astro`**
    - Admin-managed availability tracking interface
    - Two-column grid (available/selected)

14. **`/netlify/functions/availability-update.ts`**
    - Update availability and selection records
    - Core availability feature

15. **`/netlify/functions/statistics-calculate.ts`**
    - Statistics calculation logic (multi-season)
    - Complex aggregations

16. **`/src/pages/admin/statistics.astro`**
    - Statistics dashboard (season/career views)
    - Data visualization

### Files to Reference

- `/src/pages/admin/index.astro` - Table UI, bulk operations, modals
- `/netlify/functions/update-submission.ts` - Blobs CRUD pattern
- `/src/pages/fixtures.astro` - CSV parsing pattern
- `/src/middleware/auth.ts` - Authentication patterns
- `/src/layouts/AdminLayout.astro` - Navigation structure

---

## Future Enhancements (Phase 6+)

### Advanced Features
1. **Email Notifications**
   - Send availability poll reminders
   - Notify players of upcoming fixtures
   - Team announcements

2. **Player Portal** (Public-Facing)
   - Players update their own availability
   - Personal statistics dashboard
   - Team calendar view
   - No admin access required

3. **Advanced Statistics**
   - Charts and graphs (Chart.js or similar)
   - Historical trends
   - Performance metrics (if match results tracked)
   - Season comparisons

4. **Mobile App/PWA**
   - Native mobile experience
   - Push notifications
   - Offline capability

5. **Match Result Tracking**
   - Record match results
   - Link to player statistics
   - Win/loss records per team
   - Individual performance tracking

6. **Photo Management**
   - Player profile photos
   - Team photos
   - Gallery integration

---

## Summary

This plan implements a complete season-based player management system with:

**Core Features:**
- 🗓️ **Season Management**: Create and manage cricket seasons, track roster changes across seasons
- 👥 **Player Pool Management**: Add, edit, delete, bulk import players (per season)
- 🏏 **Team Roster Assignments**: Multiple teams per player per season, with historical tracking
- ✅ **Admin-Managed Availability**: Admin marks player availability AND selection for each fixture
- 📈 **Multi-Season Statistics**: Track performance across seasons with availability/selection rates
- 📊 **Career Statistics**: Aggregate player stats across entire career
- 📁 **CSV Import/Export**: Bulk operations with season context
- 🔍 **Advanced Filtering**: Search, filter by season/team/status, bulk operations

**Key Differences from Original Plan:**
- ❌ **No player polling**: Admin controls all availability marking (not players)
- ✅ **Season-based rosters**: Teams and players organized by season
- ✅ **Flexible teams per season**: Team names/divisions can change between seasons
- ✅ **Admin fixture management**: Upload/manage fixtures per season (not single CSV)
- ✅ **Season-specific deletion**: Remove players from season (keeps historical data)
- ✅ **Two-step tracking**: Availability → Selection (both admin-managed)
- ✅ **Multi-season history**: Players can participate in multiple seasons
- ✅ **Selection rate metric**: Track how often available players get selected

**Technical Approach:**
- **Storage**: Netlify Blobs (seasons, players, fixture-availability, statistics)
- **Backend**: Netlify Functions (following existing patterns)
- **Frontend**: Astro pages with season-aware UI
- **Auth**: Existing JWT session system
- **CSV Parsing**: PapaParse (already installed)

**Integration:**
- Leverages existing admin infrastructure
- Links to fixture system
- Season-aware navigation throughout
- Follows established design patterns
- Maintains team color coding and branding

**Estimated Timeline:** 5-6 weeks part-time development
- Phase 1 (Season & Fixture Management + Foundation): 2 weeks
- Phase 2 (Import/Export for Players & Fixtures): 4-5 days
- Phase 3 (Admin-Managed Availability): 1 week
- Phase 4 (Multi-Season Statistics): 5-6 days
- Phase 5 (Polish & Testing): 4-5 days
