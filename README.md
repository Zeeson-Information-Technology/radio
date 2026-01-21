# Al-Manhaj Radio

A simple online Islamic radio web application built with Next.js, allowing admins to broadcast live lectures and listeners to tune in.

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: MongoDB Atlas
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Streaming**: External Icecast + Liquidsoap server

## Project Structure

```
online-radio/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home page
│   ├── radio/
│   │   └── page.tsx        # Radio player page
│   └── admin/
│       ├── login/
│       │   └── page.tsx    # Admin login
│       └── live/
│           └── page.tsx    # Live stream control
├── lib/
│   └── config.ts           # Environment configuration
└── .env.local              # Environment variables (not in git)
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (for Phase 2+)
- Icecast streaming server (for Phase 5+)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and configure:
   ```bash
   cp .env.example .env.local
   ```

4. Set up MongoDB:
   - Create a MongoDB Atlas cluster (free tier) OR install MongoDB locally
   - Add your connection string to `.env.local`:
     ```env
     MONGODB_URI=your_mongodb_connection_string_here
     ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Test database connection:
   - Visit [http://localhost:3000/api/db-test](http://localhost:3000/api/db-test)
   - You should see a JSON response confirming the connection

7. Open [http://localhost:3000](http://localhost:3000)

## Development Phases

### Phase 1 - Next.js App Scaffold ✅
- Basic Next.js project setup
- Pages: Home, Radio, Admin Login, Admin Live Control
- Navigation layout
- Placeholder audio player
- Environment variable configuration

### Phase 2 - Database Integration ✅ (Current)
- MongoDB connection setup with Mongoose
- Data models: AdminUser, LiveState, Schedule, Episode
- Database connection helper with caching
- Database test endpoint

### Phase 3 - Admin Authentication (Upcoming)
- Login API endpoint
- JWT/session-based authentication
- Protected admin routes

### Phase 4 - Live State API & Radio Integration (Upcoming)
- Live state management API
- Dynamic radio player
- Admin live control functionality

### Phase 5 - Streaming Server Integration (Upcoming)
- Icecast server configuration
- Streaming instructions for admins

### Phase 6 - Optional Polish (Future)
- Schedule management
- Episodes listing
- Additional UX improvements

## Environment Variables

See `.env.example` for required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `STREAM_URL` - Public streaming server URL
- `STREAM_HOST` - Streaming server host
- `STREAM_PORT` - Streaming server port
- `STREAM_MOUNT` - Icecast mount point
- `STREAM_PASSWORD` - Streaming password

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features

### For Listeners
- Simple radio player interface
- Live/Offline status indicator
- One-click play/pause
- Current lecture information

### For Admins
- Secure login system
- Live stream control
- Set lecture title and lecturer name
- Streaming server instructions

## License

Private project - All rights reserved
