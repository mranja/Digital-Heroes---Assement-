# Digital Heroes MVP

A modern, high-performance web application based on the "Digital Heroes" PRD for a Golf Charity Subscription Platform.

## Features Built
- **MERN-Styled Stack:** React 18+ Vite Frontend, Express/Node Backend.
- **Mock Relational Mode:** The PRD mentions Supabase but requests a MERN-stack architecture. To ensure it runs perfectly out of the box without requiring Vercel & Supabase `.env` keys right now, an active mock schema stands in for the database layer (`global.db` in Node). This can be easily replaced via `@supabase/supabase-js`.
- **The "Latest 5" Score System:** Follows exact constraints (FIFO queue mapped to scores 1-45, displaying reverse chronological on Dashboard).
- **Automated Giving / Charity Routing:** Dynamic donation percentages configured per-user; mock Stripe system updates balances locally.
- **Draw Analytics Panel:** Includes Simulation Mode vs Official Mode with algorithmic hooks. 1-45 drawn 5 numbers with Jackpot matching constraints.
- **UI & Aesthetic Structure:** Custom standard CSS focusing on emotion, high-frame-rate interaction, glassmorphism, and dark mode dynamics using Framer Motion (NO Tailwind).

## Test Credentials
The server includes these out-of-the-box (no registration required):

**Admin Control:**
- **Email:** `ranjan.m1325@gmail.com`
- **Password:** `Admin@digitalheroes`

**Demo Standard User:**
- **Email:** `test@user.com`
- **Password:** `password`

## Installation and Execution

Everything is wrapped in a workspace controller:

1. Install all dependencies across Client and Server:
```bash
npm run install-all
```

2. Boot the cluster (runs Vite dev server + Nodemon backend concurrently):
```bash
npm run dev
```

3. Open **http://localhost:5173** to view the application.

## Deploying to Vercel
1. Set Vercel root directory to `/client` if running a separate backend. 
2. For Serverless deployment of the Express app, create a `vercel.json`:
```json
{
  "version": 2,
  "rewrites": [{ "source": "/(.*)", "destination": "/api/server" }]
}
```
*Note: Make sure to map environment constants in the dashboard (`STRIPE_SECRET_KEY`, `SUPABASE_URL`, etc.) prior to pushing to production.*
