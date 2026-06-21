-- Phase 2: Match Recording Core
-- Deploy via: npx prisma db push (or apply manually to production Supabase)
-- Migration lock says sqlite (dev) but production is PostgreSQL.

-- New enums
CREATE TYPE "MatchFormat" AS ENUM ('SINGLES', 'DOUBLES');
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'CANCELLED');
CREATE TYPE "MatchParticipantRole" AS ENUM ('HOME', 'AWAY', 'HOME_PARTNER', 'AWAY_PARTNER');
CREATE TYPE "MatchSurface" AS ENUM ('CLAY', 'HARD', 'GRASS', 'CARPET', 'INDOOR', 'UNKNOWN');

-- Update existing enums (additive only)
ALTER TYPE "FeedPostType" ADD VALUE IF NOT EXISTS 'MATCH_RESULT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCH_CONFIRMATION_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCH_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCH_DISPUTED';
ALTER TYPE "PointsSourceType" ADD VALUE IF NOT EXISTS 'MATCH';

-- PlayerProfile new optional fields
ALTER TABLE "player_profiles" ADD COLUMN IF NOT EXISTS "primarySport" "ActivityType";
ALTER TABLE "player_profiles" ADD COLUMN IF NOT EXISTS "dominantHand" TEXT;
ALTER TABLE "player_profiles" ADD COLUMN IF NOT EXISTS "preferredSide" TEXT;

-- Court new optional fields
ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "surface" "MatchSurface";

-- FeedPost new optional field
ALTER TABLE "feed_posts" ADD COLUMN IF NOT EXISTS "matchResultId" TEXT UNIQUE;

-- MatchResult
CREATE TABLE IF NOT EXISTS "match_results" (
  "id"           TEXT NOT NULL,
  "sport"        "ActivityType" NOT NULL,
  "format"       "MatchFormat" NOT NULL DEFAULT 'SINGLES',
  "surface"      "MatchSurface" NOT NULL DEFAULT 'UNKNOWN',
  "courtId"      TEXT,
  "status"       "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "winnerSide"   TEXT,
  "homeSetWins"  INTEGER NOT NULL DEFAULT 0,
  "awaySetWins"  INTEGER NOT NULL DEFAULT 0,
  "notes"        TEXT,
  "pointsAwarded" BOOLEAN NOT NULL DEFAULT false,
  "feedPublished" BOOLEAN NOT NULL DEFAULT false,
  "playedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- MatchSet
CREATE TABLE IF NOT EXISTS "match_sets" (
  "id"           TEXT NOT NULL,
  "matchId"      TEXT NOT NULL,
  "setNumber"    INTEGER NOT NULL,
  "homeGames"    INTEGER NOT NULL,
  "awayGames"    INTEGER NOT NULL,
  "homeTiebreak" INTEGER,
  "awayTiebreak" INTEGER,
  CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_sets_matchId_setNumber_key" UNIQUE ("matchId", "setNumber")
);

-- MatchParticipant
CREATE TABLE IF NOT EXISTS "match_participants" (
  "id"          TEXT NOT NULL,
  "matchId"     TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "role"        "MatchParticipantRole" NOT NULL,
  "confirmed"   BOOLEAN NOT NULL DEFAULT false,
  "confirmedAt" TIMESTAMP(3),
  "disputed"    BOOLEAN NOT NULL DEFAULT false,
  "disputedAt"  TIMESTAMP(3),
  "disputeNote" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_participants_matchId_userId_key" UNIQUE ("matchId", "userId")
);

-- PlayerSportRating
CREATE TABLE IF NOT EXISTS "player_sport_ratings" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "sport"     "ActivityType" NOT NULL,
  "rating"    INTEGER NOT NULL DEFAULT 1000,
  "wins"      INTEGER NOT NULL DEFAULT 0,
  "losses"    INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "player_sport_ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_sport_ratings_userId_sport_key" UNIQUE ("userId", "sport")
);

-- Foreign keys
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_courtId_fkey"
  FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "match_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "match_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_sport_ratings" ADD CONSTRAINT "player_sport_ratings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_matchResultId_fkey"
  FOREIGN KEY ("matchResultId") REFERENCES "match_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
