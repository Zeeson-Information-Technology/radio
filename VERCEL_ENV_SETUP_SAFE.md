# Vercel Environment Variables Setup

**⚠️ IMPORTANT: Replace placeholder values with your actual credentials**
- Use the same values from your local `.env.local` file
- Never commit actual credentials to Git repositories

## Critical Missing Variables Causing 403 Forbidden

The following environment variables MUST be set in Vercel dashboard:

### 1. Authentication (CRITICAL)
```
JWT_SECRET=YOUR_JWT_SECRET_FROM_LOCAL_ENV
```

### 2. Database (CRITICAL)
```
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
```

### 3. AWS S3 (CRITICAL for file upload)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET=almanhaj-radio-audio
```

### 4. Gateway Communication (CRITICAL)
```
GATEWAY_URL=http://98.93.42.61:8080
INTERNAL_API_KEY=YOUR_INTERNAL_API_KEY
```

### 5. Server-Side Rendering (CRITICAL for Schedule/Programs)
```
VERCEL_URL=almanhaj.vercel.app
```

### 6. Production URLs
```
NODE_ENV=production
NEXTAUTH_URL=https://almanhaj.vercel.app
NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://98.93.42.61:8080
STREAM_URL=http://98.93.42.61:8000/stream
NEXT_PUBLIC_STREAM_URL=http://98.93.42.61:8000/stream
```

### 7. Streaming Configuration
```
ICECAST_HOST=98.93.42.61
ICECAST_PORT=8000
ICECAST_MOUNT=/stream
STREAM_HOST=98.93.42.61
STREAM_PORT=8000
STREAM_PASSWORD=your_stream_password_here
```

## How to Set These in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (almanhaj)
3. Go to Settings → Environment Variables
4. Add each variable above with its value from your local .env.local file
5. Set Environment: Production
6. Click Save
7. Redeploy the application

## After Setting Variables

1. Clear browser cookies for almanhaj.vercel.app
2. Log in again on the live site
3. Test file upload functionality
4. Test Weekly Schedule and Programs display

## Verification Commands

Run these locally to verify Vercel environment:
```bash
npm run verify:vercel
npm run test:vercel-auth
```