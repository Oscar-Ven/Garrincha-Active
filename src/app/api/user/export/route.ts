import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** GDPR Article 20 — data portability. Returns all personal data as a JSON file. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, activities, ledger, badges, posts, challenges, events, following] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      prisma.activity.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          type: true,
          startedAt: true,
          endedAt: true,
          durationMinutes: true,
          distanceKm: true,
          caloriesBurned: true,
          status: true,
          pointsEarned: true,
          visibility: true,
          description: true,
          createdAt: true,
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.pointsLedger.findMany({
        where: { userId: user.id },
        select: {
          sourceType: true,
          points: true,
          reason: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: { select: { name: true, description: true, iconUrl: true } } },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.feedPost.findMany({
        where: { userId: user.id },
        select: { type: true, content: true, visibility: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.challengeParticipant.findMany({
        where: { userId: user.id },
        include: {
          challenge: { select: { title: true, type: true, startDate: true, endDate: true } },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.eventRegistration.findMany({
        where: { userId: user.id },
        include: {
          event: { select: { title: true, startDate: true, endDate: true } },
        },
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: { select: { name: true, nickname: true } } },
      }),
    ])

  const payload = {
    exported_at: new Date().toISOString(),
    notice: 'This file contains all personal data Garrincha Active (Kempes BV) holds about you under GDPR Article 20.',
    profile,
    activities,
    points_ledger: ledger,
    badges: badges.map((b) => ({
      name: b.badge.name,
      description: b.badge.description,
      iconUrl: b.badge.iconUrl,
      awardedAt: b.awardedAt,
    })),
    feed_posts: posts,
    challenges: challenges.map((c) => ({
      title: c.challenge.title,
      type: c.challenge.type,
      startDate: c.challenge.startDate,
      endDate: c.challenge.endDate,
      progress: c.progress,
      isCompleted: c.isCompleted,
      joinedAt: c.joinedAt,
    })),
    events: events.map((e) => ({
      title: e.event.title,
      startDate: e.event.startDate,
      endDate: e.event.endDate,
      registeredAt: e.registeredAt,
      waitlisted: e.waitlisted,
    })),
    following: following.map((f) => ({
      name: f.following.name,
      nickname: f.following.nickname,
    })),
  }

  const filename = `garrincha-data-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
