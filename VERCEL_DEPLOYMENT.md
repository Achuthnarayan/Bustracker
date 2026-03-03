# Vercel Deployment Guide - Step by Step

Follow these steps to deploy your Bus Tracker to Vercel.

## Prerequisites

✅ MongoDB Atlas connection string ready
✅ GitHub account (recommended) or Vercel CLI
✅ Project tested locally

## Method 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Initialize git in your project:

```bash
cd Bustracker
git init
git add .
git commit -m "Initial commit - Bus Tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

### Step 3: Configure Project

**Framework Preset:** Other

**Root Directory:** `./` (leave as is)

**Build Command:** Leave empty or use `npm run vercel-build`

**Output Directory:** Leave empty

**Install Command:** `npm install`

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A secure random string (min 32 chars) |
| `NODE_ENV` | `production` |

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use: https://randomkeygen.com/

**Your MongoDB URI should look like:**
```
mongodb+srv://ptchandanaa_db_user:YOUR_PASSWORD@cluster0.9jsnkru.mongodb.net/bustracker?retryWrites=true&w=majority&appName=Cluster0
```

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for deployment
3. You'll get a URL like: `https://your-project.vercel.app`

### Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Test login with: `STU001` / `password123`
3. Try live map tracking
4. Check if buses appear (you may need to seed data)

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Deploy

```bash
cd Bustracker
vercel
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **bustracker** (or your choice)
- In which directory is your code located? **./`**

### Step 4: Add Environment Variables

```bash
vercel env add MONGODB_URI
# Paste your MongoDB connection string

vercel env add JWT_SECRET
# Paste a secure random string

vercel env add NODE_ENV
# Type: production
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

## Post-Deployment Setup

### 1. Seed the Database

You need to seed your production database with initial data.

**Option A: Run seed script locally pointing to production DB**

```bash
cd backend
# Temporarily update .env with production MongoDB URI
npm run seed
```

**Option B: Create a seed endpoint (temporary)**

Add to `backend/server.js`:
```javascript
// Temporary seed endpoint - REMOVE after first use
app.get('/api/admin/seed', async (req, res) => {
  try {
    await seedData();
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then visit: `https://your-app.vercel.app/api/admin/seed`

**IMPORTANT:** Remove this endpoint after seeding!

### 2. Update Frontend Config

The frontend should automatically use the correct API URL, but verify:

Check `tracking/config.js`:
```javascript
API_BASE_URL: window.location.origin + '/api'
```

### 3. Test All Features

- ✅ User registration
- ✅ User login
- ✅ Live map tracking
- ✅ View routes
- ✅ Buy tickets
- ✅ Operator login

### 4. Update ESP32 Configuration

Update your ESP32 code with production URL:

```cpp
const char* serverUrl = "https://your-app.vercel.app/api/hardware/location";
```

## Vercel Dashboard Features

### View Logs

1. Go to your project in Vercel dashboard
2. Click **"Deployments"**
3. Click on latest deployment
4. Click **"Functions"** tab
5. View real-time logs

### Environment Variables

1. Go to project settings
2. Click **"Environment Variables"**
3. Add/Edit/Delete variables
4. Redeploy for changes to take effect

### Custom Domain

1. Go to project settings
2. Click **"Domains"**
3. Add your custom domain
4. Follow DNS configuration instructions

### Redeploy

**Automatic:** Push to GitHub (if connected)

**Manual:** 
```bash
vercel --prod
```

## Troubleshooting

### Issue: "Internal Server Error"

**Solution:**
1. Check Vercel function logs
2. Verify environment variables are set
3. Check MongoDB connection string
4. Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

### Issue: "Database connection failed"

**Solution:**
1. Verify MongoDB URI is correct
2. Check MongoDB Atlas network access:
   - Go to Network Access
   - Add IP: `0.0.0.0/0` (allow from anywhere)
3. Verify database user credentials
4. Check if cluster is active

### Issue: "Buses not showing"

**Solution:**
1. Seed the database (see Post-Deployment Setup)
2. Check API endpoint: `https://your-app.vercel.app/api/health`
3. Check browser console for errors
4. Verify authentication is working

### Issue: "CORS errors"

**Solution:**
Already configured in backend. If issues persist:
1. Check backend/server.js CORS settings
2. Verify API_BASE_URL in config.js
3. Clear browser cache

### Issue: "Function timeout"

**Solution:**
Vercel free tier has 10-second timeout. If needed:
1. Optimize database queries
2. Add indexes to MongoDB collections
3. Consider upgrading Vercel plan

## Performance Optimization

### 1. Enable Caching

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/tracking/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### 2. MongoDB Connection Pooling

Already configured in `config/database.js` with connection reuse.

### 3. Monitor Performance

Use Vercel Analytics:
1. Go to project settings
2. Enable Analytics
3. Monitor page load times

## Security Checklist

- [x] Environment variables not in code
- [x] JWT secret is strong and random
- [x] MongoDB user has limited permissions
- [x] CORS configured properly
- [x] Passwords hashed with bcrypt
- [x] API endpoints require authentication
- [ ] Rate limiting (consider adding)
- [ ] HTTPS enabled (automatic on Vercel)

## Updating Your Deployment

### Update Code

```bash
git add .
git commit -m "Update description"
git push
```

Vercel auto-deploys on push (if GitHub connected).

### Update Environment Variables

```bash
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
vercel --prod
```

## Cost Considerations

**Vercel Free Tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Serverless functions
- Custom domains

**MongoDB Atlas Free Tier:**
- 512MB storage
- Shared RAM
- No credit card required

**Both are sufficient for testing and small-scale production!**

## Production Checklist

Before going live:

- [ ] Database seeded with real data
- [ ] Test all features on production URL
- [ ] Mobile testing completed
- [ ] ESP32 configured with production URL
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] User documentation ready

## Your Deployment URLs

After deployment, you'll have:

- **Frontend:** `https://your-app.vercel.app`
- **API:** `https://your-app.vercel.app/api`
- **Health Check:** `https://your-app.vercel.app/api/health`
- **Live Tracking:** `https://your-app.vercel.app/live-track.html`

## Support

**Vercel Documentation:** https://vercel.com/docs

**MongoDB Atlas Support:** https://docs.atlas.mongodb.com/

**Project Issues:** Check function logs in Vercel dashboard

---

## Quick Deploy Commands

```bash
# First time
cd Bustracker
vercel
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV
vercel --prod

# Updates
git add .
git commit -m "Update"
git push
# Or: vercel --prod
```

**Congratulations!** 🎉 Your bus tracker is now live on Vercel!

Share your URL and start tracking buses! 🚌🗺️
