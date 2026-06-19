# Garrincha Active — Admin Guide

This guide covers every section of the Garrincha Active admin panel. The panel is accessible at `/admin` and is restricted to users with the `PLATFORM_ADMIN` or `CENTER_ADMIN` role. Some sections (Sponsors, Centers, Settings) are restricted further to `PLATFORM_ADMIN` only.

---

## Demo Account Credentials

These accounts are created by the database seed (`npm run seed`). The default password for every demo account is `password123`.

| Role | Email | Notes |
|---|---|---|
| Platform Admin | `admin@garrincha.app` | Full access to all admin sections |
| Center Admin | `center@garrincha.app` | Restricted — cannot access Sponsors, Centers, Settings |
| Player | `player@garrincha.app` | No admin access |
| Sponsor Admin | `sponsor@garrincha.app` | No admin access |

Change or revoke these passwords before going to production. The Settings page shows which demo accounts are present in the database.

---

## Logging In

1. Navigate to `/login`.
2. Enter the email and password for an admin account.
3. On success the browser is redirected to `/app`. Navigate to `/admin` to open the admin panel. Players are redirected to `/app` automatically; only `PLATFORM_ADMIN` and `CENTER_ADMIN` roles are allowed past the admin layout.
4. Sessions are stored in an HTTP-only JWT cookie with a 7-day lifetime.
5. To log out, click the **Logout** button in the top-right corner of the admin header. On mobile the logout button is inside the sidebar.

---

## Admin Layout

The admin panel uses a persistent left sidebar with links to every section. On desktop the top bar shows the logged-in user's role chip (gold for Platform Admin, green for Center Admin) and email address.

The sidebar links are:

- Dashboard (Overview)
- Players
- Activities
- Challenges
- Rewards
- Redemptions
- Events
- Moderation
- Centers
- Teams
- Sponsors
- Reports
- Settings

---

## 1. Dashboard Overview

**URL:** `/admin`

The dashboard is the first page you see after navigating to `/admin`. It provides a real-time snapshot of platform health.

### KPI Cards

Eight stat cards are displayed in two rows:

| Card | Description |
|---|---|
| Total Players | Count of all registered user accounts |
| Active Players | Players who logged at least one activity in the last 7 days |
| Total Activities | All-time count of submitted activities |
| Points Issued | Sum of all positive entries in the points ledger |
| Rewards Redeemed | Total redemptions (Pending + Used) |
| Active Challenges | Challenges that are active and have not yet expired |
| Upcoming Events | Published events with a future start date |
| Flagged Activities | Activities awaiting moderation — highlighted in red when non-zero |

### Flagged Activities Alert

When there are flagged activities a red banner appears at the top of the dashboard with a **Review now** link that opens the Activity Review page filtered to FLAGGED status.

### Recent Activities Table

Shows the 5 most recently submitted activities with player name, activity title, type, status, points earned, and timestamp. Clicking a player name navigates to the player detail page. Clicking a title navigates to the activity detail page.

### Quick Links

A sidebar panel of links to every major admin section for fast navigation.

---

## 2. Managing Players

**URL:** `/admin/players`

### Player List

Displays all registered accounts in a paginated table (25 per page). Columns:

- Player (avatar, full name, nickname)
- Email
- Center (assigned sports center, if any)
- Role badge
- Level badge (BRONZE / SILVER / GOLD / ELITE)
- Current points
- Account status (Active / Inactive)
- Join date

Clicking any row navigates to that player's detail page.

### Searching and Filtering

The search box at the top filters by name, nickname, or email (case-insensitive substring match). Center filter chips below the search box restrict results to players belonging to a specific center. Both filters work together and are preserved when paginating.

### Player Detail Page

**URL:** `/admin/players/[id]`

The detail page shows the full profile for a single player:

- Avatar, full name, nickname, email, phone, date of birth, join date, center
- Role pill and banned status indicator
- Current points, lifetime points, level
- Social counts (followers, following, posts)
- Stats grid: total activities, total distance, active time, streak days, badges, challenges, redemptions, points earned, points spent
- Activity history (last 50 activities, with title, type, date, duration, distance, points, status)
- Badges earned
- Points ledger (last 100 transactions)
- Reward redemptions
- Challenge participations

### Admin Actions on a Player

Three action panels appear at the bottom of the player detail page:

**Award Bonus Points**
Enter a numeric amount (positive to award, negative to deduct) and a reason. This creates an `ADMIN_BONUS` entry in the points ledger and updates the player's total and lifetime points. All bonus awards are recorded in the audit log.

**Ban / Unban Player**
Banning sets `isActive = false`, preventing the player from logging in. All data is preserved. Unbanning restores access. The action is logged in the admin audit log.

**Change Role** (Platform Admin only)
Select a new role from the dropdown: `PLAYER`, `CENTER_ADMIN`, `PLATFORM_ADMIN`, or `SPONSOR_ADMIN`. The previous and new roles are recorded in the audit log.

---

## 3. Reviewing Activities

**URL:** `/admin/activities`

This page is restricted to `PLATFORM_ADMIN` only.

### Summary Cards

Four cards display counts of activities in each state: Flagged, Pending, Approved, Rejected.

### Filter Tabs

Tabs filter the activity table by status. The default tab is **Flagged** so urgent items appear first. Available filters: Flagged, All, Pending, Approved, Rejected. Each tab shows a live count badge.

A yellow alert banner shows the combined count of Flagged + Pending activities needing review.

### Activity Table

Columns: Player (avatar, name, nickname), Activity Type, Date, Distance, Duration, Speed, Points, Status (with flag reason if present), Actions.

Rows with FLAGGED status have a red background tint; PENDING rows have a yellow tint.

Activities are sorted with Flagged and Pending surfaced first, then by creation date descending.

### Approving an Activity

Click the green **Approve** button on any Flagged or Pending activity. The system:

1. Sets `status = APPROVED`.
2. Clears the `flagReason`.
3. Calculates points: base 10 + 1 per km + 1 per 5 minutes of duration.
4. Creates a `ACTIVITY` entry in the player's points ledger.
5. Updates the player profile totals (points, distance, minutes, activity count).
6. Records the action in the admin audit log.

### Rejecting an Activity

Click the red **Reject** button. The status is set to REJECTED with the reason "Rejected after admin review". The player's points are not affected. The action is recorded in the audit log.

Only activities in FLAGGED or PENDING status can be acted upon. Already APPROVED or REJECTED rows show no action buttons.

### Points Calculation Reference

| Activity Type | Rate |
|---|---|
| Run | 5 pts / km |
| Walk | 2 pts / km |
| Cycling | 2 pts / km |
| Football Training | 50 pts / session |
| Football Match | 80 pts / match |
| Fitness | 30 pts / session |
| Custom | 10 pts / session |

Maximum daily activity points: **200 pts**. Speed thresholds that trigger automatic flagging: Run > 25 km/h, Walk > 10 km/h, Cycling > 60 km/h.

---

## 4. Creating Rewards

**URL:** `/admin/rewards`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can manage rewards.

### Stats Bar

Three counters: Total Rewards, Active rewards, Total Redemptions.

### Creating a New Reward

Click the **Create Reward** button (top right) to open the creation dialog. Required fields:

| Field | Description |
|---|---|
| Title | Reward name shown to players |
| Description | Detail text; first 60 characters appear in the table |
| Category | One of: Discount, Merchandise, Free Session, Food & Drink, Tournament Entry, Sponsor Voucher, VIP Access |
| Points Cost | Points a player must spend to redeem |
| Stock | Number of items available; 0 means unlimited |
| Center | Optional — tie the reward to a specific sports center |
| Sponsor | Optional — associate with a sponsor (only active sponsors appear) |
| Expires At | Optional expiry date; shown in red in the table once passed |

New rewards are created with `isActive = true`.

### Toggling Reward Active Status

Click the green **Active** or grey **Inactive** pill in the Status column to toggle. Inactive rewards do not appear in the player-facing reward catalogue.

### Editing a Reward

Click the **Edit** button in the Actions column to navigate to the reward edit page at `/admin/rewards/[id]/edit`.

---

## 5. Managing Challenges

**URL:** `/admin/challenges`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can manage challenges.

### Stats Grid

Four cards: Total Challenges, Currently Active, Total Participants, Ended.

### Challenge Table

Columns: Challenge (title, description, center if applicable), Type, Dates, Target, Points Reward (and badge if linked), Players, Status (Active / Upcoming / Ended / Inactive), Toggle.

### Creating a Challenge

Click **Create Challenge** (top right). A dialog opens with these fields:

| Field | Description |
|---|---|
| Title | Challenge name |
| Description | Rules and goal description |
| Challenge Type | Distance, Active Minutes, Activity Count, Football Training Attendance, Match Count, Points, Center vs Center, Team |
| Start Date | When players can begin joining and progressing |
| End Date | Deadline for completion |
| Target Value | Numeric goal (km for Distance, minutes for Active Minutes, etc.) |
| Points Reward | Points awarded on completion |
| Image URL | Optional banner image |

After creation the challenge appears in the table with status **Upcoming** if the start date is in the future, or **Active** if the start date has passed.

### Activating and Deactivating a Challenge

Click the toggle icon in the Toggle column. The toggle icon shows green when active and grey when inactive. Inactive challenges are hidden from players regardless of their date range. All audit log entries are written for each toggle.

---

## 6. Managing Events

**URL:** `/admin/events`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can manage events.

### Stats Strip

Four counters: Total Events, Published, Upcoming, Total Registrations.

### Creating an Event

Click **Create Event** (top right). The dialog accepts:

| Field | Description |
|---|---|
| Title | Event name |
| Type | Training Session, Tournament, League, Camp, Community Event |
| Status | Draft or Published |
| Location | Physical location or venue description |
| Start Date / End Date | Event date range |
| Capacity | Maximum registrations (optional) |
| Points Reward | Points awarded to attendees |
| Is Tournament | Boolean flag for tournament-type events |
| Center | Sports center hosting the event |

### Event Status Lifecycle

- **Draft** — visible only to admins, not shown to players.
- **Published** — visible to players who can register.
- **Cancelled** — hidden from player listings; existing registrations are retained.
- **Completed** — event has ended; points are awarded.

### Changing Event Status

In the events table, each row has a status selector. Changing status from the table updates it immediately via a server action.

### Viewing Registrations

Expand an event row to see the list of registered players. Each registration shows player name, nickname, avatar, registration date, and whether they attended (`attended` field). Attendance can be marked from this panel.

---

## 7. Moderation Workflow

**URL:** `/admin/moderation`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can moderate content.

The moderation page is divided into three sections:

### Moderation Queue (Under Review)

Posts that have been automatically or manually flagged with `moderationStatus = UNDER_REVIEW`. These require the most immediate attention.

Actions available: **Approve** (sets status to VISIBLE, resolves all reports for the post), **Hide** (sets status to HIDDEN, resolves all reports).

A yellow alert banner at the top shows the total count of items needing attention.

### Reported Posts (Still Visible)

Posts that have one or more unresolved user reports but are still publicly VISIBLE. These may not yet be in the formal review queue.

Actions available: **Approve** (resolves reports, keeps post visible), **Hide** (removes from feed, resolves reports), **Flag Review** (moves the post to UNDER_REVIEW).

### Hidden Content

Posts that have previously been hidden. Shown for audit purposes with the option to restore.

Actions available: **Unhide** (sets status back to VISIBLE).

### Post Columns

Every table in this section shows: User (avatar, name, nickname), Content (post type badge + 120-character preview), Report count, Current moderation status, Created date, Action buttons.

All moderation actions are recorded in the admin audit log.

---

## 8. Sponsor Management

**URL:** `/admin/sponsors`

Restricted to `PLATFORM_ADMIN` only.

### Summary Stats

Four cards: Total Sponsors, Active Sponsors, Sponsored Rewards, Total Campaigns.

### Creating a Sponsor

An expandable **Create New Sponsor** panel sits above the sponsor list. Fields:

| Field | Required | Description |
|---|---|---|
| Sponsor Name | Yes | Display name (max 120 chars) |
| Description | No | Partnership description (max 500 chars) |
| Logo URL | No | URL to sponsor logo image |
| Website | No | Sponsor website URL |
| Contact Email | No | Primary contact for the partnership |

New sponsors are created as Active by default.

### Sponsor Table

Each sponsor row is expandable. The collapsed row shows logo, name, contact, reward count, campaign count, challenge count, active status, and a toggle button.

Expanding a row reveals two panels:

**Sponsor Details** — full description, website link, contact email, join date.

**Campaign Analytics** — for each of the sponsor's last 5 campaigns: title, date range, impressions, joins, redemptions. Aggregate metrics shown above the list: total impressions, total joins, total redemptions, conversion rate (joins / impressions as a percentage).

### Toggling Sponsor Active Status

Click the small toggle button on the right of a sponsor row. Active sponsors appear in the reward creation dialog; inactive sponsors do not.

---

## 9. Reports and Analytics

**URL:** `/admin/reports`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can view reports.

### Summary Strip

Four top-level numbers: Total Players, Total Activities, Points Issued, Rewards Redeemed.

### Engagement by Center

Table ranking all sports centers by player count, activity count, and total points issued. Useful for understanding which centers are driving the most engagement.

### Points by Source

Table grouping all positive points ledger entries by source type. Shows transaction count, total points, and average points per transaction. Source types include: Activity, Challenge Completion, Event Attendance, Badge Award, Admin Bonus, Redemption Debit, Referral, Custom.

### Top 10 Players (Lifetime Points)

Ranked leaderboard of the highest-earning players by lifetime points (points earned before any redemptions). Columns: rank, player (nickname + email), level, total activities, current balance, lifetime points.

### Rewards Redeemed by Category

Table counting redemptions grouped by reward category (Discount, Merchandise, Free Session, etc.).

### Activities by Type

Table counting all activities grouped by type (Run, Walk, Cycling, Football Training, Football Match, Fitness, Custom).

---

## 10. Centers Management

**URL:** `/admin/centers`

Restricted to `PLATFORM_ADMIN` only.

### Center List

All sports centers are shown in a table with: name, city, address, phone, email, player count, active status, and Edit / Toggle actions.

### Creating a Center

Click **Add Center** to open the creation form. Fields:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Unique center name |
| City | No | City name |
| Address | No | Street address |
| Phone | No | Contact phone number |
| Email | No | Contact email address |
| Description | No | Brief description of the center |

Center names must be unique across the platform.

### Editing a Center

Click **Edit** on any row to open the edit form prefilled with that center's data. The same fields are available.

### Activating / Deactivating a Center

Click the **Active** / **Inactive** toggle button on a center row. Inactive centers are hidden from player-facing center selection and from the center filter on the Players page.

---

## Redemptions Management

**URL:** `/admin/redemptions`

Both `PLATFORM_ADMIN` and `CENTER_ADMIN` can manage redemptions.

### Status Filter Tabs

Filter redemptions by status: All, Pending, Used, Cancelled, Expired. Each tab shows a live count.

### Summary Counters

Three counters at the top right of the header: Pending (yellow), Used (green), Cancelled (grey).

### Redemption Table

Columns: Player (name, nickname), Reward (title, category), Redemption Code, Points Spent, Date, Status, Actions.

On mobile the table collapses into card rows.

### Actions

Only `PENDING` redemptions can be acted upon:

- **Mark Used** — sets `status = USED` and records the current timestamp as `usedAt`.
- **Cancel** — sets `status = CANCELLED` and automatically refunds the points to the player's balance via a `CUSTOM` ledger entry. The player profile balance and level are recalculated.

---

## Platform Settings

**URL:** `/admin/settings`

Restricted to `PLATFORM_ADMIN` only.

### Platform Name

Change the display name shown in headings and public-facing pages. Stored in the `app_settings` table under the key `platform_name`. Default value: `Garrincha Active`.

### Points Rules (Read-Only)

Displays the current points rates, suspicious speed thresholds per activity type, daily activity point cap (200 pts), and level thresholds:

| Level | Lifetime Points Required |
|---|---|
| Bronze | 0 |
| Silver | 500 |
| Gold | 1,500 |
| Elite | 3,000 |

These values are defined in `src/lib/points-rules.ts` and require a code change and redeploy to update.

### Badge Management

Shows all badges in the platform with: name, unique key, type (Auto or Manual), award count, and a Delete button (only enabled when the badge has not been awarded to any player and is not linked to any challenge).

**Creating a Badge**

Fill in the form at the bottom of the Badge Management section:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Badge display name (max 80 chars) |
| Key | Yes | Unique machine key — lowercase letters, numbers, underscores only (max 60 chars) |
| Description | Yes | Shown to players (max 200 chars) |
| Icon URL | No | URL to badge icon image |
| Award Type | Yes | **Automatic** — awarded by the system based on rules; **Manual** — granted by admins via the player detail page |

### Demo Accounts

Shows the seeded demo accounts from the database. Includes a warning to change passwords before production deployment and a link to the Players page for account management.

### System Info

Runtime environment details: Node.js version, Next.js version (16.2.9), Prisma version (7.8), database (SQLite at `prisma/dev.db`), and environment (`development` / `production`).

---

## Role Permission Summary

| Section | Platform Admin | Center Admin |
|---|---|---|
| Dashboard | Full access | Full access |
| Players (list + detail) | Full access | Full access |
| Activities review | Full access | No access |
| Challenges | Full access | Full access |
| Rewards | Full access | Full access |
| Redemptions | Full access | Full access |
| Events | Full access | Full access |
| Moderation | Full access | Full access |
| Centers | Full access | No access |
| Teams | Full access | Full access |
| Sponsors | Full access | No access |
| Reports | Full access | Full access |
| Settings | Full access | No access |
| Award bonus points | Full access | Full access |
| Ban / unban player | Full access | Full access |
| Change player role | Full access | No access |
