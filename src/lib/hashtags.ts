import type { PrismaClient } from '@/generated/prisma/client'

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]{1,30})/g) ?? []
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))]
}

export async function syncHashtags(
  prismaClient: PrismaClient,
  type: 'activity' | 'feedpost',
  entityId: string,
  text: string,
) {
  const names = extractHashtags(text)
  if (!names.length) return

  for (const name of names) {
    const tag = await prismaClient.hashtag.upsert({
      where: { name },
      create: { name },
      update: {},
    })

    if (type === 'activity') {
      await prismaClient.activityHashtag.upsert({
        where: { activityId_hashtagId: { activityId: entityId, hashtagId: tag.id } },
        create: { activityId: entityId, hashtagId: tag.id },
        update: {},
      })
    } else {
      await prismaClient.feedPostHashtag.upsert({
        where: { feedPostId_hashtagId: { feedPostId: entityId, hashtagId: tag.id } },
        create: { feedPostId: entityId, hashtagId: tag.id },
        update: {},
      })
    }
  }
}
