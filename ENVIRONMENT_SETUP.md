# Environment Setup

This document explains how to set up environment variables for CodeLab.

## Security Notice
⚠️ **NEVER commit actual .env files with real credentials to version control!**

## Frontend Environment Variables

Copy `.env.example` to `.env` and `.env.local`:

```bash
cp .env.example .env
cp .env.example .env.local
```

Fill in the following values:

### Required AWS Cognito Configuration
- `VITE_AWS_COGNITO_USER_POOL_ID`: Your AWS Cognito User Pool ID
- `VITE_AWS_COGNITO_CLIENT_ID`: Your AWS Cognito App Client ID  
- `VITE_AWS_REGION`: AWS region (e.g., ap-south-1)

### API Configuration
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:3001)
- `VITE_WEBSOCKET_URL`: WebSocket URL (default: ws://localhost:3001)

## Backend Environment Variables

Copy `api/.env.example` to `api/.env`:

```bash
cp api/.env.example api/.env
```

Fill in the following values:

### Database Configuration
- `MONGODB_URI`: Your MongoDB connection string
- `MONGODB_ATLAS_URI`: MongoDB Atlas connection (optional fallback)
- `MONGODB_LOCAL_URI`: Local MongoDB connection (optional fallback)

### Security Configuration
Generate secure random secrets (minimum 32 characters each):
- `JWT_SECRET`: Secret for JWT token signing
- `JWT_REFRESH_SECRET`: Secret for refresh token signing
- `SESSION_SECRET`: Secret for session management

You can generate secure secrets using:
```bash
# Generate a secure random secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### AWS Cognito Configuration
- `COGNITO_USER_POOL_ID`: Your AWS Cognito User Pool ID
- `COGNITO_CLIENT_ID`: Your AWS Cognito App Client ID
- `COGNITO_CLIENT_SECRET`: Your AWS Cognito App Client Secret
- `COGNITO_REGION`: AWS region

## Development vs Production

### Development
- Set `NODE_ENV=development`
- Use `localhost` URLs
- Enable debug logging

### Production
- Set `NODE_ENV=production`
- Use production URLs with HTTPS
- Use secure, randomly generated secrets
- Configure proper CORS origins
- Use production MongoDB cluster

## Environment File Structure

```
├── .env.example          # Frontend template (safe to commit)
├── .env                  # Frontend config (DO NOT COMMIT)
├── .env.local           # Frontend local overrides (DO NOT COMMIT)
├── api/
│   ├── .env.example     # Backend template (safe to commit)
│   └── .env             # Backend config (DO NOT COMMIT)
```
