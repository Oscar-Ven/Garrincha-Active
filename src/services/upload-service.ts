import { supabase, STORAGE_BUCKET } from '@/lib/storage'
import { prisma } from '@/lib/db'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_MEDIA_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { error: 'Avatar must be smaller than 5 MB.' }
  }

  if (!supabase) {
    // Dev fallback: return a placeholder
    return { url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${userId}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return { error: error.message }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: data.publicUrl } })

  return { url: data.publicUrl }
}

export async function uploadActivityMedia(
  userId: string,
  activityId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Only image files are allowed for activity media.' }
  }
  if (file.size > MAX_MEDIA_SIZE) {
    return { error: 'Media file must be smaller than 20 MB.' }
  }

  if (!supabase) {
    // Dev fallback: store a placeholder so the UI can still render
    const url = `https://picsum.photos/seed/${activityId}/800/600`
    await prisma.activityMedia.create({ data: { activityId, url, type: 'IMAGE' } })
    return { url }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `activities/${userId}/${activityId}-${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type })

  if (error) return { error: error.message }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  await prisma.activityMedia.create({ data: { activityId, url: data.publicUrl, type: 'IMAGE' } })
  return { url: data.publicUrl }
}
