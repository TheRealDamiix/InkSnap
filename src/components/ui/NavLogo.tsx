import Image from 'next/image'

interface Props {
  className?: string
}

/** Drop-in replacement for every INKSNAP/TATSY text logo in the nav */
export function NavLogo({ className = '' }: Props) {
  return (
    <Image
      src="/navlogo.png"
      alt="Tatsy"
      width={140}
      height={40}
      className={`h-9 w-auto object-contain ${className}`}
      priority
    />
  )
}
