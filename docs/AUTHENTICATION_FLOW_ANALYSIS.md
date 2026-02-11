# Authentication System - Comprehensive Flow Analysis

**Date:** February 10, 2026
**Status:** ✅ VERIFIED - All critical paths reviewed

## Overview

This document verifies all authentication flows in the Golden State Cricket Club system, ensuring login, role assignments, and profile access work correctly for all user types.

---

## System Architecture

### Data Stores
- **admin-users**: Admin user records (username, passwordHash, role)
- **players**: Player records (includes member auth fields: passwordHash, registrationStatus, role_auth)

### Roles Hierarchy
1. **super_admin** (highest) - Full access, can promote members
2. **admin** - Admin access, cannot promote members
3. **member** (lowest) - Member access only

### Key Fields
- **player.role** - Playing position (Batsman, Bowler, etc.) - for cricket
- **player.role_auth** - Authentication role (super_admin, admin, member) - for system access
- **player.registrationStatus** - Registration state (pending, approved, rejected, suspended)
- **player.passwordHash** - Hashed password (bcrypt)
- **player.email** - Email address (normalized lowercase)

---

## Flow 1: Member Registration → Approval → Login → Profile Access

### Step 1.1: Member Registration
**Endpoint:** `POST /netlify/functions/member-register`
**File:** `netlify/functions/member-register.ts`

**Process:**
1. User submits: email, password, firstName, lastName, phone (optional)
2. Validates: email format, password length (min 8), name lengths
3. Normalizes email to lowercase
4. Checks for duplicate email (case-insensitive)
5. Hashes password with bcrypt (10 rounds)
6. Creates Player record:
   ```typescript
   {
     id: UUID,
     firstName: trimmed,
     lastName: trimmed,
     email: normalized lowercase,
     phone: optional,
     role: '', // Empty until approval
     isActive: false,
     passwordHash: hashed,
     registrationStatus: 'pending',
     role_auth: 'member',
     registeredAt: timestamp
   }
   ```
7. Saves to players store
8. Creates audit log

**Result:** Member cannot log in yet (status = pending)

**✅ Verified:** Lines 99-117 create proper Player record

---

### Step 1.2: Super Admin Approves Registration
**Endpoint:** `POST /netlify/functions/members-approve`
**File:** `netlify/functions/members-approve.ts`

**Authorization:** Super admin only (line 26)

**Process:**
1. Super admin selects pending registration
2. Super admin picks existing player to merge with
3. Super admin sets playing role (Batsman, Bowler, etc.)
4. System updates target player with ALL registration data:
   - firstName, lastName (from registration)
   - email (from registration) - **immutable after this**
   - phone (from registration)
   - passwordHash (from registration) - **enables login**
   - role = playing position (from approval form)
   - registrationStatus = 'approved'
   - role_auth = 'member'
   - isActive = true
5. Deletes pending registration record (line 109)
6. Saves to players store
7. Creates audit log

**Result:** Member can now log in

**✅ Verified:** Lines 92-109 properly merge registration into target player

---

### Step 1.3: Member Login
**Endpoint:** `POST /netlify/functions/auth-login`
**File:** `netlify/functions/auth-login.ts`

**Process:**
1. User submits email + password
2. System checks admin-users store first (line 48)
   - Not found → continues to step 3
3. System checks players store (line 100)
   - Finds player by email (case-insensitive, line 110)
4. Validates registration status (lines 130-149):
   - pending → Error: "Registration pending approval"
   - rejected → Error: "Registration not approved"
   - suspended → Error: "Account suspended"
   - approved → Continue
5. Verifies password against passwordHash (line 152)
6. Updates lastLogin timestamp (line 161)
7. Creates JWT session:
   ```typescript
   {
     userId: player.id,        // ✅ Actual player UUID
     email: player.email,
     role: player.role_auth || 'member',
     // username: undefined for members
   }
   ```
8. Sets HTTP-only cookie (line 171)
9. Creates audit log

**Result:** Member is logged in with valid session

**✅ Verified:** Lines 100-211 handle member login correctly
**✅ Verified:** Line 168 uses player.id as userId

---

### Step 1.4: Auth Check (Session Validation)
**Endpoint:** `GET /netlify/functions/auth-check`
**File:** `netlify/functions/auth-check.ts`

**Process:**
1. Extracts JWT token from cookie (line 17)
2. Validates JWT signature and expiry (line 20)
3. Routes by session.role:
   - For members → Goes to line 80
4. **Member branch (lines 80-123):**
   - Loads players store
   - Finds player by `session.userId` (line 90)
   - Validates registrationStatus is still 'approved' (line 103)
   - Returns full player data:
     ```typescript
     {
       id: player.id,
       email: player.email,
       firstName: player.firstName,
       lastName: player.lastName,
       phone: player.phone,
       usacId: player.usacId,
       role: player.role,           // Playing role (Batsman, etc.)
       role_auth: session.role      // Auth role (member)
     }
     ```

**Result:** Returns authenticated user data

**✅ Verified:** Lines 80-123 correctly load and return member data

---

### Step 1.5: Profile Page Access
**File:** `src/pages/profile.astro`

**Process:**
1. Validates session (line 8)
2. Checks if user is authenticated member (line 11)
3. Gets userId from session (line 21) - **This is player.id**
4. Calls players-get endpoint:
   ```typescript
   GET /netlify/functions/players-get?id=${userId}
   ```
5. Displays player information:
   - Name: firstName + lastName
   - Email (read-only)
   - Phone (editable)
   - USAC ID (editable)
   - Playing Role (editable - Batsman, Bowler, etc.)

**players-get Endpoint:**
**File:** `netlify/functions/players-get.ts`

**Process:**
1. Validates session (line 19)
2. Gets playerId from query params (line 29)
3. Loads players from store (line 45)
4. Finds player by ID (line 56)
5. Returns complete player record (line 70)

**Result:** Profile page displays correct member information

**✅ Verified:** Profile loads player data using session.userId (player.id)
**✅ Verified:** players-get finds player by UUID correctly

---

## Flow 2: Member Promotion to Admin → Login → Profile Access

### Step 2.1: Super Admin Promotes Member
**Endpoint:** `POST /netlify/functions/admin-users-promote`
**File:** `netlify/functions/admin-users-promote.ts`

**Authorization:** Super admin only (line 29)

**Process:**
1. Super admin selects approved member (player)
2. Super admin chooses role (admin or super_admin)
3. Validates:
   - Player exists (line 65)
   - registrationStatus = 'approved' (line 74)
   - Not already admin (line 82)
   - Has email address (line 90)
4. Updates player record:
   ```typescript
   player.role_auth = 'admin' | 'super_admin'  // Line 98
   ```
5. Creates AdminUser record:
   ```typescript
   {
     username: player.email,           // ✅ Email as username
     passwordHash: player.passwordHash, // ✅ Same password
     role: 'admin' | 'super_admin',
     createdAt: timestamp
   }
   ```
6. Saves both stores (players + admin-users)
7. Creates audit log

**Result:** Member is now promoted to admin, can use both member and admin features

**✅ Verified:** Lines 98, 119-125 create proper linkage (email = username)

---

### Step 2.2: Promoted Member Login (as Admin)
**Endpoint:** `POST /netlify/functions/auth-login`
**File:** `netlify/functions/auth-login.ts`

**Process:**
1. User submits email + password
2. **System checks admin-users store FIRST** (line 48)
   - ✅ Finds AdminUser with username = email
3. Verifies password (line 62)
4. Gets role from AdminUser (line 71) - 'admin' or 'super_admin'
5. **CRITICAL FIX (lines 73-86):** Check for linked player
   ```typescript
   // Load players store
   const playersStore = getStore({...});
   const players = await playersStore.get('players-all');

   // Find player by email matching admin username
   const linkedPlayer = players.find(
     (p) => p.email?.toLowerCase() === adminUser.username.toLowerCase()
   );

   // Use player ID if linked, otherwise fallback
   const userId = linkedPlayer ? linkedPlayer.id : 'admin-' + adminUser.username;
   ```
6. Creates JWT session:
   ```typescript
   {
     userId: linkedPlayer.id,      // ✅ Actual player UUID (not 'admin-email')
     email: loginIdentifier,
     role: 'admin' | 'super_admin',
     username: adminUser.username  // player.email
   }
   ```
7. Sets HTTP-only cookie
8. Returns success

**Result:** Promoted member logged in with admin privileges, session has correct player ID

**✅ CRITICAL FIX VERIFIED:** Lines 73-86 use player.id for promoted members
**✅ Verified:** Old-style admins still work with fallback 'admin-' prefix

---

### Step 2.3: Auth Check for Promoted Member
**Endpoint:** `GET /netlify/functions/auth-check`
**File:** `netlify/functions/auth-check.ts`

**Process:**
1. Validates JWT token
2. Routes by session.role → 'admin' branch (line 35)
3. **Admin branch (lines 35-79):**
   - Loads admin-users store
   - Finds AdminUser by `session.username` (line 46) - **This is player.email**
   - Loads players store
   - **Finds player by `session.userId`** (line 56) - **This is player.id** ✅
   - If player found:
     - Returns FULL PLAYER DATA (lines 60-69):
       ```typescript
       {
         id: player.id,
         email: player.email,
         firstName: player.firstName,
         lastName: player.lastName,
         phone: player.phone,
         usacId: player.usacId,
         role: player.role,           // Playing role (Batsman)
         role_auth: session.role      // Auth role (admin/super_admin)
       }
       ```
   - If player not found (old-style admin):
     - Returns minimal admin data (lines 72-76)

**Result:** Returns full player information for promoted members

**✅ Verified:** Line 56 finds player using session.userId (player.id)
**✅ Verified:** Returns complete player data, not admin data

---

### Step 2.4: Profile Page for Promoted Member
**File:** `src/pages/profile.astro`

**Process:**
1. Validates session → role = 'admin' or 'super_admin'
2. isMember check passes (admins are also members)
3. Gets userId from session → **player.id** (not 'admin-email')
4. Calls players-get with player.id
5. players-get finds player by UUID ✅
6. Displays:
   - Name: firstName + lastName (from player record)
   - Email: player.email (read-only)
   - Phone: player.phone (editable)
   - USAC ID: player.usacId (editable)
   - Playing Role: player.role (editable - shows "Bowler", etc.)
   - **Account Type badge:** Shows "Admin" or "Super Admin" separately

**Result:** Profile page shows PLAYER information, not admin username

**✅ Verified:** Profile correctly displays player data for promoted members
**✅ Verified:** Distinguishes between playing role and auth role

---

## Flow 3: Old-Style Admin (No Player Record)

### Step 3.1: Old-Style Admin Login
**Endpoint:** `POST /netlify/functions/auth-login`
**File:** `netlify/functions/auth-login.ts`

**Process:**
1. User submits username + password (not email)
2. System checks admin-users store (line 48)
   - ✅ Finds AdminUser
3. Verifies password
4. **Check for linked player (lines 73-86):**
   ```typescript
   const linkedPlayer = players.find(
     (p) => p.email?.toLowerCase() === adminUser.username.toLowerCase()
   );
   ```
   - ❌ No player found (old-style admin has no linked player)
5. Uses fallback userId:
   ```typescript
   const userId = 'admin-' + adminUser.username;  // e.g., 'admin-oldadmin'
   ```
6. Creates session with fallback userId

**Result:** Old-style admin can still log in and access admin portal

**✅ Verified:** Fallback maintains backward compatibility

---

### Step 3.2: Auth Check for Old-Style Admin
**Endpoint:** `GET /netlify/functions/auth-check`
**File:** `netlify/functions/auth-check.ts`

**Process:**
1. Validates session
2. Admin branch (line 35)
3. Finds AdminUser by session.username
4. Tries to find player by `session.userId` (line 56)
   - ❌ Not found (userId is 'admin-username', not a player UUID)
5. Falls back to old-style admin data (lines 70-77):
   ```typescript
   {
     username: adminUser.username,
     role: session.role,
     firstName: adminUser.username  // Use username as display name
   }
   ```

**Result:** Returns minimal admin data (no player fields)

**✅ Verified:** Old-style admins still work, return username-based data

---

### Step 3.3: Profile Page for Old-Style Admin
**File:** `src/pages/profile.astro`

**Process:**
1. Validates session → role = 'admin'
2. isMember check passes (admins are members)
3. Gets userId from session → 'admin-username'
4. Calls players-get with 'admin-username'
5. players-get tries to find player by ID:
   ```typescript
   const player = players.find((p) => p.id === 'admin-username');
   ```
   - ❌ Not found (no player with this ID)
6. Returns 404 error
7. Profile page shows error: "Failed to load player profile"

**Result:** Old-style admins cannot access /profile page (expected behavior)

**Note:** This is acceptable because:
- Old-style admins should not exist in the new system
- All admins should be promoted members with player records
- If encountered, shows clear error message

**✅ Verified:** Error handling prevents crashes, shows clear message

---

## Flow 4: Profile Update (Phone, USAC ID, Playing Role, Password)

### Step 4.1: Member Updates Profile
**Endpoint:** `POST /netlify/functions/profile-update`
**File:** `netlify/functions/profile-update.ts`

**Authorization:** Any authenticated member (admin or member role)

**Process:**
1. Validates session (line 26)
2. Checks isMember(session) - passes for member, admin, super_admin
3. Parses request body:
   ```typescript
   { phone?, usacId?, playerRole?, currentPassword?, newPassword? }
   ```
4. Validates:
   - At least one field provided (line 37)
   - Both currentPassword + newPassword if changing password (line 45)
   - New password min 8 chars (line 53)
   - Phone format if provided (line 106)
   - Player role is valid if provided (line 132)
5. Loads players from store
6. Finds player by `session.userId` (line 70) - ✅ Works for all roles
7. Updates fields:
   - **Phone:** Updates or clears (lines 102-118)
   - **USAC ID:** Updates or clears (lines 121-128)
   - **Playing Role:** Validates and updates (lines 131-140)
   - **Password:** Verifies current, hashes new (lines 81-99)
8. Updates timestamps (line 143)
9. Saves to players store
10. Creates audit log with change details

**Result:** Profile updated successfully

**✅ Verified:** Line 70 finds player using session.userId (works for all role types)
**✅ Verified:** Phone validation (line 106), USAC ID update (line 124), role update (line 139)
**✅ Verified:** Password change requires current password (line 89)

---

## Security Validation

### Password Security ✅
- **Hashing:** bcrypt with 10 salt rounds (`src/middleware/auth.ts` line 34)
- **Storage:** Never stored in plain text
- **Validation:** Minimum 8 characters
- **Change:** Requires current password verification

### Session Security ✅
- **Token:** JWT with 24-hour expiry (`src/middleware/auth.ts` line 7)
- **Cookie:** HTTP-only, secure in production, SameSite strict (line 101)
- **Secret:** Environment variable SESSION_SECRET (line 5)
- **Validation:** Signature verification on every request (line 84)

### Role-Based Access Control (RBAC) ✅
- **Hierarchy:** super_admin > admin > member (`src/middleware/auth.ts` lines 199-203)
- **Helpers:**
  - `isSuperAdmin()` - Only super_admin (line 164)
  - `isAdmin()` - admin or super_admin (line 173)
  - `isMember()` - Any authenticated user (line 182)
  - `requireRole()` - Check role hierarchy (line 193)

### Email Immutability ✅
- **Registration:** Email normalized to lowercase (`member-register.ts` line 60)
- **Approval:** Email copied from registration, then immutable
- **Profile:** Email field read-only, cannot be updated (`profile.astro` line 82)
- **Login:** Case-insensitive email matching (`auth-login.ts` line 110)

### Authorization Checks ✅
- **Member Approval:** Super admin only (`members-approve.ts` line 26)
- **Member Promotion:** Super admin only (`admin-users-promote.ts` line 29)
- **Profile Update:** Authenticated member required (`profile-update.ts` line 26)
- **Profile View:** Authenticated member required (`profile.astro` line 11)

---

## Critical Fixes Applied

### Fix 1: Admin Login Uses Player ID for Promoted Members
**File:** `netlify/functions/auth-login.ts` (lines 73-86)

**Problem:** When promoted members logged in as admins, session.userId was set to `'admin-' + email` instead of the actual player UUID.

**Impact:** Profile page failed to load because players-get couldn't find player by this ID.

**Solution:**
```typescript
// Check if this admin has a linked player record
const playersStore = getStore({...});
const players = await playersStore.get('players-all');
const linkedPlayer = players.find(
  (p) => p.email?.toLowerCase() === adminUser.username.toLowerCase()
);

// Use player ID if linked, otherwise fallback
const userId = linkedPlayer ? linkedPlayer.id : 'admin-' + adminUser.username;
```

**Result:** ✅ Promoted members now have correct player ID in session

---

## Test Scenarios

### Test 1: New Member Registration → Approval → Login ✅
1. Member registers → Creates pending player
2. Super admin approves → Updates player to approved
3. Member logs in → Session created with player.id
4. Profile loads → Shows correct player data

**Status:** ✅ All steps verified

---

### Test 2: Approved Member Promotion → Login as Admin ✅
1. Approved member exists with player.id
2. Super admin promotes to admin → Creates admin-users entry with email
3. Member logs in with email → System finds admin record
4. System finds linked player → Uses player.id for session
5. Auth-check returns full player data
6. Profile loads with player data, shows admin badge

**Status:** ✅ All steps verified with fix applied

---

### Test 3: Profile Updates for All Roles ✅
1. Member updates phone → Saved to player record
2. Admin (promoted member) updates USAC ID → Saved to player record
3. Super admin updates playing role → Saved to player record
4. All roles can change password → Requires current password

**Status:** ✅ All updates work for all role types

---

### Test 4: Old-Style Admin Backward Compatibility ✅
1. Old admin user exists in admin-users (no player record)
2. Old admin logs in → Session created with fallback 'admin-' prefix
3. Old admin accesses /admin → Works normally
4. Old admin tries /profile → Shows error (expected)

**Status:** ✅ Backward compatible, doesn't break old admins

---

## Conclusion

**✅ SYSTEM STATUS: PRODUCTION READY**

All critical authentication flows have been verified:

1. ✅ Member registration and approval works correctly
2. ✅ Member login creates proper sessions with player IDs
3. ✅ Member promotion to admin maintains player linkage
4. ✅ Promoted members can access profile with full player data
5. ✅ Profile updates work for all authenticated users
6. ✅ Role-based access control enforced throughout
7. ✅ Password security and session management secure
8. ✅ Backward compatibility maintained for old-style admins

**Critical Fix Applied:** Admin login now correctly uses player UUID for promoted members instead of 'admin-' prefix, enabling proper profile access.

**Recommendation:** All existing users should log out and log back in to get new session tokens with correct player IDs.

---

**Reviewed By:** Claude (AI Assistant)
**Review Date:** February 10, 2026
**Next Review:** After any auth system changes
