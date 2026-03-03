@echo off
REM Bus Tracker - Vercel Deployment Script for Windows

echo.
echo 🚌 Bus Tracker - Vercel Deployment
echo ====================================
echo.

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI not found!
    echo 📦 Installing Vercel CLI...
    call npm install -g vercel
    echo ✅ Vercel CLI installed
    echo.
)

REM Check if .env exists
if not exist "backend\.env" (
    echo ⚠️  Warning: backend\.env not found
    echo Make sure you have your MongoDB URI ready
    echo.
)

echo 📋 Pre-deployment checklist:
echo   ✅ MongoDB Atlas cluster created
echo   ✅ Database user created
echo   ✅ Network access configured (0.0.0.0/0)
echo   ✅ Connection string ready
echo.

set /p REPLY="Have you completed the checklist? (y/n): "
if /i not "%REPLY%"=="y" (
    echo ❌ Please complete the checklist first
    echo 📖 See MONGODB_SETUP_GUIDE.md for help
    exit /b 1
)

echo.
echo 🚀 Starting deployment...
echo.

REM Deploy to Vercel
call vercel --prod

echo.
echo ✅ Deployment initiated!
echo.
echo 📝 Next steps:
echo   1. Add environment variables in Vercel dashboard:
echo      - MONGODB_URI
echo      - JWT_SECRET
echo      - NODE_ENV=production
echo.
echo   2. Seed your production database:
echo      - Update backend\.env with production MongoDB URI
echo      - Run: cd backend ^&^& npm run seed
echo.
echo   3. Test your deployment:
echo      - Visit your Vercel URL
echo      - Login with: STU001 / password123
echo      - Test live map tracking
echo.
echo 📖 Full guide: VERCEL_DEPLOYMENT.md
echo.
echo 🎉 Happy tracking!
echo.
pause
