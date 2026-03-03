#!/bin/bash

# Bus Tracker - Vercel Deployment Script

echo "🚌 Bus Tracker - Vercel Deployment"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
    echo ""
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env not found"
    echo "Make sure you have your MongoDB URI ready"
    echo ""
fi

echo "📋 Pre-deployment checklist:"
echo "  ✅ MongoDB Atlas cluster created"
echo "  ✅ Database user created"
echo "  ✅ Network access configured (0.0.0.0/0)"
echo "  ✅ Connection string ready"
echo ""

read -p "Have you completed the checklist? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Please complete the checklist first"
    echo "📖 See MONGODB_SETUP_GUIDE.md for help"
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📝 Next steps:"
echo "  1. Add environment variables in Vercel dashboard:"
echo "     - MONGODB_URI"
echo "     - JWT_SECRET"
echo "     - NODE_ENV=production"
echo ""
echo "  2. Seed your production database:"
echo "     - Update backend/.env with production MongoDB URI"
echo "     - Run: cd backend && npm run seed"
echo ""
echo "  3. Test your deployment:"
echo "     - Visit your Vercel URL"
echo "     - Login with: STU001 / password123"
echo "     - Test live map tracking"
echo ""
echo "📖 Full guide: VERCEL_DEPLOYMENT.md"
echo ""
echo "🎉 Happy tracking!"
