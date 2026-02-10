# Admin Interface - Quick Start Guide

Get the admin interface running in 5 minutes!

## Prerequisites

- Node.js installed
- Netlify account with site deployed
- Access to Netlify dashboard

## Step 1: Generate Session Secret (30 seconds)

```bash
node scripts/generate-session-secret.cjs
```

Copy the output - you'll need it in Step 3.

## Step 2: Get Netlify Access Token (2 minutes)

1. Go to https://app.netlify.com/user/applications
2. Click **"New access token"**
3. Name: "Bengals CC Admin"
4. Click **"Generate token"**
5. **Copy the token** (you won't see it again!)

## Step 3: Create `.env` File (1 minute)

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Choose a username and strong password for first admin
FIRST_ADMIN_USERNAME=admin
FIRST_ADMIN_PASSWORD=ChooseAStrongPassword123!

# Paste the token from Step 2
NETLIFY_AUTH_TOKEN=paste_your_token_here

# Paste the secret from Step 1
SESSION_SECRET=paste_your_secret_here

# Leave this as-is for local
NODE_ENV=development
```

## Step 4: Deploy to Netlify (1 minute)

### Option A: Deploy via Git (Recommended)

```bash
git add .
git commit -m "Add admin interface"
git push origin main
```

Netlify will auto-deploy.

### Option B: Manual Deploy

```bash
npm run build
netlify deploy --prod
```

## Step 5: Set Environment Variables in Netlify (1 minute)

1. Go to your Netlify site dashboard
2. **Site settings** → **Environment variables**
3. Click **"Add a variable"** for each:

   ```
   FIRST_ADMIN_USERNAME = admin
   FIRST_ADMIN_PASSWORD = (same as .env)
   NETLIFY_AUTH_TOKEN = (same as .env)
   SESSION_SECRET = (same as .env)
   NODE_ENV = production
   ```

4. Click **"Save"**

## Step 6: Create First Admin (30 seconds)

After deployment completes:

```bash
# Replace with your actual site URL
curl -X POST https://your-site.netlify.app/.netlify/functions/setup-first-admin
```

You should see:
```json
{
  "message": "First admin user created successfully",
  "username": "admin"
}
```

## Step 7: Login! (30 seconds)

1. Visit: `https://your-site.netlify.app/admin`
2. Login with credentials from Step 3
3. You're in! 🎉

## Optional: Remove Temporary Variables

After first admin is created, you can remove these from Netlify for security:
- `FIRST_ADMIN_USERNAME`
- `FIRST_ADMIN_PASSWORD`

(Keep them in local `.env` for development)

## Next Steps

- **Add more admins**: Click "Manage Users" → Add new admin user
- **Test submissions**: Go to `/contact`, submit a form, verify it appears in dashboard
- **Customize**: Update colors, add features, etc.

## Troubleshooting

### "Unauthorized" error
- Make sure you created the first admin (Step 6)
- Try logging out and back in

### "NETLIFY_AUTH_TOKEN not configured"
- Check that the token is set in Netlify environment variables
- Verify the token is valid (create a new one if needed)

### Can't login
- Double-check username and password match what you set
- Try running the setup function again

### Still stuck?
See `ADMIN_SETUP.md` for detailed troubleshooting.

---

**Time to complete**: ~5 minutes
**Difficulty**: Easy

You now have a secure admin interface! 🚀
