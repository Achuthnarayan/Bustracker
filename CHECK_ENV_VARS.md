# ⚠️ CRITICAL: Check Environment Variables

Your API is returning 404 because environment variables might not be set!

## Quick Fix (2 minutes)

### Step 1: Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Click your project: `bustracker-two`
3. Click **Settings**
4. Click **Environment Variables**

### Step 2: Add These 3 Variables

Add each one by clicking "Add New":

#### Variable 1: MONGODB_URI
- **Name:** `MONGODB_URI`
- **Value:** 
  ```
  mongodb+srv://ptchandanaa_db_user:YOUR_PASSWORD@cluster0.9jsnkru.mongodb.net/bustracker?retryWrites=true&w=majority&appName=Cluster0
  ```
  ⚠️ Replace `YOUR_PASSWORD` with your actual MongoDB password!
- **Environment:** Production, Preview, Development (check all 3)

#### Variable 2: JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** Generate a random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Copy the output and paste it here
- **Environment:** Production, Preview, Development (check all 3)

#### Variable 3: NODE_ENV
- **Name:** `NODE_ENV`
- **Value:** `production`
- **Environment:** Production only

### Step 3: Redeploy

After adding variables:
1. Go to **Deployments**
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait 2 minutes

## Why This Matters

Without these variables:
- ❌ Database connection fails
- ❌ API returns errors
- ❌ Login doesn't work
- ❌ Everything breaks

With these variables:
- ✅ Database connects
- ✅ API works
- ✅ Login works
- ✅ Everything works!

## Test After Adding

Once redeployed, test:

1. **API Health:**
   ```
   https://bustracker-two.vercel.app/api/health
   ```
   Should return: `{"status":"OK","database":"Connected"}`

2. **Homepage:**
   ```
   https://bustracker-two.vercel.app/
   ```
   Should show login page

## Alternative: Add via CLI

```bash
cd Bustracker

# Add MONGODB_URI
vercel env add MONGODB_URI production
# Paste your MongoDB connection string

# Add JWT_SECRET  
vercel env add JWT_SECRET production
# Paste generated secret

# Add NODE_ENV
vercel env add NODE_ENV production
# Type: production

# Redeploy
vercel --prod
```

## Your MongoDB Connection String

```
mongodb+srv://ptchandanaa_db_user:YOUR_PASSWORD@cluster0.9jsnkru.mongodb.net/bustracker?retryWrites=true&w=majority&appName=Cluster0
```

**Remember to:**
1. Replace `YOUR_PASSWORD` with actual password
2. No spaces
3. No < or > symbols

## Generate JWT Secret

Run this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Use this as your JWT_SECRET!

---

## ⚡ DO THIS NOW

1. Go to Vercel dashboard
2. Add the 3 environment variables
3. Redeploy
4. Test the API

**This will fix your 404 errors!** 🎯
