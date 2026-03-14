// ─────────────────────────────────────────────────────────────────────────────
// Bookings feature — Index Firewall
// All external imports MUST go through this barrel.
// Never import from internal paths directly.
// ─────────────────────────────────────────────────────────────────────────────

// Components
export { BookingModal } from './components/BookingModal'

// Hooks
export { useBookings, useBookingDetail } from './hooks/useBookings'
export {
  useUpdateBookingStatus,
  useSubmitReview,
  useOpenConversation,
} from './hooks/useBookingMutations'

// Types
export type {
  Booking,
  BookingDetail,
  BookingImage,
  BookingRequestForm,
  BookingStatus,
  Review,
} from './bookings.types'
