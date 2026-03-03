# Deployment Guide for Vercel

## Prerequisites

1. MongoDB Atlas account (free tier available)
2. Vercel account (free tier available)
3. Git repository

## Step 1: Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free account or sign in
3. Create a new cluster (M0 Free tier)
4. Click "Connect" on your cluster
5. Add your IP address (or allow access from anywhere: 0.0.0.0/0)
6. Create a database user with username and password
7. Choose "Connect your application"
8. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
9. Replace `<password>` with your actual password
10. Add database name: `mongodb+srv://username:password@cluster.mongodb.net/bustracker?retryWrites=true&w=majority`

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Navigate to project directory:
```bash
cd Bustracker
```

3. Login to Vercel:
```bash
vercel login
```

4. Deploy:
```bash
vercel
```

5. Add environment variables:
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
```

6. Redeploy with environment variables:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

6. Add Environment Variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string (generate one at https://randomkeygen.com/)
   - `NODE_ENV`: production

7. Click "Deploy"

## Step 3: Test Your Deployment

Once deployed, test these endpoints:

1. Health check:
```
GET https://your-app.vercel.app/api/health
```

2. Register a user:
```
POST https://your-app.vercel.app/api/auth/register
Body: {
  "name": "Test User",
  "collegeId": "TEST001",
  "phone": "1234567890",
  "email": "test@example.com",
  "password": "password123"
}
```

3. Login:
```
POST https://your-app.vercel.app/api/auth/login
Body: {
  "collegeId": "TEST001",
  "password": "password123"
}
```

## Step 4: Update ESP32 Configuration

Update your ESP32 code to point to your Vercel URL:

```cpp
const char* serverUrl = "https://your-app.vercel.app/api/hardware/location";
```

## Environment Variables Reference

Required environment variables:

- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT token generation (min 32 characters)
- `NODE_ENV`: Set to "production"

Optional:
- `PORT`: Port number (Vercel handles this automatically)
- `ALLOWED_ORIGINS`: CORS allowed origins

## Troubleshooting

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check connection string format
- Ensure database user has read/write permissions

### API Not Working
- Check Vercel function logs in dashboard
- Verify environment variables are set correctly
- Ensure vercel.json is in root directory

### CORS Errors
- Update ALLOWED_ORIGINS environment variable
- Check frontend is using correct API URL

## Local Development

1. Copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```

2. Update `.env` with your MongoDB URI

3. Install dependencies:
```bash
npm install
```

4. Run locally:
```bash
npm start
```

## Notes

- Vercel free tier includes 100GB bandwidth/month
- MongoDB Atlas free tier includes 512MB storage
- Serverless functions have 10-second execution limit
- Consider upgrading for production use with high traffic
