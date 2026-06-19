-- CreateTable
CREATE TABLE "direct_challenges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengerId" TEXT NOT NULL,
    "challengeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "direct_challenges_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "direct_challenges_challengeeId_fkey" FOREIGN KEY ("challengeeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "direct_challenges_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reward_auctions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rewardId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "minBid" INTEGER NOT NULL DEFAULT 10,
    "winnerId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reward_auctions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reward_auctions_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "reward_auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "squad_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "currentValue" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "squad_goals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "streakShields" INTEGER NOT NULL DEFAULT 0,
    "carbonSavedKg" REAL NOT NULL DEFAULT 0,
    "wellnessScore" REAL,
    "trainingLoadScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_player_profiles" ("bio", "createdAt", "favoriteSport", "id", "lastActivityAt", "lastStreakDate", "level", "lifetimePoints", "longestStreak", "streakDays", "totalActivities", "totalDistance", "totalMinutes", "totalPoints", "updatedAt", "userId") SELECT "bio", "createdAt", "favoriteSport", "id", "lastActivityAt", "lastStreakDate", "level", "lifetimePoints", "longestStreak", "streakDays", "totalActivities", "totalDistance", "totalMinutes", "totalPoints", "updatedAt", "userId" FROM "player_profiles";
DROP TABLE "player_profiles";
ALTER TABLE "new_player_profiles" RENAME TO "player_profiles";
CREATE UNIQUE INDEX "player_profiles_userId_key" ON "player_profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "auction_bids_auctionId_userId_key" ON "auction_bids"("auctionId", "userId");
