# Railway Deployment Guide

## Quick Deployment Steps

### 1. Create Railway Project
1. Go to [Railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repository

### 2. Deploy Backend Service
1. Add service from GitHub repo
2. Set root directory to `/api`
3. Add environment variables from `.env.railway.example`
4. Enable public networking (generates RAILWAY_PUBLIC_DOMAIN)

### 3. Deploy Frontend Service  
1. Add another service from same GitHub repo
2. Set root directory to `/` (root)
3. Add environment variables (use Backend's RAILWAY_PUBLIC_DOMAIN for API URLs)
4. Enable public networking

### 4. Environment Variables Setup

**Backend Service:**
```bash
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_uri
DB_NAME=code_colab
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id  
COGNITO_REGION=your_region
CORS_ORIGIN=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
COOKIE_SAME_SITE=strict
```

**Frontend Service:**
```bash
VITE_NODE_ENV=production
VITE_AWS_COGNITO_USER_POOL_ID=your_pool_id
VITE_AWS_COGNITO_CLIENT_ID=your_client_id
VITE_AWS_REGION=your_region
VITE_API_BASE_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
VITE_WS_URL=wss://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
```

## Ready for Deployment ✅

- ✅ Environment variables unified and Railway-ready
- ✅ WebSocket configuration optimized for Railway
- ✅ Frontend builds successfully
- ✅ Backend has proper start script
- ✅ No hardcoded URLs remaining
- ✅ CORS properly configured with reference variables

## What Railway Will Do Automatically

- 🔧 Detect Node.js and run `npm install`
- 🔧 For backend: Run `npm start` (starts server on PORT from env)
- 🔧 For frontend: Run `npm run build` then serve static files
- 🔧 Provide HTTPS and WSS automatically
- 🔧 Generate public domains for each service

**You're ready to deploy!** 🚀
