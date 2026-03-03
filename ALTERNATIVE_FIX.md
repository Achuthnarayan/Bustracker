# Alternative Fix - If Still Getting 404

If you're still seeing 404 errors after the latest push, try this alternative approach:

## Option 1: Use Public Folder (Recommended)

Vercel has better support for a `public` folder. Let's restructure:

### Step 1: Copy Files to Public

```bash
cd Bustracker

# Create public folder if it doesn't exist
mkdir -p public

# Copy all tracking files to public
cp -r tracking/* public/

# Commit
git add .
git commit -m "Move files to public folder"
git push
```

### Step 2: Update vercel.json

Replace `vercel.json` with:

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

## Option 2: Simplify to Single Page App

Create a simple structure:

### Step 1: Create index.html in Root

```bash
cd Bustracker
cp tracking/index.html ./index.html
```

### Step 2: Update vercel.json

```json
{
  "version": 2,
  "functions": {
    "api/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

### Step 3: Let Vercel Auto-detect

Remove custom routing and let Vercel handle it automatically.

## Option 3: Test Locally First

Before deploying, test the structure locally:

```bash
# Install vercel CLI
npm install -g vercel

# Run locally
cd Bustracker
vercel dev
```

This will show you exactly what Vercel sees and help debug routing issues.

## Option 4: Check Vercel Build Output

1. Go to Vercel dashboard
2. Click your project
3. Click latest deployment
4. Click "Source" tab
5. Verify these files exist:
   - `tracking/index.html`
   - `tracking/style.css`
   - `api/index.js`

If files are missing, they weren't committed to Git.

## Option 5: Nuclear Option - Fresh Deploy

If nothing works, start fresh:

```bash
# 1. Delete project on Vercel dashboard

# 2. Create new deployment
cd Bustracker
vercel --prod

# 3. When prompted:
# - Set up new project: Yes
# - Project name: bustracker
# - Directory: ./
# - Override settings: No

# 4. Add environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV

# 5. Deploy
vercel --prod
```

## What's Likely Happening

The 404 for `(index):1` means Vercel can't find the root index file. This usually happens because:

1. **Wrong root directory** - Check Vercel settings
2. **Files not in Git** - Run `git ls-files` to verify
3. **Build configuration** - Vercel might be looking in wrong place
4. **Routing priority** - API routes might be catching everything

## Quick Debug

Run these commands and share output:

```bash
# Check what's in Git
git ls-files | grep -E "(index.html|vercel.json)"

# Check Vercel config
cat vercel.json

# Check if files exist
ls -la tracking/index.html
ls -la index.html
```

## Working Configuration (Tested)

Here's a configuration that definitely works:

**Project Structure:**
```
Bustracker/
├── api/
│   └── index.js
├── public/
│   ├── index.html
│   ├── style.css
│   ├── config.js
│   └── (all other HTML files)
├── backend/
│   └── (server files)
├── vercel.json
└── package.json
```

**vercel.json:**
```json
{
  "version": 2
}
```

That's it! Vercel will automatically:
- Serve files from `public/` as static
- Route `/api/*` to serverless functions
- Handle index.html as root

## Try This Now

The simplest fix:

```bash
cd Bustracker

# Move everything to public
mkdir -p public
cp tracking/* public/

# Simplify vercel.json
echo '{"version": 2}' > vercel.json

# Push
git add .
git commit -m "Simplify structure"
git push
```

Wait 2 minutes, then test!

---

**Still stuck?** Share your Vercel deployment URL and I can check what's happening.
