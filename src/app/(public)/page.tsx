import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GG — Play. Compete. Earn.',
  description:
    'Track your padel, tennis, squash and pickleball matches, earn points, compete in challenges, and unlock exclusive rewards at Garrincha sports centres.',
}

const STATS = [
  { value: '20+', label: 'Players' },
  { value: '3', label: 'Centres' },
  { value: '100+', label: 'Activities' },
]

const FEATURES = [
  {
    icon: 'sports_kabaddi',
    title: 'Match Tracking',
    description:
      'Record padel, tennis, squash, pickleball, badminton, and racquetball. ELO rating and set-by-set breakdown included.',
    color: 'primary',
  },
  {
    icon: 'emoji_events',
    title: 'Challenges',
    description:
      'Join distance sprints, activity-count battles, and centre-vs-centre tournaments. Push your limits every week.',
    color: 'secondary',
  },
  {
    icon: 'redeem',
    title: 'Rewards',
    description:
      'Redeem points for free sessions, gear discounts, food vouchers, and VIP tournament access.',
    color: 'primary',
  },
  {
    icon: 'groups',
    title: 'Social Feed',
    description:
      'Share activities, celebrate badges, follow rivals, and build your racket sports community.',
    color: 'secondary',
  },
]

const STEPS = [
  {
    number: '01',
    icon: 'sports_tennis',
    title: 'Log Your Matches',
    description:
      'Record any racket sport session. Duration, effort, and ELO are captured automatically.',
  },
  {
    number: '02',
    icon: 'trending_up',
    title: 'Earn Points',
    description:
      'Every match earns XP. Complete challenges and climb to Bronze, Silver, Gold, or Elite.',
  },
  {
    number: '03',
    icon: 'redeem',
    title: 'Unlock Rewards',
    description:
      'Spend points in the rewards store. Real perks from centres and sponsors — no subscriptions.',
  },
]

export default function LandingPage() {
  return (
    <div className="bg-[#0c0e12] text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-screen flex flex-col justify-center">
        {/* Background glows */}
        <div aria-hidden className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-[#c3f400]/6 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[#4b8eff]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-center">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-[#c3f400]/10 border border-[#c3f400]/20 text-[#c3f400] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-10">
            <span className="w-1.5 h-1.5 bg-[#c3f400] rounded-full animate-pulse" />
            Now Live — Racket Sports Platform
          </div>

          {/* Logo mark */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="material-symbols-outlined text-[#c3f400]" style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}>
              sports_tennis
            </span>
            <span className="text-5xl font-black italic tracking-tighter text-[#c3f400]">GG</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-6">
            <span className="text-white">Play.</span>{' '}
            <span className="text-[#c3f400]">Compete.</span>{' '}
            <span className="text-white">Earn.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#c4c9ac] leading-relaxed mb-10">
            Garrincha Active turns every padel, tennis, and squash match into a reward. Track
            your sessions, take on community challenges, and redeem points at Garrincha sports centres.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-[#c3f400] text-[#161e00] font-bold text-base px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 0 24px rgba(195,244,0,0.3)' }}
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/features"
              className="w-full sm:w-auto border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all"
            >
              Explore Features
            </Link>
          </div>

          {/* Stats row */}
          <div className="border-t border-white/10 pt-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-black text-[#c3f400]">{s.value}</p>
                <p className="text-[#c4c9ac] text-xs mt-1 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="bg-[#111317] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#c3f400] font-bold text-xs uppercase tracking-widest mb-3">
              Built for court athletes
            </p>
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tight text-white">
              Everything you need
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-[#c4c9ac] text-lg">
              From solo drills to tournament finals — one platform, all your racket sports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-6 border border-white/8 bg-[#1e2023] hover:border-[#c3f400]/30 hover:bg-[#282a2e] transition-all group"
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-5 transition-colors ${
                  f.color === 'primary'
                    ? 'bg-[#c3f400]/10 text-[#c3f400] group-hover:bg-[#c3f400]/20'
                    : 'bg-[#4b8eff]/10 text-[#adc6ff] group-hover:bg-[#4b8eff]/20'
                }`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
                    {f.icon}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-[#c4c9ac] text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-[#0c0e12] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#adc6ff] font-bold text-xs uppercase tracking-widest mb-3">
              Simple by design
            </p>
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tight text-white">
              How it works
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-[#c4c9ac] text-lg">
              Three steps between you and your next reward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="rounded-xl p-6 border border-white/8 bg-[#1e2023] relative overflow-hidden"
              >
                {/* Step number watermark */}
                <span className="absolute top-4 right-4 text-5xl font-black text-[#c3f400]/8 select-none leading-none">
                  {step.number}
                </span>

                <div className="w-12 h-12 rounded-full bg-[#c3f400] text-[#161e00] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
                    {step.icon}
                  </span>
                </div>

                <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-[#c4c9ac] text-sm leading-relaxed">{step.description}</p>

                {/* Connector (desktop) */}
                {i < STEPS.length - 1 && (
                  <div aria-hidden className="hidden md:block absolute top-14 -right-3 w-6 h-px bg-[#c3f400]/30 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#111317] relative overflow-hidden py-24">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(195,244,0,0.07)_0%,transparent_70%)] pointer-events-none" />
        <div aria-hidden className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#4b8eff]/6 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#adc6ff]/10 border border-[#adc6ff]/20 text-[#adc6ff] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
            Join the community
          </div>

          <h2 className="text-4xl md:text-6xl font-black italic tracking-tight text-white leading-tight mb-6">
            Your next match
            <br />
            <span className="text-[#c3f400]">earns more than fitness.</span>
          </h2>

          <p className="text-[#c4c9ac] text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            Sign up free today and start earning points from your very first session.
            No hidden fees, no subscriptions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-[#c3f400] text-[#161e00] font-bold text-lg px-10 py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 0 32px rgba(195,244,0,0.25)' }}
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-white/20 hover:border-white/40 text-white font-semibold text-lg px-10 py-4 rounded-xl transition-all"
            >
              Sign In
            </Link>
          </div>

          <p className="text-[#c4c9ac]/60 text-sm mt-8">
            Already <span className="text-[#c4c9ac]">20+ athletes</span> training on the platform.
          </p>
        </div>
      </section>
    </div>
  )
}
