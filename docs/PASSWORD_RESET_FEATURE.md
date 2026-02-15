# Password Reset Feature Documentation

## Overview

The password reset feature allows users who forgot their password to submit a request to administrators. Super admins can then review these requests and generate temporary passwords to share with users via phone, text, or in-person.

## How It Works

### For Users (Members/Players)

1. **Submit Request**
   - Go to the login page: `/login`
   - Click on "Forgot Password?" link below the password field
   - Enter your registered email address
   - Click "Submit Request"
   - You'll receive a confirmation message

2. **Wait for Admin Response**
   - A super admin will review your request
   - They will contact you via phone, text, or in-person with a temporary password
   - This is a manual process to ensure security

3. **Login with Temporary Password**
   - Use the temporary password provided by the admin to login
   - Go to your profile page: `/profile`
   - Change your password immediately under "Change Password" section

### For Super Admins

1. **View Password Reset Requests**
   - Go to: `/admin/users`
   - Click on "Password Reset Requests" tab
   - You'll see all pending, completed, and rejected requests
   - Pending requests are highlighted with a badge count

2. **Process a Request**

   **Option A: Reset Password**
   - Click "Reset Password" button for a pending request
   - Review the user details in the modal
   - Click "Reset Password" to generate a temporary password
   - The system generates a secure 10-character password
   - Copy the temporary password (use the copy button)
   - Share this password with the user via:
     - Phone call
     - Text message (SMS/WhatsApp)
     - In-person
   - **Important:** Never share passwords via email
   - Request status changes to **Completed** (green)

   **Option B: Reject Request**
   - Click "Reject" button if the request is fraudulent, invalid, or user remembered password
   - Confirm the rejection
   - The request will be marked as **Rejected** (red)
   - User's original password remains unchanged

3. **Close a Completed Request**
   - After the user has changed their temporary password to their own password
   - Verify with the user that they successfully logged in and changed their password
   - Click the "Close" button next to the completed request
   - Confirm the action
   - Request status changes to **Closed** (gray)

4. **Track Request Status**
   - **Pending:** Awaiting admin action (yellow badge)
   - **Completed:** Temporary password generated and shared (green badge)
   - **Closed:** User confirmed password change, request finalized (gray)
   - **Rejected:** Request denied or user remembered password (red badge)

## Technical Implementation

### New Backend Functions

1. **`password-reset-request.ts`**
   - Public endpoint (no authentication required)
   - Validates email format
   - Checks if user exists with login access
   - Creates a password reset request
   - Prevents duplicate pending requests

2. **`password-reset-requests-list.ts`**
   - Super admin only
   - Lists all password reset requests
   - Sorted by date (newest first)

3. **`password-reset-complete.ts`**
   - Super admin only
   - Generates a random 10-character temporary password
   - Includes uppercase, lowercase, numbers, and special characters
   - Updates user's password hash
   - Marks request as completed
   - Logs action in audit trail

4. **`password-reset-reject.ts`**
   - Super admin only
   - Marks request as rejected
   - Does NOT change user's password
   - Logs action in audit trail

5. **`password-reset-close.ts`**
   - Super admin only
   - Closes completed requests after user changes password
   - Can only close requests with 'completed' status
   - Logs action in audit trail

### Data Storage

**New Netlify Blob Store:** `password-reset-requests`

**Request Schema:**
```typescript
{
  id: string;                  // Unique request ID
  userId: string;              // Player ID
  email: string;               // User email
  firstName: string;           // User first name
  lastName: string;            // User last name
  status: 'pending' | 'completed' | 'rejected' | 'closed';
  requestedAt: string;         // ISO timestamp
  completedAt: string | null;  // ISO timestamp when processed (reset or rejected)
  completedBy: string | null;  // Admin who processed it
  closedAt: string | null;     // ISO timestamp when closed
  closedBy: string | null;     // Admin who closed it
}
```

### UI Updates

1. **Login Page (`/login`)**
   - Added "Forgot Password?" link
   - Modal for submitting password reset requests
   - User-friendly confirmation messages

2. **Admin Users Page (`/admin/users`)**
   - New "Password Reset Requests" tab
   - Badge counter for pending requests
   - Table showing all requests with status
   - Modal for resetting passwords
   - Copy-to-clipboard functionality for temporary passwords
   - Reject functionality for invalid requests

### Security Features

1. **Email Privacy**
   - Always returns success message (doesn't reveal if email exists)
   - Only creates requests for valid users with login access

2. **Duplicate Prevention**
   - Checks for existing pending requests
   - Prevents spam/multiple submissions

3. **Strong Temporary Passwords**
   - 10 characters minimum
   - Mix of uppercase, lowercase, numbers, special characters
   - Randomly shuffled

4. **Audit Logging**
   - All password resets are logged
   - Tracks who performed the action
   - Includes request details

5. **Role-Based Access**
   - Only super admins can view and process requests
   - Regular admins cannot access this feature

## User Experience Flow

```
User                           System                          Super Admin
  |                              |                                 |
  |-- Forgot Password? -------->|                                 |
  |                              |                                 |
  |<- Enter Email Modal ---------|                                 |
  |                              |                                 |
  |-- Submit Request ----------->|                                 |
  |                              |                                 |
  |                              |-- Create Request (Pending) ---->|
  |                              |                                 |
  |<- Confirmation Message ------|                                 |
  |                              |                                 |
  |                              |<- Review Request ----------------|
  |                              |                                 |
  |                              |-- Generate Temp Password ------>|
  |                              |    (Status: Completed)          |
  |                              |                                 |
  |<- Contact (Phone/Text) ------|<- Copy & Share Password ---------|
  |                              |                                 |
  |-- Login with Temp Password ->|                                 |
  |                              |                                 |
  |<- Redirect to Profile -------|                                 |
  |                              |                                 |
  |-- Change Password ---------->|                                 |
  |                              |                                 |
  |<- Password Updated ----------|                                 |
  |                              |                                 |
  |-- Confirm with Admin --------|------------------------------->|
  |                              |                                 |
  |                              |<- Close Request -----------------|
  |                              |    (Status: Closed)             |
```

## Testing Checklist

### User Flow
- [ ] User can click "Forgot Password?" on login page
- [ ] Modal opens with email input
- [ ] Form validates email format
- [ ] Success message appears after submission
- [ ] Duplicate requests don't create multiple entries
- [ ] Invalid email doesn't reveal if user exists

### Super Admin Flow
- [ ] Password Reset Requests tab is visible
- [ ] Badge shows count of pending requests
- [ ] Table displays all requests with correct status
- [ ] Reset Password modal opens correctly
- [ ] Temporary password is generated and displayed
- [ ] Copy button works for temporary password
- [ ] Request status updates to "completed"
- [ ] Reject button works correctly
- [ ] Close button appears for completed requests
- [ ] Close button works and updates status to "closed"
- [ ] Cannot close pending or rejected requests
- [ ] Audit log captures all actions (reset, reject, close)

### Security
- [ ] Regular admins cannot access password reset requests
- [ ] Temporary passwords meet complexity requirements
- [ ] Old password is completely replaced
- [ ] User can login with temporary password
- [ ] User can change password in profile page

## Future Enhancements

1. **Email Integration**
   - Send automated emails when request is processed
   - Include temporary password in secure email
   - Send confirmation when password is changed

2. **Time-Limited Temporary Passwords**
   - Expire temporary passwords after 24 hours
   - Force password change on first login

3. **Self-Service Reset (with Email)**
   - Send reset link directly to user's email
   - Token-based password reset flow
   - No admin intervention needed

4. **Request Notifications**
   - Notify super admins when new requests arrive
   - Email or SMS notifications

5. **Request History**
   - Show all password reset history for a user
   - Track frequency of reset requests

## Best Practices

### For Super Admins

1. **Verify User Identity**
   - Always verify the user's identity before sharing temporary passwords
   - Ask security questions or confirm personal details
   - Use known phone numbers or contact methods

2. **Secure Communication**
   - Never share passwords via email
   - Use phone calls or encrypted messaging (WhatsApp)
   - Prefer in-person communication when possible

3. **Prompt Action**
   - Process requests quickly (within 24 hours)
   - Check the tab regularly for new requests
   - Close completed requests after confirming with user

4. **Close Requests Properly**
   - Only close after verifying the user changed their password
   - Ask user: "Have you successfully changed your password?"
   - Helps maintain clean request history
   - Shows which requests are fully resolved

5. **Documentation**
   - Audit logs are your friend
   - Review logs if suspicious activity occurs
   - Keep track of frequent reset requests from same user

### For Users

1. **Use Strong Passwords**
   - Choose passwords with 12+ characters
   - Mix uppercase, lowercase, numbers, special characters
   - Avoid common words or personal information

2. **Change Temporary Password Immediately**
   - Don't reuse the temporary password
   - Change it as soon as you login
   - Use a unique password

3. **Keep Password Secure**
   - Don't share your password
   - Use a password manager
   - Enable two-factor authentication (when available)

## Troubleshooting

### "Request already submitted"
- Check if you have a pending request already
- Contact super admin directly if urgent

### Temporary password doesn't work
- Check for typos (case-sensitive)
- Ensure spaces weren't copied
- Contact super admin to generate a new one

### Can't find profile page
- After login, navigate to `/profile`
- Or click your name in the navigation menu

### Request not showing up
- Wait a few minutes and refresh
- Check that you're using the registered email
- Contact super admin directly

## Support

For issues or questions about the password reset feature:
- Email: gsbengalsinc@gmail.com
- Contact your super admin directly

---

**Last Updated:** February 14, 2026
**Feature Version:** 1.0
