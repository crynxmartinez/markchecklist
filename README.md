# Agent Onboarding Checklist

A Next.js application for tracking agent onboarding progress with Prisma database integration.

## Features

- 📋 26-item onboarding checklist
- 👥 Agent management (55 agents pre-seeded)
- 📊 Real-time progress tracking
- 💾 Persistent storage with Prisma + PostgreSQL
- 🔗 GHL form integration
- ➕ Add new agents dynamically

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Database

The `.env` file already contains your Prisma database connection string.

Push the schema to your database:

```bash
npm run db:push
```

### 3. Seed Initial Agents

Seed the database with 55 agents:

```bash
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Select an agent** from the dropdown
2. **Check off** completed onboarding items
3. **Progress bar** updates automatically
4. **Hidden fields** in GHL form are auto-populated:
   - `email` - Agent's email
   - `checklist_percentage` - Completion percentage
5. **Submit GHL form** - Progress is saved to database

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variable:
   - `DATABASE_URL` = (your Prisma connection string from `.env`)
4. Deploy!

### 3. Run Database Setup on Vercel

After first deployment, run these commands in Vercel's terminal or locally:

```bash
npx prisma db push
npx prisma db seed
```

## API Routes

- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/[id]` - Update agent progress

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Prisma)
- **Styling:** TailwindCSS
- **Deployment:** Vercel

## Database Schema

```prisma
model Agent {
  id              String   @id @default(cuid())
  name            String   @unique
  email           String   @unique
  checklistState  Json     @default("[]")
  percentage      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Notes

- Progress is saved when GHL form is submitted
- No auto-save to avoid performance issues
- All 55 agents are pre-loaded from seed script
- New agents can be added via the UI
