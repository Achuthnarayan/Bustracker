# 🚀 Deploy to Vercel NOW - Quick Guide

Follow these steps to deploy your bus tracker to Vercel in 10 minutes!

## Before You Start

✅ MongoDB Atlas connection string ready
✅ Project tested locally
✅ Git installed

## Step 1: Prepare for Deployment (2 minutes)

### Check Your MongoDB Connection String

Your connection string from earlier:
```
mongodb+srv://ptchandanaa_db_user:<db_password>@cluster0.9jsnkru.mongodb.net/bustracker?retryWrites=true&w=majority&appName=Cluster0
```

Make sure:
- Replace `<db_password>` with actual password
- `/bustracker` is added after `.net/`
- Network access allows `0.0.0.0/0`

### Generate JWT Secret

Run this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output - you'll need it!

## Step 2: Push to GitHub (3 minutes)

### Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `bustracker` (or your choice)
3. Make it Public or Private
4. Don't initialize with README
5. Click "Create repository"

### Push Your Code

```bash
cd Bustracker

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Bus Tracker with live map"

# Add remote (replace with your URL)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bustracker.git

# Push
git push -u origin main
```

## Step 3: Deploy to Vercel (5 minutes)

### Option A: Using Vercel Dashboard (Easier)

1. **Go to Vercel**
   - Visit https://vercel.com/login
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your `bustracker` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Other**
   - Root Directory: `./` (leave as is)
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

4. **Add Environment Variables**
   
   Click "Environment Variables" and add these 3 variables:

   | Name | Value |
   |------|-------|
   | `MONGODB_URI` | `mongodb+srv://ptchandanaa_db_user:YOUR_PASSWORD@cluster0.9jsnkru.mongodb.net/bustracker?retryWrites=true&w=majority&appName=Cluster0` |
   | `JWT_SECRET` | Your generated secret from Step 1 |
   | `NODE_ENV` | `production` |

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://bustracker-xyz.vercel.app`

### Option B: Using Vercel CLI (Faster if you know CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd Bustracker
vercel

# Add environment variables
vercel env add MONGODB_URI
# Paste your MongoDB URI

vercel env add JWT_SECRET
# Paste your JWT secret

vercel env add NODE_ENV
# Type: production

# Deploy to production
vercel --prod
```

## Step 4: Seed Production Database (2 minutes)

You need to add initial data to your production database.

### Method 1: Seed from Local

```bash
cd backend

# Temporarily update .env with production MongoDB URI
# Edit .env and paste your production MongoDB URI

# Run seed
npm run seed

# You should see:
# ✓ 3 routes created
# ✓ 3 test users created
# ✓ 3 operators created
# ✓ 3 buses created
```

### Method 2: Use Seed API (if Method 1 doesn't work)

Visit in browser:
```
https://your-app.vercel.app/api/health
```

If that works, you can manually create test data or use the seed script locally.

## Step 5: Test Your Deployment (2 minutes)

1. **Visit Your URL**
   ```
   https://your-app.vercel.app
   ```

2. **Test Login**
   - College ID: `STU001`
   - Password: `password123`

3. **Test Live Map**
   - Click "🗺️ Live Map Tracking"
   - You should see the map
   - Buses should appear (if seeded)

4. **Test Other Features**
   - View Routes
   - Buy Tickets
   - Search buses

## Step 6: Update ESP32 (When Ready)

Update your ESP32 code with production URL:

```cpp
const char* serverUrl = "https://your-app.vercel.app/api/hardware/location";
```

## Your Deployment URLs

After deployment:

- **Main App:** `https://your-app.vercel.app`
- **Live Tracking:** `https://your-app.vercel.app/live-track.html`
- **API Health:** `https://your-app.vercel.app/api/health`
- **Operator Login:** `https://your-app.vercel.app/operator-login.html`

## Troubleshooting

### "Internal Server Error"

1. Check Vercel function logs:
   - Go to Vercel dashboard
   - Click your project
   - Click "Deployments"
   - Click latest deployment
   - Click "Functions" tab
   - View logs

2. Common issues:
   - MongoDB URI incorrect
   - Environment variables not set
   - MongoDB network access not configured

### "Database connection failed"

1. Go to MongoDB Atlas
2. Click "Network Access"
3. Add IP: `0.0.0.0/0` (allow from anywhere)
4. Wait 2 minutes for changes to apply
5. Redeploy on Vercel

### "Buses not showing"

1. Make sure database is seeded
2. Check API: `https://your-app.vercel.app/api/health`
3. Check browser console (F12)
4. Try logging in again

### "Cannot find module"

1. Make sure `package.json` exists in root
2. Redeploy:
   ```bash
   vercel --prod
   ```

## Quick Commands Reference

```bash
# Deploy
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm PROJECT_NAME

# Add environment variable
vercel env add VARIABLE_NAME

# Pull environment variables
vercel env pull
```

## Update Your Deployment

### Push Updates

```bash
git add .
git commit -m "Update description"
git push
```

Vercel auto-deploys on push!

### Manual Redeploy

```bash
vercel --prod
```

## Share Your App

Once deployed, share these links:

**For Students:**
```
🚌 Bus Tracker: https://your-app.vercel.app
📱 Login with your college ID
🗺️ Track buses in real-time!
```

**For Operators:**
```
🚌 Operator Dashboard: https://your-app.vercel.app/operator-login.html
🔑 Login with your operator ID
```

## Success Checklist

- [ ] Deployed to Vercel
- [ ] Environment variables added
- [ ] Database seeded
- [ ] Login works
- [ ] Live map loads
- [ ] Buses appear on map
- [ ] Routes visible
- [ ] Tickets can be purchased
- [ ] Mobile responsive
- [ ] No console errors

## Next Steps

1. ✅ Test all features thoroughly
2. ✅ Customize for your college (routes, locations)
3. ✅ Add custom domain (optional)
4. ✅ Connect ESP32 hardware
5. ✅ Share with users
6. ✅ Monitor usage in Vercel dashboard

## Support

**Vercel Issues:**
- Check function logs in dashboard
- Visit: https://vercel.com/docs

**MongoDB Issues:**
- Check Atlas dashboard
- Verify network access
- Visit: https://docs.atlas.mongodb.com

**App Issues:**
- Check browser console (F12)
- Review VERCEL_DEPLOYMENT.md
- Check API health endpoint

---

## Ready to Deploy?

Run this command:

**Windows:**
```bash
deploy.bat
```

**Mac/Linux:**
```bash
chmod +x deploy.sh
./deploy.sh
```

Or follow the steps above manually!

**Good luck!** 🚀🎉

Your bus tracker will be live in minutes! 🚌🗺️
