import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service [DRAFT] | Garrincha Active',
  description: 'Terms of Service for the Garrincha Active platform.',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Draft banner */}
        <div className="mb-8 rounded-lg border border-yellow-600/50 bg-yellow-600/10 px-4 py-3 text-sm text-yellow-400">
          <span className="font-semibold">DRAFT DOCUMENT</span> — This is not a final legal document and does not constitute legal advice. Content is subject to change before the platform launches publicly.
        </div>

        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Terms of Service{' '}
            <span className="text-yellow-500">[DRAFT]</span>
          </h1>
          <p className="mt-3 text-slate-400">
            Last updated: June 2026 &mdash; Draft version, not yet in effect.
          </p>
        </div>

        <div className="space-y-12 text-slate-300">

          {/* 1. Acceptance */}
          <section id="acceptance">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              1. Acceptance of Terms
            </h2>
            <p className="mb-3 leading-relaxed">
              By accessing or using the Garrincha Active platform (&quot;Platform&quot;, &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the Platform.
            </p>
            <p className="leading-relaxed">
              These Terms apply to all visitors, registered users, center administrators, and any other person who accesses the Platform. Your continued use of the Platform following any updates to these Terms constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* 2. Platform Use */}
          <section id="platform-use">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              2. Platform Use
            </h2>
            <p className="mb-3 leading-relaxed">
              Garrincha Active is a sports activity tracking, rewards, social, and challenge platform designed for players, sports centers, and sponsors. You may use the Platform only for lawful purposes and in accordance with these Terms.
            </p>
            <ul className="ml-4 list-disc space-y-2 leading-relaxed">
              <li>You must be at least 13 years of age to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate and truthful information when registering and when logging activities.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>The Platform reserves the right to modify, suspend, or discontinue any feature at any time.</li>
            </ul>
          </section>

          {/* 3. Points & Rewards */}
          <section id="points-rewards">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              3. Points &amp; Rewards
            </h2>
            <p className="mb-3 leading-relaxed">
              Garrincha Active operates a points system that allows users to earn and redeem points for rewards offered by partnered sports centers and sponsors. The following terms govern this system:
            </p>
            <ul className="ml-4 list-disc space-y-2 leading-relaxed">
              <li>Points are earned through verified activities, challenge completions, event attendance, referrals, and other qualifying actions as defined by the Platform from time to time.</li>
              <li>Points have no monetary value and cannot be exchanged for cash.</li>
              <li>Points may expire or be forfeited upon account termination or prolonged inactivity, as determined by the Platform.</li>
              <li>The Platform reserves the right to adjust, correct, or revoke points at its discretion, including in cases of suspected fraud or abuse.</li>
              <li>Reward availability, redemption conditions, and partner offers are subject to change without notice.</li>
              <li>The Platform is not responsible for the quality, availability, or fulfillment of rewards provided by third-party sponsors or centers.</li>
            </ul>
          </section>

          {/* 4. Prohibited Conduct */}
          <section id="prohibited-conduct">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              4. Prohibited Conduct
            </h2>
            <p className="mb-3 leading-relaxed">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="ml-4 list-disc space-y-2 leading-relaxed">
              <li>Submitting false, fabricated, or misleading activity data to earn points fraudulently.</li>
              <li>Using automated scripts, bots, or other means to manipulate leaderboards, challenges, or the points system.</li>
              <li>Harassing, threatening, or abusing other users through the social or team features.</li>
              <li>Uploading or sharing content that is illegal, defamatory, obscene, or infringes on the intellectual property rights of others.</li>
              <li>Attempting to gain unauthorized access to any part of the Platform, its servers, or associated systems.</li>
              <li>Reverse engineering, decompiling, or attempting to extract the source code of the Platform.</li>
              <li>Creating multiple accounts to circumvent bans, exploit rewards, or manipulate rankings.</li>
              <li>Selling, transferring, or monetizing your account or earned points outside of the Platform&apos;s official redemption mechanisms.</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Violations may result in immediate account suspension or termination and forfeiture of any accrued points and rewards.
            </p>
          </section>

          {/* 5. Termination */}
          <section id="termination">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              5. Termination
            </h2>
            <p className="mb-3 leading-relaxed">
              You may terminate your account at any time by contacting support or using the account deletion feature within the Platform settings.
            </p>
            <p className="mb-3 leading-relaxed">
              The Platform reserves the right to suspend or permanently terminate your account, without prior notice, if you violate these Terms or if the Platform determines your conduct is harmful to other users, partners, or the integrity of the service.
            </p>
            <p className="leading-relaxed">
              Upon termination, all accrued points and unredeemed rewards associated with your account will be forfeited. Content you have shared publicly may be retained in aggregated or anonymized form.
            </p>
          </section>

          {/* 6. Contact */}
          <section id="contact">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              6. Contact
            </h2>
            <p className="mb-3 leading-relaxed">
              If you have questions, concerns, or feedback regarding these Terms, please contact us:
            </p>
            <address className="not-italic space-y-1 text-slate-400">
              <p className="font-medium text-slate-200">Garrincha Active</p>
              <p>Email: <a href="mailto:legal@garrincha.app" className="text-green-500 hover:text-green-400 underline underline-offset-2">legal@garrincha.app</a></p>
            </address>
            <p className="mt-4 text-sm text-slate-500">
              This is a placeholder contact address. Final contact details will be confirmed prior to public launch.
            </p>
          </section>

        </div>

        {/* Footer note */}
        <div className="mt-16 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-4 text-sm text-slate-500">
          <p>
            <span className="font-semibold text-slate-400">Disclaimer:</span> This document is a draft for internal review purposes only. It is not a legally binding agreement and does not constitute legal advice. Final Terms of Service will be reviewed and approved by qualified legal counsel prior to the public launch of the Garrincha Active platform.
          </p>
        </div>

      </div>
    </main>
  )
}
