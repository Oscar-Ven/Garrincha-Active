import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Garrincha Active — Play. Compete. Earn.',
  description:
    'Track your padel, tennis, squash and pickleball matches, earn points, compete in challenges, and unlock exclusive rewards on Garrincha Active.',
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const stats = [
  { value: '20+', label: 'Players' },
  { value: '3', label: 'Centers' },
  { value: '100+', label: 'Activities Seeded' },
]

const features = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    title: 'Match & Session Tracking',
    description:
      'Log padel, tennis, squash, pickleball, badminton, and racquetball matches. Track duration, effort, and calories in one place.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
        />
      </svg>
    ),
    title: 'Challenges',
    description:
      'Join distance challenges, activity-count sprints, center-vs-center battles, and team competitions. Push your limits every week.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: 'Rewards',
    description:
      'Redeem your hard-earned points for discounts, free sessions, merchandise, food & drink vouchers, and VIP tournament access.',
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
    title: 'Social Feed',
    description:
      'Share your activities, celebrate badges, follow friends, react to posts, and build your sports community all in one feed.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Log Your Matches',
    description:
      'Log any racket sport — a padel game, a tennis match, a squash session. Our tracker captures duration, effort, and points automatically.',
  },
  {
    number: '02',
    title: 'Earn Points',
    description:
      'Every activity earns you points. Complete challenges, attend events, earn badges, and climb the leaderboard to reach Elite status.',
  },
  {
    number: '03',
    title: 'Unlock Rewards',
    description:
      'Spend your points in the rewards store. Get real perks from sports centers and sponsors — free sessions, gear discounts, and more.',
  },
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Section                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative bg-slate-900 overflow-hidden">
        {/* Decorative gradient blobs */}
        <div
          aria-hidden="true"
          className="absolute -top-40 -right-32 w-[600px] h-[600px] rounded-full bg-green-600/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-60 -left-40 w-[500px] h-[500px] rounded-full bg-green-600/8 blur-3xl pointer-events-none"
        />

        {/* Minimal nav */}
        <header className="relative z-10 mx-auto max-w-7xl px-6 pt-6 flex items-center justify-between">
          <span className="text-white font-bold text-xl tracking-tight">
            <span className="text-green-500">Garrincha</span> Active
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-green-600/15 border border-green-600/30 text-green-400 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Now Live — Built for Racket Sports
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
            Play.{' '}
            <span className="text-green-500">Compete.</span>{' '}
            Earn.
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
            Garrincha Active turns every padel, tennis, and squash match into a reward. Track
            your court sessions, take on challenges with your community, and redeem points for
            real-world perks at Garrincha sports centres.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-base px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-green-900/40"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/features"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors"
            >
              Explore Features
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 border-t border-white/10 pt-10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-black text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Everything you need
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Built for racket sport players
            </h2>
            <p className="max-w-2xl mx-auto mt-4 text-slate-500 text-lg">
              From solo drills to tournament finals — Garrincha Active has the tools to keep
              you on the court and motivated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white border border-slate-100 rounded-2xl p-7 shadow-sm hover:shadow-md hover:border-green-200 transition-all"
              >
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-slate-900 font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How It Works Section                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Simple by design
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              How it works
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-slate-500 text-lg">
              Three steps between you and your next reward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent"
            />

            {steps.map((step, i) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step number circle */}
                <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center mb-6 shadow-lg relative z-10">
                  <span className="text-2xl font-black text-green-400">{step.number}</span>
                </div>

                {/* Connecting arrow between steps (mobile) */}
                {i < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="md:hidden w-px h-8 bg-green-200 mb-6"
                  />
                )}

                <h3 className="text-slate-900 font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Call to Action Section                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-transparent to-yellow-600/10 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-green-600/15 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-600/15 border border-yellow-600/30 text-yellow-400 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
            Join the community
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Your next workout
            <br />
            <span className="text-green-500">earns more than fitness.</span>
          </h2>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Sign up free today and start earning points from your very first activity. No hidden
            fees, no subscriptions — just sport and rewards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-xl shadow-green-900/50"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-white/20 hover:border-white/40 text-white font-semibold text-lg px-10 py-4 rounded-xl transition-colors"
            >
              Sign In
            </Link>
          </div>

          <p className="text-slate-500 text-sm mt-8">
            Already have{' '}
            <span className="text-slate-400">20+ athletes</span>
            {' '}training on the platform.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-slate-950 text-slate-500 text-sm py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>
            <span className="text-green-500 font-semibold">Garrincha</span> Active &copy;{' '}
            {new Date().getFullYear()}
          </span>
          <nav className="flex gap-6">
            <Link href="/features" className="hover:text-slate-300 transition-colors">
              Features
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-300 transition-colors">
              Register
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
