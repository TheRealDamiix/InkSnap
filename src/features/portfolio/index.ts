// ─────────────────────────────────────────────────────────────────────────────
// Portfolio feature — Index Firewall
// All external imports MUST go through this barrel.
// Never import from internal paths directly.
// ─────────────────────────────────────────────────────────────────────────────

// Hooks
export {
  usePortfolio,
  useDeletePortfolioImage,
  useUploadPortfolioImages,
} from './hooks/usePortfolio'

// Storage API
export {
  uploadPortfolioImage,
  getPortfolioImageUrl,
  portfolioPath,
} from './api/upload'

// Types
export type {
  PortfolioImage,
  PortfolioUploadResult,
} from './portfolio.types'
