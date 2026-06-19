# Database Model Documentation

Garrincha Active — Prisma 7 schema, SQLite provider, output at `src/generated/prisma`.

---

## Enums

| Enum | Values |
|---|---|
| `Role` | `PLAYER`, `CENTER_ADMIN`, `PLATFORM_ADMIN`, `SPONSOR_ADMIN` |
| `ActivityType` | `RUN`, `WALK`, `CYCLING`, `FOOTBALL_TRAINING`, `FOOTBALL_MATCH`, `FITNESS`, `CUSTOM` |
| `ActivityVisibility` | `PUBLIC`, `FOLLOWERS`, `PRIVATE` |
| `ActivityStatus` | `PENDING`, `APPROVED`, `FLAGGED`, `REJECTED` |
| `PointsSourceType` | `ACTIVITY`, `CHALLENGE_COMPLETION`, `EVENT_ATTENDANCE`, `BADGE_AWARD`, `ADMIN_BONUS`, `REDEMPTION_DEBIT`, `REFERRAL`, `CUSTOM` |
| `RewardCategory` | `DISCOUNT`, `MERCHANDISE`, `FREE_SESSION`, `FOOD_DRINK`, `TOURNAMENT_ENTRY`, `SPONSOR_VOUCHER`, `VIP_ACCESS` |
| `RedemptionStatus` | `PENDING`, `USED`, `CANCELLED`, `EXPIRED` |
| `ChallengeType` | `DISTANCE`, `ACTIVE_MINUTES`, `ACTIVITY_COUNT`, `FOOTBALL_TRAINING_ATTENDANCE`, `MATCH_COUNT`, `POINTS`, `CENTER_VS_CENTER`, `TEAM` |
| `EventType` | `TRAINING_SESSION`, `TOURNAMENT`, `LEAGUE`, `CAMP`, `COMMUNITY_EVENT` |
| `EventStatus` | `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` |
| `FeedPostType` | `ACTIVITY`, `BADGE`, `CHALLENGE_COMPLETION`, `REWARD_REDEMPTION`, `EVENT_REGISTRATION`, `TEAM_JOIN`, `CUSTOM` |
| `ModerationStatus` | `VISIBLE`, `HIDDEN`, `UNDER_REVIEW` |
| `TeamRole` | `OWNER`, `ADMIN`, `MEMBER` |
| `NotificationType` | `BADGE_AWARDED`, `CHALLENGE_COMPLETED`, `REWARD_REDEEMED`, `EVENT_REGISTERED`, `NEW_FOLLOWER`, `ACTIVITY_LIKED`, `COMMENT_RECEIVED`, `ADMIN_MESSAGE`, `POINTS_RECEIVED` |
| `Level` | `BRONZE`, `SILVER`, `GOLD`, `ELITE` |

---

## Models

### User (`users`)

Central identity record. Every authenticated person has one row.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String | Unique |
| `name` | String | Display name |
| `nickname` | String | Unique, used in URLs / mentions |
| `phone` | String? | Optional |
| `dateOfBirth` | DateTime? | Optional |
| `passwordHash` | String | bcrypt hash, never exposed |
| `role` | Role | Default `PLAYER` |
| `avatarUrl` | String? | Profile photo |
| `isActive` | Boolean | Default `true`; soft-disable accounts |
| `centerId` | String? | FK → Center (nullable; links staff/players to a center) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

Relations: `PlayerProfile` (1:1), `Activity[]`, `PointsLedger[]`, `RewardRedemption[]`, `UserBadge[]`, `ChallengeParticipant[]`, `FeedPost[]`, `FeedComment[]`, `FeedReaction[]`, `Follow[]` (as follower and as following), `EventRegistration[]`, `TeamMember[]`, `Notification[]`, `Report[]` (as reporter and as reported), `AdminAuditLog[]`.

---

### PlayerProfile (`player_profiles`)

Extended stats for `PLAYER` role users. Aggregated counters are denormalized here for fast reads; the authoritative source of truth for points balance is `PointsLedger`.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | Unique FK → User (cascade delete) |
| `favoriteSport` | String? | Free text |
| `bio` | String? | Short biography |
| `totalPoints` | Int | Current spendable balance (decremented on redemption) |
| `lifetimePoints` | Int | Cumulative points ever earned (never decremented) |
| `level` | Level | `BRONZE` → `SILVER` → `GOLD` → `ELITE` |
| `totalDistance` | Float | km, running total across all activities |
| `totalMinutes` | Int | Active minutes running total |
| `totalActivities` | Int | Count of approved activities |
| `streakDays` | Int | Current consecutive activity days |
| `lastActivityAt` | DateTime? | Timestamp of most recent approved activity |

Constraint: `userId` is `@unique`, enforcing exactly one profile per user.

---

### Center (`centers`)

A sports facility or club. Users can be affiliated with a center; rewards, events, and challenges can be scoped to a center.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Unique |
| `city` | String? | |
| `address` | String? | |
| `phone` | String? | |
| `email` | String? | |
| `description` | String? | |
| `logoUrl` | String? | |
| `isActive` | Boolean | Default `true` |

Relations: `User[]` (players/staff), `Reward[]`, `Event[]`, `Challenge[]`.

---

### Activity (`activities`)

A single logged workout or match session by a player.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (cascade delete) |
| `title` | String | User-provided label |
| `type` | ActivityType | |
| `startedAt` | DateTime | |
| `endedAt` | DateTime? | |
| `durationMinutes` | Int | Required |
| `distanceKm` | Float? | For running/cycling |
| `paceMinPerKm` | Float? | |
| `speedKmH` | Float? | |
| `caloriesBurned` | Int? | |
| `description` | String? | |
| `visibility` | ActivityVisibility | Default `PUBLIC` |
| `status` | ActivityStatus | Default `APPROVED`; can be `FLAGGED`/`REJECTED` by moderation |
| `pointsEarned` | Int | Points credited for this activity |
| `flagReason` | String? | Populated when status is `FLAGGED` or `REJECTED` |

Relations: `ActivityRoutePoint[]`, `ActivityMedia[]`, `FeedPost?` (one feed post per activity, 1:1).

---

### ActivityRoutePoint (`activity_route_points`)

GPS breadcrumb trail for a single activity. Ordered by `sequence`.

| Field | Type | Notes |
|---|---|---|
| `activityId` | String | FK → Activity (cascade delete) |
| `latitude` | Float | |
| `longitude` | Float | |
| `altitude` | Float? | metres |
| `speed` | Float? | km/h at this point |
| `timestamp` | DateTime | |
| `sequence` | Int | Ordering index within the activity |

---

### ActivityMedia (`activity_media`)

Photos or videos attached to an activity.

| Field | Type | Notes |
|---|---|---|
| `activityId` | String | FK → Activity (cascade delete) |
| `url` | String | Storage URL |
| `type` | String | Default `"IMAGE"` |

---

### PointsLedger (`points_ledger`)

**Append-only** financial ledger for all point movements. Never update or delete rows; issue corrective entries instead.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (cascade delete) |
| `sourceType` | PointsSourceType | What generated this entry |
| `sourceId` | String? | ID of the related entity (activityId, challengeId, etc.) |
| `points` | Int | Positive = credit, negative = debit (e.g. `REDEMPTION_DEBIT`) |
| `reason` | String | Human-readable description |
| `createdAt` | DateTime | Immutable timestamp |

Constraint: no `updatedAt` field — entries are write-once. `PlayerProfile.totalPoints` is the running sum; `lifetimePoints` sums only positive entries.

---

### Reward (`rewards`)

A redeemable reward offered by a center or sponsor.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | |
| `description` | String | |
| `imageUrl` | String? | |
| `pointsCost` | Int | Points required to redeem |
| `stock` | Int | `-1` = unlimited; `>= 0` = finite stock |
| `category` | RewardCategory | |
| `isActive` | Boolean | Default `true` |
| `expiresAt` | DateTime? | Optional expiry |
| `centerId` | String? | FK → Center (nullable) |
| `sponsorId` | String? | FK → Sponsor (nullable) |

Relations: `RewardRedemption[]`.

---

### RewardRedemption (`reward_redemptions`)

A player's redemption of a reward. Deducts points via a `PointsLedger` entry (application logic).

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (cascade delete) |
| `rewardId` | String | FK → Reward |
| `pointsSpent` | Int | Snapshot of cost at redemption time |
| `redemptionCode` | String | Unique, auto-generated cuid; shown to player for claiming |
| `status` | RedemptionStatus | Default `PENDING` |
| `usedAt` | DateTime? | Populated when staff marks `USED` |

Constraint: `redemptionCode` is `@unique`. Relations: `FeedPost?` (1:1).

---

### Badge (`badges`)

A named achievement definition. Awarded automatically (`isAuto = true`) by the points/challenge engine or manually by admins.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `key` | String | Unique machine-readable identifier (e.g. `"first_run"`) |
| `name` | String | Display name |
| `description` | String | |
| `iconUrl` | String? | |
| `isAuto` | Boolean | Default `true` = engine can award automatically |

Relations: `UserBadge[]`, `Challenge[]` (a challenge can grant a badge on completion).

---

### UserBadge (`user_badges`)

Junction between `User` and `Badge`. Records the moment a badge was awarded.

| Field | Type | Notes |
|---|---|---|
| `userId` | String | FK → User (cascade delete) |
| `badgeId` | String | FK → Badge |
| `awardedAt` | DateTime | |

Constraint: `@@unique([userId, badgeId])` — a player can only hold each badge once. Relations: `FeedPost?` (1:1).

---

### Challenge (`challenges`)

A time-boxed goal players opt into. Can be sponsored, center-scoped, or global.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | |
| `description` | String | |
| `type` | ChallengeType | Determines what `progress` tracks |
| `startDate` | DateTime | |
| `endDate` | DateTime | |
| `targetValue` | Float | e.g. 50 km for `DISTANCE`, 10 sessions for `ACTIVITY_COUNT` |
| `pointsReward` | Int | Awarded on completion |
| `badgeId` | String? | FK → Badge (optional completion badge) |
| `centerId` | String? | FK → Center (nullable; center-scoped challenge) |
| `sponsorId` | String? | FK → Sponsor (nullable) |
| `isActive` | Boolean | Default `true` |
| `imageUrl` | String? | |

Relations: `ChallengeParticipant[]`.

---

### ChallengeParticipant (`challenge_participants`)

Tracks an individual player's enrolment and progress in a challenge.

| Field | Type | Notes |
|---|---|---|
| `challengeId` | String | FK → Challenge (cascade delete) |
| `userId` | String | FK → User (cascade delete) |
| `progress` | Float | Current value (km, minutes, count, etc.) |
| `isCompleted` | Boolean | Default `false` |
| `completedAt` | DateTime? | |
| `joinedAt` | DateTime | |

Constraint: `@@unique([challengeId, userId])` — one enrolment per player per challenge. Relations: `FeedPost?` (1:1).

---

### FeedPost (`feed_posts`)

The social feed entry. Polymorphic: one `FeedPost` is linked to exactly one source entity (activity, badge, challenge completion, reward redemption, or event registration) via nullable 1:1 FKs, each constrained `@unique`.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (cascade delete) |
| `type` | FeedPostType | Determines which source FK is populated |
| `content` | String? | Optional caption |
| `imageUrl` | String? | Optional image override |
| `visibility` | ActivityVisibility | Default `PUBLIC` |
| `moderationStatus` | ModerationStatus | Default `VISIBLE` |
| `activityId` | String? | `@unique` FK → Activity |
| `userBadgeId` | String? | `@unique` FK → UserBadge |
| `challengeParticipantId` | String? | `@unique` FK → ChallengeParticipant |
| `rewardRedemptionId` | String? | `@unique` FK → RewardRedemption |
| `eventRegistrationId` | String? | `@unique` FK → EventRegistration |

Constraint: each source FK is `@unique`, ensuring at most one feed post per source event. Relations: `FeedComment[]`, `FeedReaction[]`, `Report[]`.

---

### FeedComment (`feed_comments`)

A comment on a feed post.

| Field | Type | Notes |
|---|---|---|
| `postId` | String | FK → FeedPost (cascade delete) |
| `userId` | String | FK → User (cascade delete) |
| `content` | String | |
| `moderationStatus` | ModerationStatus | Default `VISIBLE` |

---

### FeedReaction (`feed_reactions`)

A reaction (default `"KUDOS"`) on a feed post.

| Field | Type | Notes |
|---|---|---|
| `postId` | String | FK → FeedPost (cascade delete) |
| `userId` | String | FK → User (cascade delete) |
| `type` | String | Default `"KUDOS"` |

Constraint: `@@unique([postId, userId])` — one reaction per user per post.

---

### Follow (`follows`)

Directed social follow graph edge.

| Field | Type | Notes |
|---|---|---|
| `followerId` | String | FK → User (the person following) |
| `followingId` | String | FK → User (the person being followed) |

Constraint: `@@unique([followerId, followingId])` — no duplicate follow edges.

---

### Event (`events`)

A scheduled activity at or by a center (training, tournament, camp, etc.).

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | |
| `description` | String | |
| `type` | EventType | |
| `status` | EventStatus | Default `PUBLISHED` |
| `centerId` | String? | FK → Center (nullable) |
| `location` | String? | Address or venue name |
| `startDate` | DateTime | |
| `endDate` | DateTime | |
| `capacity` | Int? | `null` = unlimited |
| `pointsReward` | Int | Default `0`; awarded on attendance |
| `imageUrl` | String? | |
| `isTournament` | Boolean | Default `false` |

Relations: `EventRegistration[]`.

---

### EventRegistration (`event_registrations`)

A player's registration for an event. Attendance is confirmed by staff setting `attended = true`.

| Field | Type | Notes |
|---|---|---|
| `eventId` | String | FK → Event (cascade delete) |
| `userId` | String | FK → User (cascade delete) |
| `attended` | Boolean | Default `false` |
| `attendedAt` | DateTime? | |
| `registeredAt` | DateTime | |

Constraint: `@@unique([eventId, userId])` — one registration per player per event. Relations: `FeedPost?` (1:1).

---

### Team (`teams`)

A player group, optionally affiliated with a center.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Unique |
| `description` | String? | |
| `imageUrl` | String? | |
| `centerId` | String? | Optional center affiliation (no FK enforced — stored as plain String) |
| `isActive` | Boolean | Default `true` |

Relations: `TeamMember[]`.

---

### TeamMember (`team_members`)

A player's membership in a team with a role.

| Field | Type | Notes |
|---|---|---|
| `teamId` | String | FK → Team (cascade delete) |
| `userId` | String | FK → User (cascade delete) |
| `role` | TeamRole | `OWNER`, `ADMIN`, or `MEMBER` |
| `joinedAt` | DateTime | |

Constraint: `@@unique([teamId, userId])` — one membership per player per team.

---

### Sponsor (`sponsors`)

An external brand or company that funds challenges and rewards.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Unique |
| `description` | String? | |
| `logoUrl` | String? | |
| `website` | String? | |
| `contactEmail` | String? | |
| `isActive` | Boolean | Default `true` |

Relations: `Reward[]`, `Challenge[]`, `SponsorCampaign[]`.

---

### SponsorCampaign (`sponsor_campaigns`)

A marketing campaign run by a sponsor. Tracks engagement metrics (impressions, joins, redemptions) as denormalized counters.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `sponsorId` | String | FK → Sponsor (cascade delete) |
| `title` | String | |
| `description` | String? | |
| `startDate` | DateTime | |
| `endDate` | DateTime | |
| `impressions` | Int | Default `0`; incremented by application |
| `joins` | Int | Default `0` |
| `redemptions` | Int | Default `0` |
| `isActive` | Boolean | Default `true` |

---

### Report (`reports`)

A moderation report filed by a user against another user or a feed post.

| Field | Type | Notes |
|---|---|---|
| `reporterId` | String | FK → User (reporter, cascade delete) |
| `reportedId` | String? | FK → User (reported user, nullable) |
| `postId` | String? | FK → FeedPost (nullable) |
| `reason` | String | Required summary |
| `details` | String? | Optional elaboration |
| `resolved` | Boolean | Default `false` |
| `resolvedAt` | DateTime? | |

---

### AdminAuditLog (`admin_audit_logs`)

Immutable record of every administrative action. Append-only; never update or delete rows.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `adminId` | String | FK → User (cascade delete) |
| `action` | String | Verb describing what was done |
| `entityType` | String? | e.g. `"Activity"`, `"User"` |
| `entityId` | String? | PK of the affected record |
| `details` | String? | JSON or free text with before/after context |
| `createdAt` | DateTime | Immutable |

Note: no `updatedAt` — log entries are write-once.

---

### Notification (`notifications`)

In-app notification delivered to a user.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (cascade delete) |
| `type` | NotificationType | Determines icon / routing |
| `title` | String | Short heading |
| `body` | String | Full message |
| `isRead` | Boolean | Default `false` |
| `linkUrl` | String? | Optional deep-link |
| `createdAt` | DateTime | |

---

### AppSetting (`app_settings`)

Key-value store for platform-wide configuration (feature flags, point rules, etc.).

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `key` | String | Unique |
| `value` | String | All values stored as strings; application parses type |
| `updatedAt` | DateTime | Auto |

---

## Relation Map

```
User ──1:1──► PlayerProfile
User ──1:N──► Activity ──1:N──► ActivityRoutePoint
                          └──1:N──► ActivityMedia
                          └──0:1──► FeedPost

User ──1:N──► PointsLedger        (append-only)
User ──1:N──► RewardRedemption ──0:1──► FeedPost
User ──1:N──► UserBadge        ──0:1──► FeedPost
User ──1:N──► ChallengeParticipant ──0:1──► FeedPost
User ──1:N──► EventRegistration    ──0:1──► FeedPost

User ──1:N──► FeedPost ──1:N──► FeedComment
                         └──1:N──► FeedReaction
                         └──1:N──► Report

User ──N:M──► User            (via Follow)
User ──N:M──► Team            (via TeamMember)
User ──N:M──► Challenge       (via ChallengeParticipant)
User ──N:M──► Event           (via EventRegistration)

Center ──1:N──► User
Center ──1:N──► Reward
Center ──1:N──► Event
Center ──1:N──► Challenge

Sponsor ──1:N──► Reward
Sponsor ──1:N──► Challenge
Sponsor ──1:N──► SponsorCampaign

Badge ──1:N──► UserBadge
Badge ──1:N──► Challenge  (completion badge)
```

---

## Important Constraints

### Append-Only Tables

- **`PointsLedger`** — no `updatedAt`, no application logic should ever run `UPDATE` or `DELETE` on this table. Issue a corrective credit/debit entry instead. `PlayerProfile.totalPoints` is a cached running total; `lifetimePoints` tracks cumulative credits only.
- **`AdminAuditLog`** — no `updatedAt`. Records are created once and never modified.

### Unique Constraints

| Table | Constraint | Purpose |
|---|---|---|
| `users` | `email`, `nickname` | No duplicate accounts |
| `player_profiles` | `userId` | One profile per user |
| `centers` | `name` | No duplicate center names |
| `badges` | `key` | Machine-readable badge identity |
| `user_badges` | `(userId, badgeId)` | Each badge awarded once per player |
| `challenge_participants` | `(challengeId, userId)` | One enrolment per challenge |
| `feed_reactions` | `(postId, userId)` | One reaction per user per post |
| `follows` | `(followerId, followingId)` | No duplicate follow edges |
| `event_registrations` | `(eventId, userId)` | One registration per player per event |
| `team_members` | `(teamId, userId)` | One membership per player per team |
| `feed_posts` | `activityId`, `userBadgeId`, `challengeParticipantId`, `rewardRedemptionId`, `eventRegistrationId` (each `@unique`) | One feed post per source event |
| `reward_redemptions` | `redemptionCode` | Globally unique claim codes |
| `sponsors` | `name` | No duplicate sponsor names |
| `teams` | `name` | No duplicate team names |
| `app_settings` | `key` | One row per config key |

### Cascade Deletes

All FK relationships where the child record has no independent meaning use `onDelete: Cascade` (e.g. deleting a `User` removes their activities, ledger entries, badges, feed posts, comments, notifications, etc.). `Reward` references to `Center` and `Sponsor` do not cascade — rewards survive center/sponsor deletion to preserve redemption history.

### Soft Deletes

`User.isActive`, `Center.isActive`, `Reward.isActive`, `Challenge.isActive`, `Team.isActive`, and `Sponsor.isActive` act as soft-delete flags. Application queries should filter `isActive: true` where appropriate rather than hard-deleting rows.

### Points Integrity

The canonical points balance for a player is the `SUM(points)` of their `PointsLedger` rows. `PlayerProfile.totalPoints` is a denormalized cache updated atomically in the same transaction as each ledger insert. If they diverge, the ledger sum is authoritative. `PlayerProfile.lifetimePoints` sums only rows where `points > 0`.

### Stock Control

`Reward.stock = -1` means unlimited. Application logic must decrement `stock` and reject redemptions when `stock = 0` within a database transaction to prevent overselling.
