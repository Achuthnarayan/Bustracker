# Fix 404 Errors on Vercel

If you're seeing 404 errors after deploying to Vercel, follow these steps:

## Quick Fix

### Step 1: Update Your Repository

```bash
cd Bustracker

# Pull the latest changes (if you haven't already)
git add .
git commit -m "Fix Vercel 404 errors"
git push
```

Vercel will automatically redeploy.

### Step 2: Check Vercel Build Settings

1. Go to your Vercel dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Verify these settings:

**Framework Preset:** Other

**Root Directory:** `./` (leave blank or use `./`)

**Build Command:** Leave empty

**Output Directory:** Leave empty

**Install Command:** `npm install`

### Step 3: Verify File Structure

Make sure your files are in the correct locations:

```
Bustracker/
├── api/
│   └── index.js          ✅ Must exist
├── backend/
│   ├── server.js         ✅ Must exist
│   ├── models/           ✅ Must exist
│   └── config/           ✅ Must exist
├── tracking/
│   ├── index.html        ✅ Must exist
│   ├── live-track.html   ✅ Must exist
│   ├── config.js         ✅ Must exist
│   └── style.css         ✅ Must exist
├── vercel.json           ✅ Must exist
└── package.json          ✅ Must exist (in root)
```

### Step 4: Check Vercel Logs

1. Go to Vercel dashboard
2. Click your project
3. Click **Deployments**
4. Click the latest deployment
5. Click **Functions** tab
6. Look for errors

Common errors:
- "Cannot find module" → Missing dependencies
- "Database connection failed" → Check MongoDB URI
- "404" → File routing issue

### Step 5: Manual Redeploy

If auto-deploy didn't work:

```bash
cd Bustracker
vercel --prod
```

## Alternative: Use Different Vercel Configuration

If the above doesn't work, try this simpler configuration:

### Option 1: Simplified vercel.json

Replace `vercel.json` with:

```json
{
  "version": 2,
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/tracking/$1" }
  ]
}
```

### Option 2: Move Files to Public

Create a `public` folder and move tracking files:

```bash
cd Bustracker
mkdir public
cp -r tracking/* public/
```

Update `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

## Test Your Deployment

After fixing, test these URLs:

1. **Homepage:** `https://your-app.vercel.app/`
   - Should show login page

2. **API Health:** `https://your-app.vercel.app/api/health`
   - Should return JSON with status

3. **Live Tracking:** `https://your-app.vercel.app/live-track.html`
   - Should show map (after login)

4. **Static Files:** `https://your-app.vercel.app/style.css`
   - Should load CSS

## Common Issues

### Issue: "Failed to load resource: 404"

**Cause:** Vercel can't find static files

**Solution:**
1. Check file paths in `vercel.json`
2. Ensure `tracking/` folder exists
3. Verify files are committed to Git
4. Check Vercel build logs

### Issue: "Cannot GET /"

**Cause:** No index.html found

**Solution:**
1. Verify `tracking/index.html` exists
2. Check `vercel.json` routes
3. Add explicit route for `/`:
   ```json
   {
     "src": "/",
     "dest": "/tracking/index.html"
   }
   ```

### Issue: API works but frontend doesn't

**Cause:** Static file routing issue

**Solution:**
1. Check browser console for 404s
2. Verify file paths
3. Try accessing files directly:
   - `https://your-app.vercel.app/tracking/index.html`
4. If that works, update routes in `vercel.json`

### Issue: Everything 404

**Cause:** Build failed or wrong root directory

**Solution:**
1. Check Vercel build logs
2. Verify root directory is `./`
3. Check `package.json` exists in root
4. Ensure `api/index.js` exists

## Debug Steps

### 1. Check What Vercel Deployed

In Vercel dashboard:
1. Go to your deployment
2. Click **Source**
3. Verify all files are there

### 2. Test API Separately

```bash
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "activeBuses": 0,
  "registeredUsers": 0,
  "database": "Connected"
}
```

### 3. Test Static Files

```bash
curl https://your-app.vercel.app/tracking/index.html
```

Should return HTML content.

### 4. Check Environment Variables

In Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Verify these exist:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV`

## Still Not Working?

### Nuclear Option: Redeploy from Scratch

```bash
# 1. Delete deployment on Vercel dashboard

# 2. Remove .vercel folder
cd Bustracker
rm -rf .vercel

# 3. Commit latest changes
git add .
git commit -m "Fix deployment"
git push

# 4. Redeploy
vercel --prod
```

### Contact Support

If nothing works:

1. **Vercel Support:** https://vercel.com/support
2. **Check Vercel Status:** https://www.vercel-status.com/
3. **Community:** https://github.com/vercel/vercel/discussions

## Working Configuration

Here's a tested working configuration:

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/",
      "dest": "/tracking/index.html"
    },
    {
      "src": "/(.*)",
      "dest": "/tracking/$1"
    }
  ]
}
```

**package.json (root):**
```json
{
  "name": "bustracker",
  "version": "1.0.0",
  "main": "api/index.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.3.1",
    "mongoose": "^8.0.0"
  }
}
```

## Success!

Once fixed, you should see:
- ✅ Homepage loads
- ✅ Login works
- ✅ Live map displays
- ✅ API responds
- ✅ No 404 errors

---

**Need more help?** Check the Vercel deployment logs for specific errors.
