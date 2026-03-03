# MongoDB Atlas Setup Guide - Step by Step

This guide will walk you through setting up a FREE MongoDB Atlas database for your Bus Tracker application.

## Step 1: Create MongoDB Atlas Account

1. Go to **https://www.mongodb.com/cloud/atlas/register**
2. You have three options to sign up:
   - Sign up with Google (recommended - fastest)
   - Sign up with GitHub
   - Sign up with email and password

3. If using email:
   - Enter your email address
   - Create a password
   - Enter your first and last name
   - Click "Create your Atlas account"

4. Check your email and verify your account (if using email signup)

## Step 2: Answer Initial Questions (Optional)

MongoDB will ask you some questions:
- **What is your goal today?** Select "Learn MongoDB"
- **What type of application are you building?** Select "I'm just exploring"
- **What is your preferred language?** Select "JavaScript"

You can skip these if there's a skip option.

## Step 3: Create a Free Cluster

1. You'll see "Deploy a cloud database" page
2. Click on **"Create"** under the **M0 FREE** tier (this is the free option)
   - Storage: 512 MB (free forever)
   - Shared RAM
   - No credit card required

3. **Choose your cloud provider and region:**
   - Provider: AWS, Google Cloud, or Azure (AWS is recommended)
   - Region: Choose the one closest to you or your users
     - For India: Mumbai (ap-south-1)
     - For US: N. Virginia (us-east-1)
     - For Europe: Ireland (eu-west-1)
   
4. **Cluster Name:**
   - Leave default (Cluster0) or name it "BusTracker"

5. Click **"Create Cluster"** button (bottom right)

6. Wait 1-3 minutes for cluster creation (you'll see a progress indicator)

## Step 4: Create Database User

Once cluster is created, you'll see a "Security Quickstart" screen:

### 4.1 Create Database User

1. You'll see "How would you like to authenticate your connection?"
2. Select **"Username and Password"** (should be selected by default)
3. Create credentials:
   - **Username**: Choose a username (e.g., `busadmin`)
   - **Password**: Click "Autogenerate Secure Password" OR create your own
   - **IMPORTANT**: Copy and save this password somewhere safe! You'll need it later.

4. Click **"Create User"**

## Step 5: Set Up Network Access

### 5.1 Add IP Address

1. You'll see "Where would you like to connect from?"
2. You have two options:

   **Option A: My Local Environment (Recommended for Development)**
   - Click "Add My Current IP Address"
   - This adds your current IP automatically
   
   **Option B: Allow Access from Anywhere (Easier but less secure)**
   - Click "Add a Different IP Address"
   - Enter: `0.0.0.0/0`
   - Description: "Allow all IPs"
   - This allows connections from anywhere (needed for Vercel deployment)

3. Click **"Add Entry"** or **"Finish and Close"**

## Step 6: Get Your Connection String

1. Click **"Go to Database"** or navigate to "Database" in the left sidebar

2. You'll see your cluster (Cluster0 or BusTracker)

3. Click the **"Connect"** button

4. You'll see three options:
   - Drivers
   - MongoDB for VS Code
   - MongoDB Shell

5. Click **"Drivers"**

6. Select:
   - Driver: **Node.js**
   - Version: **5.5 or later** (or latest)

7. You'll see a connection string that looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

8. **Copy this connection string**

9. **Modify the connection string:**
   - Replace `<username>` with your database username (e.g., `busadmin`)
   - Replace `<password>` with your database password
   - Add database name after `.net/`: Add `bustracker`
   
   Final format:
   ```
   mongodb+srv://busadmin:YourPassword123@cluster0.xxxxx.mongodb.net/bustracker?retryWrites=true&w=majority
   ```

## Step 7: Test Your Connection

### Option 1: Using the Backend

1. Navigate to your backend folder:
   ```bash
   cd Bustracker/backend
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` file and add your connection string:
   ```
   MONGODB_URI=mongodb+srv://busadmin:YourPassword123@cluster0.xxxxx.mongodb.net/bustracker?retryWrites=true&w=majority
   JWT_SECRET=my-super-secret-jwt-key-12345
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Run the seed script to test connection:
   ```bash
   npm run seed
   ```

6. If successful, you'll see:
   ```
   MongoDB connected successfully
   ✓ 3 routes created
   ✓ 3 test users created
   ✓ 3 operators created
   ✓ 3 buses created
   ✅ Database seeded successfully!
   ```

### Option 2: Using MongoDB Compass (GUI Tool)

1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Install and open it
3. Paste your connection string
4. Click "Connect"
5. You should see your database

## Step 8: View Your Data in Atlas

1. Go back to MongoDB Atlas website
2. Click "Database" in left sidebar
3. Click "Browse Collections" on your cluster
4. You should see:
   - Database: `bustracker`
   - Collections: `users`, `operators`, `buses`, `routes`, `tickets`

## Common Issues and Solutions

### Issue 1: "Authentication failed"
**Solution**: 
- Double-check username and password in connection string
- Make sure you replaced `<password>` with actual password
- Password should NOT have `<` or `>` symbols

### Issue 2: "Connection timeout" or "Could not connect"
**Solution**:
- Check Network Access settings in Atlas
- Add IP address `0.0.0.0/0` to allow all connections
- Wait a few minutes after adding IP address

### Issue 3: "Database user not found"
**Solution**:
- Go to "Database Access" in Atlas sidebar
- Verify user exists
- Create new user if needed

### Issue 4: Special characters in password
**Solution**:
- If password has special characters like `@`, `#`, `%`, etc.
- You need to URL encode them:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `%` becomes `%25`
- Or regenerate password without special characters

## Security Best Practices

1. **Never commit `.env` file to Git** (already in .gitignore)
2. **Use strong passwords** for database users
3. **For production**: Use specific IP addresses instead of 0.0.0.0/0
4. **Rotate credentials** periodically
5. **Use different credentials** for development and production

## Next Steps

After successful setup:

1. ✅ MongoDB Atlas cluster created
2. ✅ Database user created
3. ✅ Network access configured
4. ✅ Connection string obtained
5. ✅ Local testing successful

Now you can:
- Run your backend locally: `npm start`
- Deploy to Vercel (see DEPLOYMENT.md)
- Connect ESP32 hardware

## Quick Reference

**MongoDB Atlas Dashboard**: https://cloud.mongodb.com

**Your Connection String Format**:
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.xxxxx.mongodb.net/bustracker?retryWrites=true&w=majority
```

**Important Atlas Sections**:
- **Database**: View and manage your clusters
- **Database Access**: Manage database users
- **Network Access**: Manage IP whitelist
- **Browse Collections**: View your data

## Need Help?

- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- MongoDB University (Free Courses): https://university.mongodb.com/
- Community Forums: https://www.mongodb.com/community/forums/

---

**Congratulations!** 🎉 Your MongoDB Atlas database is now ready for your Bus Tracker application!
