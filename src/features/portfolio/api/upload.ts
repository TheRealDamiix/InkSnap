// ─────────────────────────────────────────────────────────────────────────────
// Portfolio storage API
//
// All portfolio-specific storage operations live here.
// Cross-feature utilities (getPublicUrl, uploadFile, BUCKETS) are imported
// from @/lib/storage — they stay there because other features use them too.
// ─────────────────────────────────────────────────────────────────────────────

import { getPublicUrl, uploadFile, BUCKETS } from '@/lib/storage'
import type { PortfolioUploadResult } from '../portfolio.types'

// ── Path builder ──────────────────────────────────────────────────────────────

/**
 * Builds the Supabase storage path for a portfolio image.
 * Pattern: `{artistId}/{imageId}.{ext}`
 */
export function portfolioPath(artistId: string, imageId: string, ext = 'jpg'): string {
  return `${artistId}/${imageId}.${ext}`
}

// ── Public URL helper ─────────────────────────────────────────────────────────

/**
 * Returns the public URL for a portfolio image given its storage path.
 * Consuming components should call this instead of referencing BUCKETS directly.
 */
export function getPortfolioImageUrl(storagePath: string): string {
  return getPublicUrl(BUCKETS.PORTFOLIO, storagePath)
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Uploads a single portfolio image to Supabase storage.
 *
 * Returns both `storagePath` and `url` so the caller can:
 *   - Insert `storagePath` into the `portfolio_images` table
 *   - Use `url` immediately for optimistic rendering without a round-trip
 *
 * Unlike the legacy `uploadPortfolioImage` in @/lib/storage (which returns only
 * the URL and forces callers to reverse-engineer the path), this function
 * returns both values cleanly.
 */
export async function uploadPortfolioImage(
  artistId: string,
  file: File
): Promise<PortfolioUploadResult> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const imageId = crypto.randomUUID()
  const storagePath = portfolioPath(artistId, imageId, ext)
  const url = await uploadFile(BUCKETS.PORTFOLIO, storagePath, file)
  return { storagePath, url }
}
