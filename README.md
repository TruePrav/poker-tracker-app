# Poker Tracker

A tournament management app for home poker games.

## Stack
- **Frontend:** React + Vite + TailwindCSS + Zustand
- **Backend:** Express + PostgreSQL (Supabase)
- **Deployment:** Vercel (frontend + serverless API)

## Features
- Create and manage poker tournaments
- Player seating with visual table layout
- Blind level timer with break overlays
- Buy-ins, rebuys, top-ups with action log & undo
- Chip-based payout calculator
- Tournament history and player stats

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project with PostgreSQL

### Install
```bash
npm install
```

### Environment Variables
Copy `server/.env.example` to `server/.env` and fill in your Supabase credentials:
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

### Run locally
```bash
npm run dev
```

### Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — your Supabase connection string
   - `CORS_ORIGIN` — your Vercel deployment URL (e.g. `https://poker-tracker-app.vercel.app`)
4. Deploy
