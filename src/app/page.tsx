import Link from 'next/link'
import { Search, MapPin, Star, Zap } from 'lucide-react'

// ── Tattoo-style rose SVG illustration ────────────────────────
function RoseIllustration() {
  return (
    <svg
      viewBox="0 0 420 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[480px] select-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="roseGlow" cx="50%" cy="40%" r="52%">
          <stop offset="0%"   stopColor="#e63946" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="#e63946" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#e63946" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="stemGlow" cx="50%" cy="80%" r="40%">
          <stop offset="0%"   stopColor="#e63946" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#e63946" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Ambient glow ── */}
      <ellipse cx="210" cy="215" rx="210" ry="190" fill="url(#roseGlow)" />
      <ellipse cx="200" cy="430" rx="130" ry="110" fill="url(#stemGlow)" />

      {/* ══════════════════════════════════════════
          ROSE BLOOM  (center: 210, 215)
          ══════════════════════════════════════════ */}

      {/* Layer 1 — Outermost petals × 8 (rotate 45° each) */}
      {[0,45,90,135,180,225,270,315].map(a => (
        <path
          key={`op-${a}`}
          d="M 210 215 C 168 148 176 72 210 58 C 244 72 252 148 210 215 Z"
          transform={`rotate(${a} 210 215)`}
          fill="#e63946"
          fillOpacity="0.10"
          stroke="#e63946"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      ))}

      {/* Layer 2 — Outer-mid petals × 5 (staggered 36°) */}
      {[0,72,144,216,288].map(a => (
        <path
          key={`mp-${a}`}
          d="M 210 215 C 186 168 188 122 210 112 C 232 122 234 168 210 215 Z"
          transform={`rotate(${a} 210 215)`}
          fill="#e63946"
          fillOpacity="0.25"
          stroke="#e63946"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
      ))}

      {/* Layer 3 — Inner-mid petals × 4 (90° each) */}
      {[20,110,200,290].map(a => (
        <path
          key={`ip-${a}`}
          d="M 210 215 C 196 190 197 170 210 164 C 223 170 224 190 210 215 Z"
          transform={`rotate(${a} 210 215)`}
          fill="#e63946"
          fillOpacity="0.55"
          stroke="#e63946"
          strokeOpacity="0.75"
          strokeWidth="1"
        />
      ))}

      {/* Layer 4 — Innermost petals × 3 (tight spiral) */}
      {[0,120,240].map(a => (
        <path
          key={`cp-${a}`}
          d="M 210 215 C 204 204 204 196 210 192 C 216 196 216 204 210 215 Z"
          transform={`rotate(${a} 210 215)`}
          fill="#e63946"
          fillOpacity="0.88"
          stroke="#e63946"
          strokeOpacity="0.95"
          strokeWidth="0.8"
        />
      ))}

      {/* Center jewel */}
      <circle cx="210" cy="198" r="5.5" fill="#e63946" fillOpacity="0.95" />
      <circle cx="210" cy="198" r="2.5" fill="#ff7a84" fillOpacity="0.7" />

      {/* ── Calyx / sepals at base of bloom ── */}
      {[0,60,120,180,240,300].map(a => (
        <path
          key={`sep-${a}`}
          d="M 210 330 C 204 310 203 292 210 285 C 217 292 216 310 210 330 Z"
          transform={`rotate(${a} 210 305)`}
          fill="#e63946"
          fillOpacity="0.18"
          stroke="#e63946"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      ))}

      {/* ── Petal shading lines (gives tattoo illustration feel) ── */}
      <path d="M 210 215 C 195 190 186 155 192 112"
            stroke="#e63946" strokeOpacity="0.18" strokeWidth="0.7" fill="none" />
      <path d="M 210 215 C 222 188 230 152 228 112"
            stroke="#e63946" strokeOpacity="0.18" strokeWidth="0.7" fill="none" />
      <path d="M 210 215 C 178 200 158 175 160 140"
            stroke="#e63946" strokeOpacity="0.15" strokeWidth="0.7" fill="none" />
      <path d="M 210 215 C 240 200 262 175 260 140"
            stroke="#e63946" strokeOpacity="0.15" strokeWidth="0.7" fill="none" />

      {/* ══════════════════════════════════════════
          STEM
          ══════════════════════════════════════════ */}
      <path
        d="M 210 335 C 206 380 200 420 196 500"
        stroke="#e63946"
        strokeOpacity="0.45"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Stem center line (double-line style) */}
      <path
        d="M 207 350 C 203 390 198 425 195 495"
        stroke="#e63946"
        strokeOpacity="0.15"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="4 8"
      />

      {/* ── Left thorn ── */}
      <path
        d="M 204 370 C 196 360 186 354 178 344"
        stroke="#e63946" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round"
      />
      {/* ── Right thorn ── */}
      <path
        d="M 201 415 C 213 404 224 400 234 390"
        stroke="#e63946" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round"
      />

      {/* ── Left leaf ── */}
      <path
        d="M 202 380 C 185 362 158 350 138 332 C 152 345 174 355 202 380 Z"
        fill="#e63946" fillOpacity="0.14"
        stroke="#e63946" strokeOpacity="0.40" strokeWidth="1.2"
      />
      {/* Left leaf vein */}
      <path
        d="M 202 380 C 178 363 158 350 138 332"
        stroke="#e63946" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round"
      />

      {/* ── Right leaf ── */}
      <path
        d="M 204 432 C 226 412 254 400 272 382 C 252 396 226 408 204 432 Z"
        fill="#e63946" fillOpacity="0.14"
        stroke="#e63946" strokeOpacity="0.38" strokeWidth="1.2"
      />
      {/* Right leaf vein */}
      <path
        d="M 204 432 C 228 413 252 400 272 382"
        stroke="#e63946" strokeOpacity="0.20" strokeWidth="0.8" strokeLinecap="round"
      />

      {/* ── Decorative dots (tattoo detail) ── */}
      <circle cx="148" cy="345" r="2" fill="#e63946" fillOpacity="0.25" />
      <circle cx="270" cy="385" r="1.5" fill="#e63946" fillOpacity="0.22" />
      <circle cx="180" cy="462" r="1.5" fill="#e63946" fillOpacity="0.18" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <span className="font-display text-3xl tracking-wider text-white">INKSNAP</span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-[#e63946] hover:bg-[#d42f3b] text-white px-5 py-2.5 rounded-full transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
          ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center">

        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-[700px] h-[700px] rounded-full bg-[#e63946]/6 blur-3xl translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#e63946]/4 blur-3xl" />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(#e63946 1px, transparent 1px), linear-gradient(90deg, #e63946 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full pt-28 pb-16 lg:py-0">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-4 items-center min-h-screen lg:min-h-0 lg:h-screen">

            {/* ── Left: Text content ── */}
            <div className="flex flex-col justify-center lg:py-32">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#f5c518]/10 border border-[#f5c518]/20 rounded-full px-4 py-1.5 mb-10 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f5c518] animate-pulse" />
                <span className="text-xs text-[#f5c518] font-medium tracking-wide uppercase">
                  Now live in your city
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display leading-[0.88] tracking-wide text-white mb-8"
                  style={{ fontSize: 'clamp(4.5rem, 11vw, 9.5rem)' }}>
                FIND<br />
                YOUR<br />
                <span style={{
                  WebkitTextStroke: '2px rgba(230,57,70,0.85)',
                  color: 'transparent',
                }}>
                  PERFECT
                </span>
                <br />
                INK
              </h1>

              {/* Subtitle */}
              <p className="text-white/50 text-lg max-w-md leading-relaxed mb-10">
                Book appointments with the best tattoo artists in your city.
                Browse portfolios, compare styles, and get inked.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 bg-[#e63946] hover:bg-[#d42f3b] text-white px-8 py-4 rounded-full text-base font-medium transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(230,57,70,0.4)]"
                >
                  <Search size={18} />
                  Explore Artists
                </Link>
                <Link
                  href="/auth/signup?role=artist"
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full text-base font-medium transition-all"
                >
                  <Zap size={18} />
                  Join as Artist
                </Link>
              </div>

              {/* Social proof strip */}
              <div className="flex items-center gap-6 mt-12">
                <div className="flex -space-x-2">
                  {['A','B','C','D'].map(l => (
                    <div key={l} className="w-8 h-8 rounded-full bg-[#e63946]/20 border-2 border-[#0a0a0b] flex items-center justify-center text-[#e63946] text-[10px] font-display">
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={11} className="text-[#f5c518] fill-current" />
                    ))}
                  </div>
                  <p className="text-white/30 text-xs">Trusted by artists & clients</p>
                </div>
              </div>
            </div>

            {/* ── Right: Rose illustration ── */}
            <div className="hidden lg:flex items-center justify-center relative">
              {/* Glow ring behind rose */}
              <div className="absolute w-[400px] h-[400px] rounded-full bg-[#e63946]/10 blur-3xl" />
              {/* Faint ring border */}
              <div className="absolute w-[380px] h-[380px] rounded-full border border-[#e63946]/10" />
              <div className="absolute w-[480px] h-[480px] rounded-full border border-[#e63946]/5" />

              <div className="relative z-10">
                <RoseIllustration />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS
          ══════════════════════════════════════════ */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: 'Free',   label: 'To join & browse' },
            { value: 'Direct', label: 'Artist messaging' },
            { value: 'Easy',   label: 'Booking requests' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-5xl text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <div className="ink-accent-line mb-4" />
            <h2 className="font-display text-6xl text-white tracking-wide">HOW IT WORKS</h2>
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

      {/* ══════════════════════════════════════════
          CTA
          ══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-display text-white tracking-wide mb-6 leading-none"
            style={{ fontSize: 'clamp(2.5rem,6vw,5rem)' }}
          >
            READY TO<br />GET INKED?
          </h2>
          <p className="text-white/40 mb-8">
            Join thousands of clients who found their artist on InkSnap.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-[#e63946] hover:bg-[#d42f3b] text-white px-10 py-4 rounded-full text-base font-medium transition-all hover:scale-105"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display text-xl text-white/20 tracking-wider">INKSNAP</span>
          <p className="text-xs text-white/20">© 2025 InkSnap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
