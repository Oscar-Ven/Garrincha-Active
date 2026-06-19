-- AlterTable
ALTER TABLE "activities" ADD COLUMN "effortLevel" INTEGER;
ALTER TABLE "activities" ADD COLUMN "elevationGainM" REAL;
ALTER TABLE "activities" ADD COLUMN "gear" TEXT;

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "rules" TEXT;

-- CreateTable
CREATE TABLE "activity_splits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "splitNumber" INTEGER NOT NULL,
    "distanceKm" REAL NOT NULL,
    "elapsedSecs" INTEGER NOT NULL,
    "paceSecPerKm" INTEGER NOT NULL,
    "elevationGainM" REAL,
    CONSTRAINT "activity_splits_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "elevationM" REAL,
    "difficulty" TEXT,
    "centerId" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "segments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "segments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "segment_efforts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "segmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT,
    "elapsedSecs" INTEGER NOT NULL,
    "rank" INTEGER,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "segment_efforts_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "segment_efforts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "segment_efforts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "elevationM" REAL,
    "difficulty" TEXT,
    "centerId" TEXT,
    "createdById" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "routes_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "routes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "route_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "elevM" REAL,
    CONSTRAINT "route_points_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_routes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_routes_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "activityId" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "personal_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_feed_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "moderationStatus" TEXT NOT NULL DEFAULT 'VISIBLE',
    "activityId" TEXT,
    "userBadgeId" TEXT,
    "challengeParticipantId" TEXT,
    "rewardRedemptionId" TEXT,
    "eventRegistrationId" TEXT,
    "personalRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "feed_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_userBadgeId_fkey" FOREIGN KEY ("userBadgeId") REFERENCES "user_badges" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_challengeParticipantId_fkey" FOREIGN KEY ("challengeParticipantId") REFERENCES "challenge_participants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_rewardRedemptionId_fkey" FOREIGN KEY ("rewardRedemptionId") REFERENCES "reward_redemptions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "event_registrations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feed_posts_personalRecordId_fkey" FOREIGN KEY ("personalRecordId") REFERENCES "personal_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_feed_posts" ("activityId", "challengeParticipantId", "content", "createdAt", "eventRegistrationId", "id", "imageUrl", "moderationStatus", "rewardRedemptionId", "type", "updatedAt", "userBadgeId", "userId", "visibility") SELECT "activityId", "challengeParticipantId", "content", "createdAt", "eventRegistrationId", "id", "imageUrl", "moderationStatus", "rewardRedemptionId", "type", "updatedAt", "userBadgeId", "userId", "visibility" FROM "feed_posts";
DROP TABLE "feed_posts";
ALTER TABLE "new_feed_posts" RENAME TO "feed_posts";
CREATE UNIQUE INDEX "feed_posts_activityId_key" ON "feed_posts"("activityId");
CREATE UNIQUE INDEX "feed_posts_userBadgeId_key" ON "feed_posts"("userBadgeId");
CREATE UNIQUE INDEX "feed_posts_challengeParticipantId_key" ON "feed_posts"("challengeParticipantId");
CREATE UNIQUE INDEX "feed_posts_rewardRedemptionId_key" ON "feed_posts"("rewardRedemptionId");
CREATE UNIQUE INDEX "feed_posts_eventRegistrationId_key" ON "feed_posts"("eventRegistrationId");
CREATE UNIQUE INDEX "feed_posts_personalRecordId_key" ON "feed_posts"("personalRecordId");
CREATE TABLE "new_player_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "favoriteSport" TEXT,
    "bio" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'BRONZE',
    "totalDistance" REAL NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" DATETIME,
    "lastStreakDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_player_profiles" ("bio", "createdAt", "favoriteSport", "id", "lastActivityAt", "level", "lifetimePoints", "streakDays", "totalActivities", "totalDistance", "totalMinutes", "totalPoints", "updatedAt", "userId") SELECT "bio", "createdAt", "favoriteSport", "id", "lastActivityAt", "level", "lifetimePoints", "streakDays", "totalActivities", "totalDistance", "totalMinutes", "totalPoints", "updatedAt", "userId" FROM "player_profiles";
DROP TABLE "player_profiles";
ALTER TABLE "new_player_profiles" RENAME TO "player_profiles";
CREATE UNIQUE INDEX "player_profiles_userId_key" ON "player_profiles"("userId");
CREATE TABLE "new_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "centerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_teams" ("centerId", "createdAt", "description", "id", "imageUrl", "isActive", "name", "updatedAt") SELECT "centerId", "createdAt", "description", "id", "imageUrl", "isActive", "name", "updatedAt" FROM "teams";
DROP TABLE "teams";
ALTER TABLE "new_teams" RENAME TO "teams";
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "activity_splits_activityId_splitNumber_key" ON "activity_splits"("activityId", "splitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "route_points_routeId_sequence_key" ON "route_points"("routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "saved_routes_userId_routeId_key" ON "saved_routes"("userId", "routeId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_userId_type_key" ON "personal_records"("userId", "type");
