import Link from 'next/link'
import { Search, MapPin, Star, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <span className="font-display text-2xl tracking-wider text-white">INKSNAP</span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/auth/signup" className="text-sm bg-[#e63946] hover:bg-[#d42f3b] text-white px-4 py-2 rounded-full transition-colors font-medium">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background texture elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-[#e63946]/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#e63946]/3 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-[#f5c518]/10 border border-[#f5c518]/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f5c518] animate-pulse" />
            <span className="text-xs text-[#f5c518] font-medium tracking-wide uppercase">Now live in your city</span>
          </div>

          <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-none tracking-wide text-white mb-6">
            FIND YOUR<br />
            <span style={{ WebkitTextStroke: '1px rgba(230,57,70,0.8)', color: 'transparent' }}>
              PERFECT
            </span>{' '}
            INK
          </h1>

          <p className="text-white/50 text-lg max-w-xl leading-relaxed mb-10">
            Book appointments with the best tattoo artists in your city. Browse portfolios, compare styles, and get inked — all in one place.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/search" className="group inline-flex items-center gap-2 bg-[#e63946] hover:bg-[#d42f3b] text-white px-8 py-4 rounded-full text-base font-medium transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(230,57,70,0.4)]">
              <Search size={18} />
              Explore Artists
            </Link>
            <Link href="/auth/signup?role=artist" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full text-base font-medium transition-all">
              <Zap size={18} />
              Join as Artist
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: 'Free', label: 'To join & browse' },
            { value: 'Direct', label: 'Artist messaging' },
            { value: 'Easy', label: 'Booking requests' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-4xl text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <div className="ink-accent-line mb-4" />
            <h2 className="font-display text-5xl text-white tracking-wide">HOW IT WORKS</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Search size={24} />,
                title: 'Discover',
                body: 'Search by style, location, or artist name. Browse portfolios and find your perfect match.',
                accent: 'bg-[#e63946]/10 border-[#e63946]/20 text-[#e63946]',
              },
              {
                icon: <MapPin size={24} />,
                title: 'Book',
                body: 'Send a booking request with your ideas, reference images, and preferred dates.',
                accent: 'bg-[#e63946]/10 border-[#e63946]/20 text-[#e63946]',
              },
              {
                icon: <Star size={24} />,
                title: 'Review',
                body: 'After your appointment, leave a review and help the community find great artists.',
                accent: 'bg-[#f5c518]/10 border-[#f5c518]/20 text-[#f5c518]',
              },
            ].map((f) => (
              <div key={f.title} className="ink-card p-7 group">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-5 ${f.accent}`}>
                  {f.icon}
                </div>
                <h3 className="font-display text-2xl text-white tracking-wide mb-3">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] text-white tracking-wide mb-6 leading-none">
            READY TO<br />GET INKED?
          </h2>
          <p className="text-white/40 mb-8">Join thousands of clients who found their artist on InkSnap.</p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-[#e63946] hover:bg-[#d42f3b] text-white px-10 py-4 rounded-full text-base font-medium transition-all hover:scale-105">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display text-xl text-white/20 tracking-wider">INKSNAP</span>
          <p className="text-xs text-white/20">© 2025 InkSnap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
