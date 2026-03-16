export const TATTOO_STYLES = [
  { slug: 'traditional', label: 'Traditional' },
  { slug: 'neo_traditional', label: 'Neo-Traditional' },
  { slug: 'realism', label: 'Realism' },
  { slug: 'blackwork', label: 'Blackwork' },
  { slug: 'fine_line', label: 'Fine Line' },
  { slug: 'watercolor', label: 'Watercolor' },
  { slug: 'japanese', label: 'Japanese' },
  { slug: 'tribal', label: 'Tribal' },
  { slug: 'geometric', label: 'Geometric' },
  { slug: 'illustrative', label: 'Illustrative' },
  { slug: 'surrealism', label: 'Surrealism' },
  { slug: 'dotwork', label: 'Dotwork' },
  { slug: 'new_school', label: 'New School' },
  { slug: 'chicano', label: 'Chicano' },
  { slug: 'biomechanical', label: 'Biomechanical' },
  { slug: 'lettering', label: 'Lettering' },
  { slug: 'portrait', label: 'Portrait' },
  { slug: 'minimalist', label: 'Minimalist' },
  { slug: 'nordic', label: 'Nordic / Viking' },
  { slug: 'trash_polka', label: 'Trash Polka' },
] as const

export type TattooStyleSlug = typeof TATTOO_STYLES[number]['slug']

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
}

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-emerald-400 bg-emerald-400/10',
  declined: 'text-red-400 bg-red-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
}

export const FEED_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  flash_deal:  { label: 'Flash Deal',   color: 'text-[#e63946] bg-[#e63946]/10' },
  update:      { label: 'Update',       color: 'text-blue-400 bg-blue-400/10'   },
  convention:  { label: 'Convention',   color: 'text-purple-400 bg-purple-400/10' },
  studio_post: { label: 'Studio Post',  color: 'text-amber-400 bg-amber-400/10' },
}
