import { createClient } from './supabase/client'

export const BUCKETS = {
  AVATARS: 'avatars',
  PORTFOLIO: 'portfolio',
  BOOKING_REFS: 'booking-refs',
  PROMOTIONS: 'promotions',
} as const

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: options?.upsert ?? false })

  if (error) throw error
  return getPublicUrl(bucket, path)
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

export function avatarPath(userId: string, ext = 'jpg'): string {
  return `${userId}/avatar.${ext}`
}

export function portfolioPath(artistId: string, imageId: string, ext = 'jpg'): string {
  return `${artistId}/${imageId}.${ext}`
}

export function bookingRefPath(bookingId: string, imageId: string, ext = 'jpg'): string {
  return `${bookingId}/${imageId}.${ext}`
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = avatarPath(userId, ext)
  return uploadFile(BUCKETS.AVATARS, path, file, { upsert: true })
}

export async function uploadPortfolioImage(artistId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const imageId = crypto.randomUUID()
  const path = portfolioPath(artistId, imageId, ext)
  return uploadFile(BUCKETS.PORTFOLIO, path, file)
}
