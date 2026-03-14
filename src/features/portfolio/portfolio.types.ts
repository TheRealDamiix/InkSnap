// ─────────────────────────────────────────────────────────────────────────────
// Portfolio domain types
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioImage {
  id: string
  artist_id: string
  storage_path: string
  caption: string | null
  styles: string[]
  display_order: number
  created_at: string
  /** Computed client-side — not stored in the database */
  url?: string
}

/** Payload returned by the upload API — both the clean storage path
 *  and the derived public URL so callers never have to reconstruct either. */
export interface PortfolioUploadResult {
  storagePath: string
  url: string
}
