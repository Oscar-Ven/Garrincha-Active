# Garrincha Active — Player Guide

Welcome to Garrincha Active, a sports activity tracking, rewards, social, and challenge platform built for players who want to turn every workout into progress, recognition, and community.

---

## Table of Contents

1. [Getting Started — Registration](#1-getting-started--registration)
2. [Logging Activities](#2-logging-activities)
3. [Earning Points](#3-earning-points)
4. [Levels and Badges](#4-levels-and-badges)
5. [Redeeming Rewards](#5-redeeming-rewards)
6. [Joining Challenges](#6-joining-challenges)
7. [The Social Feed](#7-the-social-feed)
8. [Following Other Players](#8-following-other-players)
9. [Joining Events](#9-joining-events)
10. [Teams](#10-teams)
11. [Notifications](#11-notifications)
12. [Account Settings](#12-account-settings)
13. [Demo Accounts](#13-demo-accounts)

---

## 1. Getting Started — Registration

### Create Your Account

1. Open the app and tap **Get Started** on the landing page, or navigate to `/register`.
2. Fill in the registration form:
   - **Full Name** — your display name visible to other players.
   - **Nickname** — a unique handle (e.g. `@rafa_runs`). Must be unique across the platform.
   - **Email** — used for login and notifications.
   - **Password** — minimum 8 characters.
   - **Date of Birth** (optional) — used for age-group leaderboards.
   - **Phone** (optional).
3. Tap **Create Account**.
4. You are automatically signed in and taken to your dashboard.

### Logging In

Navigate to `/login`, enter your email and password, and tap **Sign In**. Your session is maintained via a secure HTTP-only cookie; you stay logged in across browser tabs.

### Your Profile

After registration, visit **Profile** (top navigation or `/app/profile`) to:

- Upload a profile photo.
- Write a short bio.
- Set your favourite sport.
- Link to a sports center if you train at one of the registered centers.

---

## 2. Logging Activities

Activities are the core of Garrincha Active. Every session you log earns you points and contributes to challenges.

### Supported Activity Types

| Type | Description |
|---|---|
| Run | Outdoor or treadmill running |
| Walk | Walking and hiking |
| Cycling | Road, mountain, or stationary bike |
| Football Training | Individual or group training session |
| Football Match | Competitive or friendly match |
| Fitness | Gym, strength, HIIT, yoga, etc. |
| Custom | Any other sport or activity |

### How to Log an Activity

1. Tap the **+ Log Activity** button in the navigation bar or on your dashboard.
2. Select the **Activity Type**.
3. Fill in the details:
   - **Title** — give the session a name (e.g. "Morning 5K").
   - **Date and Time** — when the session started.
   - **Duration** — total time in minutes (required).
   - **Distance** — kilometres covered (optional, available for Run, Walk, Cycling).
   - **Calories Burned** (optional).
   - **Description** — notes about the session (optional).
4. Set **Visibility**:
   - **Public** — visible to all users on the feed.
   - **Followers** — visible only to players who follow you.
   - **Private** — visible only to you.
5. Optionally attach a photo.
6. Tap **Save Activity**.

Points are calculated automatically based on duration and activity type (see Section 3). Your activity appears on your profile and, if Public or Followers, on the social feed.

### Activity Status

Most activities are approved instantly. Activities flagged for unusual values (very high speed, implausible distance) may enter a **Pending** or **Flagged** state pending admin review. You will receive a notification once reviewed.

---

## 3. Earning Points

Points are the currency of Garrincha Active. They are tracked in your **Points Wallet** and used to unlock rewards.

### How You Earn Points

| Source | How |
|---|---|
| **Activity** | Automatically awarded when you log and save an activity |
| **Challenge Completion** | Bonus points when you complete a challenge |
| **Event Attendance** | Points credited after attending a registered event |
| **Badge Award** | Some badges carry a point bonus |
| **Referral** | Invite a friend who registers using your referral link |
| **Admin Bonus** | Occasional platform promotions or corrections |

### Points Calculation for Activities

Points per activity are based on duration and type. As a rough guide:

- Every 10 minutes of activity = base points.
- Higher-intensity types (Football Match, Run, Cycling) earn more per minute than lower-intensity types (Walk).
- Accurate GPS data or verified distance can boost points for distance-based activities.

### Checking Your Balance

Your current point balance is shown in the **Wallet** section (`/app/wallet`). The wallet displays:

- **Available Points** — spendable balance.
- **Lifetime Points** — all-time total earned (used for level progression, never decreases).
- **Transaction History** — full ledger of every earn and spend event with source and date.

---

## 4. Levels and Badges

### Levels

Your level is determined by your **Lifetime Points** total. There are four tiers:

| Level | Colour | Lifetime Points Required |
|---|---|---|
| Bronze | Brown/Copper | Starting level |
| Silver | Silver | Intermediate milestone |
| Gold | Gold | Advanced milestone |
| Elite | Green/Gold | Top tier |

Level up automatically as your lifetime points grow. Your current level badge is displayed on your profile and next to your name on the leaderboard.

### Badges

Badges are achievements awarded for specific milestones:

- Completing your first activity.
- Reaching a streak (e.g. 7 consecutive days of activity).
- Logging a certain total distance (e.g. 100 km).
- Completing challenges.
- Attending events.
- Admin-awarded badges for special participation.

Newly earned badges appear in a notification and are shared to your feed (unless your visibility is Private). You can view all your badges on your profile page.

---

## 5. Redeeming Rewards

Rewards let you convert your points into real-world benefits provided by sports centers and sponsors.

### Reward Categories

| Category | Examples |
|---|---|
| Discount | % off at a partner center or store |
| Merchandise | Branded gear, kit |
| Free Session | One free training session at a partner center |
| Food & Drink | Voucher at a partner cafe or restaurant |
| Tournament Entry | Free entry to a tournament |
| Sponsor Voucher | Voucher code from a brand partner |
| VIP Access | Priority booking, backstage access |

### How to Redeem

1. Go to **Rewards** in the navigation (`/app/rewards`).
2. Browse available rewards. Each card shows:
   - Reward name, category, and description.
   - Points cost.
   - Expiry date (if applicable).
   - Remaining stock.
3. Tap a reward to see full details.
4. Tap **Redeem** and confirm.
5. Your points are deducted and a **Redemption Code** is generated.
6. View your redemption codes in **Wallet > Redemptions** or on the reward detail page.
7. Present your redemption code at the partner center or enter it on the sponsor's website.

### Redemption Statuses

| Status | Meaning |
|---|---|
| Pending | Code generated, not yet used |
| Used | Code has been presented and marked used |
| Cancelled | Redemption was cancelled before use |
| Expired | Code expired before use |

---

## 6. Joining Challenges

Challenges are time-limited goals that push you to achieve targets alongside other players.

### Challenge Types

| Type | Goal |
|---|---|
| Distance | Total kilometres covered in the period |
| Active Minutes | Total minutes of activity |
| Activity Count | Number of individual sessions logged |
| Football Training Attendance | Number of training sessions |
| Match Count | Number of matches played |
| Points | Total points earned |
| Center vs Center | Your center competes against another center |
| Team | Your team competes against other teams |

### How to Join a Challenge

1. Go to **Challenges** (`/app/challenges`).
2. Browse active challenges. Each card shows the type, target, deadline, point reward, and badge (if any).
3. Tap a challenge to view full details including the leaderboard of current participants.
4. Tap **Join Challenge**.
5. Your progress updates automatically as you log qualifying activities — no manual entry needed.

### Tracking Progress

Your challenge progress is visible:

- On the challenge detail page (your personal progress bar and rank).
- On your dashboard under "Active Challenges".
- On the challenge leaderboard showing all participants.

When you reach the target, the challenge is marked completed, the bonus points are added to your wallet, and any associated badge is awarded. A post appears on your feed to share the achievement.

---

## 7. The Social Feed

The feed is where the Garrincha Active community comes together. It surfaces activities, achievements, and milestones from players you follow and from the broader community.

### What Appears on the Feed

| Post Type | Trigger |
|---|---|
| Activity | You log a public activity |
| Badge | You earn a new badge |
| Challenge Completion | You complete a challenge |
| Reward Redemption | You redeem a reward (optional share) |
| Event Registration | You register for an event |
| Team Join | You join a team |
| Custom | Text/photo posts |

### Interacting with Posts

- **Kudos** — tap the Kudos icon (like) on any post to show support.
- **Comment** — tap the comment icon to leave a message.
- **Report** — if you see inappropriate content, tap the three-dot menu and select "Report".

### Feed Visibility

Posts respect the visibility settings of the source activity:
- **Public** posts appear to everyone.
- **Followers** posts appear only to your followers.
- **Private** activities do not generate feed posts.

You can adjust the visibility of any post from your profile's activity list.

---

## 8. Following Other Players

Following a player lets their public and followers-only activity appear in your feed and allows you to see their profile stats.

### How to Follow

1. Visit a player's profile (tap their name or avatar anywhere in the app, or go to `/app/profile/[nickname]`).
2. Tap the **Follow** button.
3. The player now appears in your **Following** list, and you appear in their **Followers** list.

### Finding Players

- **Leaderboard** (`/app/leaderboards`) — ranked list of top players by points.
- **Search** — use the search bar in the feed or player directory.
- **Challenge Leaderboard** — tap any participant's name in a challenge to visit their profile.
- **Event registrations** — see who else is registered for an event you are attending.

### Unfollowing

Visit the player's profile and tap **Unfollow**, or manage your following list from **Profile > Following**.

---

## 9. Joining Events

Events are organized sessions hosted by sports centers and the platform itself.

### Event Types

| Type | Description |
|---|---|
| Training Session | Structured training at a center |
| Tournament | Competitive bracket event |
| League | Ongoing season-format competition |
| Camp | Multi-day intensive program |
| Community Event | Open community gatherings |

### How to Register for an Event

1. Go to **Events** (`/app/events`).
2. Browse upcoming events. Filter by type, date, or center.
3. Tap an event to view details: description, location, date, capacity, points reward.
4. Tap **Register**.
5. You receive a confirmation notification. The event appears in your **My Events** list.

### Attendance and Points

When you attend an event, the organizer marks you as attended. Points are automatically credited to your wallet after your attendance is confirmed. The event also generates a feed post (visible to your followers).

### Capacity

Events may have a maximum capacity. If an event is full, the Register button is disabled. Check back — cancellations may reopen spots.

---

## 10. Teams

Teams let you compete together and represent a group identity on the platform.

### Joining a Team

1. Go to **Teams** (`/app/teams`).
2. Browse active teams or search by name.
3. Tap a team to view members, activity, and description.
4. Tap **Join Team**.
5. A feed post announces your arrival to your followers.

### Team Roles

| Role | Permissions |
|---|---|
| Owner | Full control — edit team, manage members, delete team |
| Admin | Manage members, post on behalf of team |
| Member | Participate in team challenges, visible on team page |

### Creating a Team

1. On the Teams page, tap **Create Team**.
2. Enter a team name (must be unique), description, and optional image.
3. You become the team Owner.
4. Invite other players by sharing the team link or having them search for the team name.

### Team Challenges

Challenges of type **Team** pit teams against each other. Your activity contributions automatically count toward the team total when you participate in a team challenge while a member.

---

## 11. Notifications

You receive in-app notifications for the following events:

| Notification | Trigger |
|---|---|
| Badge Awarded | You earn a new badge |
| Challenge Completed | You finish a challenge |
| Reward Redeemed | Your redemption is confirmed |
| Event Registered | Registration is confirmed |
| New Follower | Someone follows you |
| Activity Liked | Someone gives Kudos on your activity |
| Comment Received | Someone comments on your post |
| Points Received | Admin bonus or special award |
| Admin Message | Platform-wide or targeted message |

Notifications are shown in the bell icon in the navigation bar. Unread notifications are highlighted with a count badge.

---

## 12. Account Settings

Navigate to **Settings** (`/app/settings`) to manage:

- **Profile** — update name, nickname, bio, favourite sport, avatar.
- **Privacy** — set default activity visibility, control who can follow you.
- **Password** — change your password.
- **Notifications** — toggle which notification types you receive.
- **Account** — deactivate or delete your account.

---

## 13. Demo Accounts

Use the following credentials to explore the platform without creating a personal account. These accounts have pre-populated activities, points, badges, and social connections.

### Player Account

| Field | Value |
|---|---|
| Email | `demo.player@garrincha.app` |
| Password | `Demo1234!` |
| Nickname | `demo_player` |
| Level | Silver |
| Notes | Has activities, challenges, rewards, followers |

### Power Player Account (Elite Level)

| Field | Value |
|---|---|
| Email | `elite.demo@garrincha.app` |
| Password | `Demo1234!` |
| Nickname | `elite_demo` |
| Level | Elite |
| Notes | Full history — all badge types, multiple completed challenges, team membership |

### Center Admin Account

| Field | Value |
|---|---|
| Email | `center.admin@garrincha.app` |
| Password | `Admin1234!` |
| Nickname | `center_admin_demo` |
| Role | CENTER_ADMIN |
| Notes | Can create events, manage rewards, view center player roster |

> These accounts are reset periodically. Do not store personal data or use them for production activity.

---

## Quick Reference

| Action | Path |
|---|---|
| Dashboard | `/app` |
| Log Activity | `/app/activities` — tap + |
| Challenges | `/app/challenges` |
| Rewards | `/app/rewards` |
| Social Feed | `/app/feed` |
| Events | `/app/events` |
| Teams | `/app/teams` |
| Leaderboard | `/app/leaderboards` |
| Wallet | `/app/wallet` |
| Profile | `/app/profile` |
| Settings | `/app/settings` |

---

*Garrincha Active — Play More. Earn More. Grow Together.*
