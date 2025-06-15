# Railway Deployment Guide - CodeLab

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:
- ✅ GitHub account with your CodeLab repository
- ✅ Railway account (sign up at [railway.app](https://railway.app))
- ✅ AWS Cognito User Pool set up (we'll configure this later)
- ✅ MongoDB Atlas account (free tier) or Railway's MongoDB service

---

## 🚀 Step-by-Step Deployment Process

### Phase 1: Create Railway Project and Link GitHub

#### Step 1.1: Create New Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** in the top-right corner
3. Select **"Deploy from GitHub repo"**
4. **If first time**: Railway will prompt you to link your GitHub account - click **"Link GitHub Account"** and authorize

#### Step 1.2: Select Your Repository
1. Search for your CodeLab repository in the list
2. Click on your **CodeLab repository** 
3. **Important**: Choose **"Add variables"** (NOT "Deploy Now")
   - This prevents immediate deployment and lets us configure properly

### Phase 2: Deploy Backend Service

#### Step 2.1: Configure Backend Service
1. You should now be on the **Project Canvas**
2. A service will be created automatically from your repo
3. **Click on the service tile** to open service settings
4. Click the **"Settings"** tab

#### Step 2.2: Set Backend Root Directory
1. In Settings, scroll down to **"Service Source"** section
2. Find **"Root Directory"** field
3. Enter: **`api`** (this tells Railway to deploy from the /api folder)
4. Click **"Save"** or the field will auto-save

#### Step 2.3: Add Backend Environment Variables
1. Still in the service settings, click the **"Variables"** tab
2. Click **"New Variable"** for each variable below:

**Required Variables:**
```bash
NODE_ENV=production
DB_NAME=code_colab
COGNITO_USER_POOL_ID=your_cognito_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id  
COGNITO_REGION=your_aws_region
COOKIE_SAME_SITE=strict
```

**Database Variables (choose one option):**

**Option A - MongoDB Atlas (Recommended):**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/code_colab?retryWrites=true&w=majority
```

**Option B - Railway's MongoDB:**
```bash
MONGODB_URI=${{MongoDB.DATABASE_URL}}
```

**CORS Variables (we'll update these after frontend is deployed):**
```bash
CORS_ORIGIN=*
FRONTEND_URL=*
```

3. Click **"Deploy"** at the top of the project canvas to start deployment

#### Step 2.4: Generate Backend Domain
1. **Wait for deployment to complete** (watch the deployment logs)
2. Once successful, go to **Settings** → **"Networking"** section
3. Under **"Public Networking"**, click **"Generate Domain"**
4. **Copy the generated domain** (e.g., `https://backend-production-abc123.up.railway.app`)
5. **Important**: Save this domain - you'll need it for frontend configuration

### Phase 3: Deploy Frontend Service

#### Step 3.1: Add Frontend Service
1. Go back to the **Project Canvas**
2. Click **"New"** button (top-right) or **"+ Add Service"**
3. Select **"GitHub Repo"**
4. Choose your **same CodeLab repository**
5. Choose **"Add variables"** (not "Deploy Now")

#### Step 3.2: Configure Frontend Service
1. Click on the **new frontend service tile**
2. Go to **"Settings"** tab
3. **Leave "Root Directory" EMPTY** (frontend is in the root of your repo)

#### Step 3.3: Add Frontend Environment Variables
1. Click the **"Variables"** tab
2. Add these variables using **"New Variable"**:

```bash
VITE_NODE_ENV=production
VITE_AWS_COGNITO_USER_POOL_ID=your_cognito_pool_id
VITE_AWS_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_AWS_REGION=your_aws_region
VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN_HERE
VITE_WS_URL=wss://YOUR_BACKEND_DOMAIN_HERE
```

**Replace `YOUR_BACKEND_DOMAIN_HERE` with the backend domain from Step 2.4**

3. Click **"Deploy"** to start frontend deployment

#### Step 3.4: Generate Frontend Domain
1. **Wait for frontend deployment to complete**
2. Go to **Settings** → **"Networking"** section  
3. Under **"Public Networking"**, click **"Generate Domain"**
4. **Copy the frontend domain** (e.g., `https://frontend-production-xyz789.up.railway.app`)

### Phase 4: Update CORS Configuration

#### Step 4.1: Update Backend CORS Variables
1. Go to your **backend service** → **"Variables"** tab
2. **Update these variables** with your frontend domain:

```bash
CORS_ORIGIN=https://your-frontend-domain.up.railway.app
FRONTEND_URL=https://your-frontend-domain.up.railway.app
```

3. The service will **automatically redeploy** after variable changes

### Phase 5: Set Up AWS Cognito

#### Step 5.1: Create Cognito User Pool
1. Go to [AWS Console](https://console.aws.amazon.com) → **Cognito**
2. Click **"Create user pool"**
3. **Configure sign-in options:**
   - Check **"Email"**
   - Uncheck "Username" and "Phone number"
4. **Security requirements:** Choose **"Cognito defaults"**
5. **Sign-up experience:** Leave as default
6. **Message delivery:** Choose **"Send email with Cognito"** (free tier)
7. **Integrate your app:**
   - User pool name: **"CodeLab-Users"**
   - App client name: **"CodeLab-Web"**
   - **Don't generate a client secret** (leave unchecked)
8. Click **"Create user pool"**

#### Step 5.2: Get Cognito Configuration
1. In your new user pool, copy:
   - **User pool ID** (format: `us-east-1_XXXXXXXXX`)
   - **App client ID** (format: long alphanumeric string)
   - **AWS Region** (e.g., `us-east-1`)

#### Step 5.3: Update Railway Environment Variables
1. Go to **both services** in Railway
2. Update the Cognito variables with **real values**:

**Backend Variables:**
```bash
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_real_client_id
COGNITO_REGION=us-east-1
```

**Frontend Variables:**
```bash
VITE_AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_AWS_COGNITO_CLIENT_ID=your_real_client_id
VITE_AWS_REGION=us-east-1
```

Both services will **automatically redeploy** with new variables.

---

## 🧪 Testing Your Deployment

### Step 6.1: Test Backend Health
1. Open: `https://your-backend-domain.up.railway.app/health`
2. Should return: `{"status": "healthy", "timestamp": "..."}`

### Step 6.2: Test Frontend
1. Open: `https://your-frontend-domain.up.railway.app`
2. Should load the CodeLab homepage
3. Try creating an account to test Cognito integration

### Step 6.3: Test WebSocket Connection
1. Create or join a coding session
2. Check browser console for WebSocket connection logs
3. Test real-time collaboration features

---

## 🔧 Environment Variables Reference

### Backend Service Final Configuration:
```bash
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
DB_NAME=code_colab
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_cognito_client_id
COGNITO_REGION=us-east-1
CORS_ORIGIN=https://your-frontend-domain.up.railway.app
FRONTEND_URL=https://your-frontend-domain.up.railway.app
COOKIE_SAME_SITE=strict
```

### Frontend Service Final Configuration:
```bash
VITE_NODE_ENV=production
VITE_AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_AWS_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_AWS_REGION=us-east-1
VITE_API_BASE_URL=https://your-backend-domain.up.railway.app
VITE_WS_URL=wss://your-backend-domain.up.railway.app
```

---

## 🐛 Troubleshooting

### Deployment Fails
1. Check **deployment logs** in Railway dashboard
2. Scroll through **entire log** - errors are often not at the bottom
3. Common issues:
   - Missing environment variables
   - Incorrect root directory
   - Build command failures

### WebSocket Issues
1. Ensure backend domain uses `wss://` (not `ws://`)
2. Check CORS configuration matches frontend domain exactly
3. Verify no firewall blocking WebSocket connections

### Authentication Issues
1. Verify Cognito User Pool ID and Client ID are correct
2. Check AWS region matches in all configurations
3. Ensure Cognito app client doesn't have client secret enabled

### Database Connection Issues
1. Check MongoDB Atlas IP whitelist (allow `0.0.0.0/0` for Railway)
2. Verify connection string format and credentials
3. Check Railway service logs for specific error messages

---

## 🎉 Success!

Your CodeLab application should now be fully deployed and functional on Railway with:
- ✅ Backend API with database connection
- ✅ Frontend with real-time WebSocket communication  
- ✅ AWS Cognito authentication
- ✅ Automatic HTTPS and WSS
- ✅ Auto-deployment on GitHub pushes

**Access your app at:** `https://your-frontend-domain.up.railway.app`

**API endpoint:** `https://your-backend-domain.up.railway.app`
