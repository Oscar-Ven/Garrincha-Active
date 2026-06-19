# Garrincha Active

Garrincha Active is a sports activity tracking, rewards, social, and challenge platform built for football and fitness communities. Players log activities, earn points, redeem rewards from sponsors, join teams, compete in challenges, and connect with other athletes through a social feed.

## Features

- **Activity Tracking** - Log runs, walks, cycling, football training, matches, and custom workouts with duration, distance, and notes
- **Points & Levels** - Earn points for every activity; level up from Bronze to Silver, Gold, and Elite
- **Rewards Marketplace** - Redeem points for sponsor-backed rewards: discounts, merchandise, free sessions, food & drink, tournament entries, and VIP access
- **Challenges** - Participate in distance, active-minutes, activity-count, and match-count challenges with leaderboards
- **Events** - Register for training sessions, tournaments, leagues, camps, and community events
- **Teams** - Create or join teams, manage members, and track collective achievements
- **Social Feed** - Share activity milestones, badge unlocks, challenge completions, and custom posts; react and comment
- **Badges & Achievements** - Unlock badges automatically based on activity milestones and challenge completions
- **Wallet** - Full points ledger history showing all credits and debits
- **Leaderboards** - Rank players by points across all levels or filtered by level tier
- **Sponsors** - Sponsor portal to manage campaigns and track reward redemption analytics
- **Admin Dashboard** - Platform admin tools for player management, activity moderation, content oversight, reports, and app settings
- **Center Admin** - Sports center admins can manage local events, challenges, and player registrations
- **Notifications** - In-app notification system for follows, reactions, challenge invites, and badges
- **Profile & Settings** - Editable public profile with bio, avatar, and privacy controls

## Tech Stack

- Next.js 16 App Router
- TypeScript 5 (strict)
- Prisma 7 (SQLite for local dev)
- Tailwind CSS 4
- bcryptjs for auth
- React 19
- lucide-react icons
- shadcn-style UI components

## Prerequisites

- Node.js 20+
- npm

## Setup & Installation

```bash
cd D:\GG
npm install
cp .env.example .env
# Edit .env: set SESSION_SECRET and DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
npm run seed
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite connection string, e.g. `file:./dev.db` |
| `SESSION_SECRET` | Random string of 32+ characters used to sign JWT session cookies |

## Demo Accounts

| Email | Password | Role |
|---|---|---|
| `admin@garrincha.com` | `password123` | PLATFORM_ADMIN |
| `center@garrincha.com` | `password123` | CENTER_ADMIN |
| `sponsor@garrincha.com` | `password123` | SPONSOR_ADMIN |
| `player@garrincha.com` | `password123` | PLAYER |

## Running the App

```bash
# Development server
npm run dev
# Visit http://localhost:3000

# Production build
npm run build && npm start
```

## Database Commands

```bash
npm run db:push       # Push schema changes without creating a migration
npm run db:migrate    # Create and apply a new migration
npm run db:studio     # Open Prisma Studio GUI at http://localhost:5555
npm run seed          # Re-seed the database with demo data
```

## Project Structure

```
D:\GG
├── prisma/
│   ├── schema.prisma       # Database schema and model definitions
│   └── seed.ts             # Demo data seeding script
└── src/
    ├── app/
    │   ├── (public)/       # Public-facing marketing and auth pages (login, register, landing)
    │   ├── app/            # Authenticated player-facing app (dashboard, feed, activities, rewards, etc.)
    │   └── admin/          # Admin and center-admin dashboards
    ├── components/
    │   └── ui/             # Reusable shadcn-style UI primitives (Button, Card, Dialog, etc.)
    ├── lib/
    │   ├── auth.ts         # JWT session helpers (getCurrentUser, signToken, etc.)
    │   ├── db.ts           # Prisma client singleton
    │   ├── points-rules.ts # Points calculation rules per activity type
    │   └── utils.ts        # cn() class-merging utility and shared helpers
    ├── services/           # Business logic layer (activities, badges, challenges, events, feed, leaderboard, points, rewards, social, admin)
    ├── types/              # Shared TypeScript types and interfaces
    └── middleware.ts       # Route protection and role-based access control
```

## Known Limitations

- Manual activity logging only (no GPS live tracking in Phase 1)
- QR code scanning is placeholder (shows redemption code as text)
- Sponsor analytics are basic counters
- No payment integration
- No Strava or wearable integration
- No real email sending (placeholder for notifications)
- SQLite not suitable for production (migrate to PostgreSQL)

## Next Phases

- Phase 2: Mobile app (React Native) with live GPS tracking
- Phase 3: Real-time features (WebSockets for live leaderboards)
- Phase 4: Payment integration for premium rewards
- Phase 5: Strava/wearable API integration
