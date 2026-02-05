# Player Management System - Admin User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Season Management](#season-management)
3. [Fixture Management](#fixture-management)
4. [Player Management](#player-management)
5. [Core Roster Management](#core-roster-management)
6. [Availability Tracking](#availability-tracking)
7. [Statistics Dashboard](#statistics-dashboard)
8. [CSV Import/Export](#csv-importexport)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The Player Management System for Bengals Cricket Club provides comprehensive tools for managing your cricket club's operations. This system allows you to:

- Manage multiple cricket seasons
- Track team fixtures and schedules
- Maintain a global player pool
- Assign players to team rosters
- Track player availability for matches
- Generate detailed statistics and reports

### Key Concepts

- **Global Player Pool**: All players exist in a single database, not tied to specific seasons
- **Core Roster**: Players can be marked as "core" to one or multiple teams per season
- **Availability Tracking**: Admin-managed system to track who was available and who played
- **Multi-Season Statistics**: Track player performance across multiple seasons

---

## Season Management

### Creating a New Season

1. Navigate to **Admin Panel → Season Management**
2. Click the **"Create Season"** button
3. Fill in the season details:
   - **Season Name**: e.g., "2025-2026"
   - **Start Date**: Season start date
   - **End Date**: Season end date
   - **Team Configuration**: For each team, specify:
     - Team Name (e.g., "Bengal Tigers")
     - Division (e.g., "WB-D2")
     - Captain (optional)
     - Vice Captain (optional)

4. Click **"Save"**

### Setting the Active Season

- Only one season can be active at a time
- The active season is used as the default for all operations
- To set a season as active:
  1. Find the season in the list
  2. Click **"Set Active"**
  3. The previously active season will be automatically deactivated

### Editing Season Details

1. Click the **"Edit"** button next to the season
2. Update the details as needed
3. Save your changes

**Note**: Be careful when editing season dates if fixtures and availability data already exist.

---

## Fixture Management

### Adding a Single Fixture

1. Navigate to **Admin Panel → Fixture Management**
2. Select the season from the dropdown
3. Click **"Add Fixture"**
4. Fill in the fixture details:
   - **Game Number**: e.g., "Game 1"
   - **Date**: Match date
   - **Time**: Match time
   - **Team**: Select from season's teams
   - **Opponent**: Opposing team name
   - **Venue**: Match location
   - **Division**: League division

5. Click **"Save"**

### Importing Fixtures from CSV

1. Navigate to **Admin Panel → Fixture Management**
2. Select the season
3. Click **"Import Fixtures"**
4. Download the CSV template (if needed)
5. Prepare your CSV file with the following columns:

```csv
Game Number,Date,Time,Team,Opponent,Venue,Division
Game 1,2025-11-10,10:00 AM,Bengal Tigers,Team A,Stadium 1,WB-D2
Game 2,2025-11-17,02:00 PM,Bengal Bulls,Team B,Stadium 2,WB-D3
```

6. Upload the CSV file
7. Review the validation results
8. Confirm the import

**CSV Requirements**:
- All fields are required
- Date format: YYYY-MM-DD
- Team names must match season's team names
- Maximum 1000 fixtures per import

### Exporting Fixtures

1. Navigate to **Fixture Management**
2. Select the season
3. Click **"Export to CSV"**
4. The CSV file will download automatically

### Managing Availability from Fixtures

- Each fixture row has a **"Manage Availability"** icon
- Click it to go directly to the availability tracking page for that fixture
- See [Availability Tracking](#availability-tracking) for details

---

## Player Management

### Adding a New Player

1. Navigate to **Admin Panel → Player Management**
2. Click **"Add Player"**
3. Fill in the player details:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required, must be unique)
   - **USAC ID** (required, must be unique)
   - **Role**: Batsman, Bowler, All-rounder, or Wicket-keeper
   - **Active Status**: Toggle on/off

4. Click **"Add Player"**

**Note**: Players are added to the global pool. To assign them to teams, use Core Roster Management.

### Editing Player Details

1. Find the player in the list (use search/filters)
2. Click the **"Edit"** icon
3. Update the details
4. Click **"Update Player"**

### Deleting Players (Soft Delete)

1. Select players using checkboxes (single or multiple)
2. Click **"Delete Selected"** or click the delete icon for a single player
3. Confirm the deletion

**Important**: Players are never permanently deleted. They are marked as "Inactive" and remain in the system for historical records.

### Searching and Filtering Players

- **Search Bar**: Search by name, email, or USAC ID
- **Status Filter**: Active or Inactive players
- **Role Filter**: Filter by player role

### Bulk Operations

#### Importing Players from CSV

1. Navigate to **Player Management**
2. Click **"Import Players"**
3. Download the CSV template:

```csv
First Name,Last Name,Email,USAC ID,Role,Status
John,Doe,john@example.com,USAC12345,Batsman,Active
Jane,Smith,jane@example.com,USAC67890,All-rounder,Active
```

4. Choose import mode:
   - **Create**: Only add new players (error if player exists)
   - **Update**: Only update existing players (skip new players)
   - **Upsert**: Create new or update existing (smart mode)

5. Upload your CSV file
6. Review validation results
7. Confirm the import

**CSV Requirements**:
- All fields except Status are required
- Email must be unique across all players
- USAC ID must be unique across all players
- Role must be: Batsman, Bowler, All-rounder, or Wicket-keeper
- Status can be: Active or Inactive (defaults to Active)
- Maximum 1000 players per import

#### Exporting Players to CSV

1. Apply any filters (status, role)
2. Click **"Export"** in the bulk actions toolbar
3. The CSV will download with the current filters applied

#### Changing Player Status (Bulk)

1. Select players using checkboxes
2. Click **"Change Status"**
3. Choose to activate or deactivate
4. Confirm the action

---

## Core Roster Management

### Overview

Core Roster Management allows you to assign players to teams for a specific season. Players can be "core" to multiple teams (e.g., playing in different formats).

### Marking Players as Core

1. Navigate to **Admin Panel → Team Roster**
2. Select the **Season** from the dropdown
3. Select the **Team** from the dropdown
4. All players in the global pool will be displayed
5. Check the boxes next to players you want to mark as core
6. Click **"Save Changes"**

### Quick Actions

- **Select All**: Mark all players as core
- **Deselect All**: Unmark all players

### Visual Indicators

- Players with a green background are currently core to the selected team
- Players with a yellow background have pending changes (not yet saved)

### Best Practices

- Mark players as core at the beginning of each season
- Players can be core to multiple teams in the same season
- Update core status as players join or leave teams during the season

---

## Availability Tracking

### Overview

The Availability Tracking system allows admins to record:
1. Which players were **available** for each fixture
2. Which available players were **selected** to play

This is an **admin-managed** system (players do not update their own availability).

### Creating an Availability Record

1. Navigate to **Admin Panel → Availability Tracking**
2. Select the season
3. Find the fixture in the list
4. Click on the fixture card

**Note**: If no availability record exists, it will be created automatically with all core players from the team.

### Marking Availability and Selection

The availability editor shows a table with all core players for the team:

| Player | Was Available? | Was Selected? | Notes |
|--------|---------------|---------------|-------|
| John Doe | ☐ | ☐ | |
| Jane Smith | ☐ | ☐ | |

1. **Check "Was Available?"** for players who were available for the match
2. **Check "Was Selected?"** for players who actually played
   - This checkbox is only enabled if "Was Available?" is checked
3. Add optional **Notes** for each player
4. Use quick actions:
   - **Mark All Available**: Check all players as available
   - **Mark All Unavailable**: Uncheck all players

5. Click **"Save Changes"**

### Validation Rules

- A player can only be marked as "Selected" if they were also marked as "Available"
- The system enforces this rule both in the UI and on the server

### Viewing Statistics

The editor displays real-time statistics:
- **Total Players**: Number of core players in the team
- **Available**: Count of players marked available
- **Selected**: Count of players marked selected
- **Availability Rate**: (Available / Total) × 100%

### Filtering Fixtures

- **Team Filter**: Show fixtures for a specific team
- **Date Range**: Filter by date range
- **Status**: Show only fixtures with data or without data

---

## Statistics Dashboard

### Overview

The Statistics Dashboard provides comprehensive analytics on player availability and performance across seasons.

### View Modes

#### Season View

Shows statistics for a specific season:
1. Select a season from the dropdown
2. Optionally select a team (or "All Teams")
3. View season-specific statistics

#### Career View

Shows career statistics across all seasons:
1. Click **"Career View"**
2. Season and team filters are disabled
3. View cumulative career statistics

### Statistics Table

The table displays:
- **Player Name**: Click to sort alphabetically
- **Team(s)**: Teams the player is core to
- **Fixtures**: Total fixtures for the team/season
- **Available**: Number of times marked available (count)
- **Played**: Number of times marked selected (count)
- **Availability %**: (Available / Fixtures) × 100
- **Selection %**: (Played / Available) × 100

**Color Coding**:
- 🟢 Green (≥80%): High availability/selection
- 🟡 Yellow (50-79%): Medium availability/selection
- 🔴 Red (<50%): Low availability/selection

### Sorting Statistics

- Click any column header to sort
- Click again to reverse sort direction
- Default sort: Player Name (A-Z)

### Statistics Cards

The dashboard shows summary cards:
- **Total Players**: Number of players in the filtered view
- **Total Fixtures**: Maximum fixtures across all players
- **Avg Availability**: Average availability rate
- **Avg Selection Rate**: Average selection rate

### Recalculating Statistics

Statistics are not calculated automatically. To update statistics:
1. Click **"Recalculate"**
2. Confirm the action
3. Wait for the calculation to complete
4. Statistics will refresh automatically

**When to recalculate**:
- After updating availability records
- After marking players as core/non-core
- When statistics seem outdated

### Exporting Statistics

1. Apply filters (season, team)
2. Click **"Export CSV"**
3. The CSV file will download with the filtered data

The exported CSV includes:
- Player Name
- Team
- Total Fixtures
- Times Available
- Games Played
- Availability Rate (%)
- Selection Rate (%)

---

## CSV Import/Export

### CSV Templates

All CSV templates follow these guidelines:
- **Header Row**: Required, exact column names
- **Encoding**: UTF-8
- **Line Endings**: Windows (CRLF) or Unix (LF)
- **Quotes**: Use quotes for fields containing commas or newlines

### Players Import Template

```csv
First Name,Last Name,Email,USAC ID,Role,Status
John,Doe,john.doe@example.com,USAC12345,Batsman,Active
Jane,Smith,jane.smith@example.com,USAC67890,All-rounder,Active
Mike,Johnson,mike.j@example.com,USAC11111,Bowler,Active
Sarah,Williams,sarah.w@example.com,USAC22222,Wicket-keeper,Inactive
```

**Field Descriptions**:
- **First Name**: Player's first name (required)
- **Last Name**: Player's last name (required)
- **Email**: Unique email address (required)
- **USAC ID**: Unique USAC identifier (required)
- **Role**: One of: Batsman, Bowler, All-rounder, Wicket-keeper (required)
- **Status**: Active or Inactive (optional, defaults to Active)

### Fixtures Import Template

```csv
Game Number,Date,Time,Team,Opponent,Venue,Division
Game 1,2025-11-10,10:00 AM,Bengal Tigers,Thunder CC,Stadium 1,WB-D2
Game 2,2025-11-17,02:00 PM,Bengal Bulls,Lightning CC,Stadium 2,WB-D3
Game 3,2025-11-24,04:30 PM,Bengal Thunder Cats,Storm CC,Stadium 3,PB-D1
```

**Field Descriptions**:
- **Game Number**: Identifier like "Game 1", "Game 2" (required)
- **Date**: Match date in YYYY-MM-DD format (required)
- **Time**: Match time (required)
- **Team**: Team name from season's teams (required)
- **Opponent**: Opposing team name (required)
- **Venue**: Match location (required)
- **Division**: League division (required)

### Import Validation

The system validates:
- ✅ Required fields are not empty
- ✅ Email format is valid
- ✅ Email is unique (for players)
- ✅ USAC ID is unique (for players)
- ✅ Role is one of the allowed values
- ✅ Team names match season's teams (for fixtures)
- ✅ Date format is valid

### Handling Import Errors

If validation fails:
1. Review the error report
2. Fix the errors in your CSV file
3. Re-upload the corrected file

**Common Errors**:
- **Missing required field**: Fill in all required columns
- **Invalid email format**: Use a valid email address
- **Duplicate email**: Check for duplicate emails in your CSV
- **Invalid role**: Use exact role names (case-sensitive)
- **Team not found**: Verify team names match season configuration

---

## Troubleshooting

### Common Issues

#### Issue: "No active season found"

**Solution**:
1. Navigate to Season Management
2. Create a season if none exist
3. Set a season as active

#### Issue: Import fails with "Email already exists"

**Solution**:
- Use "Update" or "Upsert" mode instead of "Create" mode
- Or remove duplicate emails from your CSV

#### Issue: Cannot mark player as selected

**Solution**:
- First mark the player as "Available"
- Then mark them as "Selected"
- This validation prevents data inconsistency

#### Issue: Statistics show zero or incorrect values

**Solution**:
1. Click "Recalculate" on the Statistics page
2. Ensure availability records are complete
3. Verify players are marked as core to teams

#### Issue: Player not showing in availability editor

**Solution**:
- Verify the player is marked as core to the team for this season
- Go to Team Roster Management and add the player

#### Issue: CSV import validation errors

**Solution**:
- Download the template and compare formats
- Check for hidden characters or encoding issues
- Ensure column names match exactly (case-sensitive)

### Data Recovery

All player deletions are **soft deletes**:
- Players are marked as "Inactive" but not removed
- To recover: Edit the player and set status to "Active"

### Best Practices

1. **Regular Backups**: Export player and fixture data regularly
2. **Validate Before Import**: Review CSV files before importing
3. **Test with Small Data**: Test imports with 1-2 rows first
4. **Recalculate Statistics**: Update statistics after availability changes
5. **Document Decisions**: Use notes fields in availability tracking
6. **Season Transitions**: Mark players as core at season start
7. **Check Permissions**: Ensure only admins access the admin panel

### Performance Tips

- **Large Imports**: Break CSV files into batches of 500 rows
- **Statistics Calculation**: Can take 30-60 seconds for large datasets
- **Browser Performance**: Use modern browsers (Chrome, Firefox, Edge)
- **Clear Cache**: Clear browser cache if UI behaves unexpectedly

### Getting Help

If you encounter issues not covered in this guide:

1. Check browser console for error messages (F12 → Console)
2. Note the exact error message and steps to reproduce
3. Document any data that caused the issue
4. Contact technical support with:
   - Browser type and version
   - Steps to reproduce the issue
   - Screenshots if applicable
   - Error messages from console

---

## Appendix: Keyboard Shortcuts

*Optional feature - to be implemented*

- **Ctrl/Cmd + S**: Save form
- **Ctrl/Cmd + K**: Quick search
- **Esc**: Close modal

---

## Appendix: Glossary

- **Core Player**: A player assigned to a team's roster for a season
- **Global Pool**: All players in the system, regardless of team
- **Soft Delete**: Marking a record as inactive instead of permanently deleting
- **USAC ID**: USA Cricket unique identifier for players
- **Availability Rate**: Percentage of fixtures a player was available for
- **Selection Rate**: Percentage of available opportunities a player was selected
- **Upsert**: Create if doesn't exist, update if exists

---

## Document Version

- **Version**: 1.0
- **Last Updated**: February 2026
- **System Version**: Player Management System v1.0

---

**End of Guide**
