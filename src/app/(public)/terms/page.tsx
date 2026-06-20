import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Garrincha Active',
  description: 'Terms governing use of the Garrincha Active platform, operated by Kempes BV.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

        <header className="mb-12 border-b border-slate-700 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-500">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Service</h1>
          <p className="mt-4 text-slate-400">
            Last updated: June 2026 · Governed by Belgian law ·{' '}
            <strong className="text-slate-300">Kempes BV</strong>, VAT BE0635 670 989
          </p>
        </header>

        <div className="space-y-12 text-slate-300 leading-relaxed">

          <section id="acceptance">
            <h2 className="mb-4 text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="mb-3">
              By accessing or using the Garrincha Active platform (&ldquo;Platform&rdquo;, &ldquo;Service&rdquo;), you agree to
              be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, you must not use the
              Platform.
            </p>
            <p>
              These Terms apply to all visitors, registered players, centre administrators, sponsors,
              and any other person who accesses the Platform. Continued use after any update constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section id="operator">
            <h2 className="mb-4 text-2xl font-semibold text-white">2. Operator</h2>
            <p className="mb-4">
              The Platform is operated by:
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-1 text-sm">
              <p className="font-semibold text-white">Kempes BV</p>
              <p>Kortrijksesteenweg 1166, 9051 Gent, Belgium</p>
              <p>VAT: BE0635 670 989</p>
              <p>
                <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                  hello@garrincha.be
                </a>
                {' '}·{' '}
                <a href="tel:+3228870844" className="text-green-400 hover:text-green-300">+32 2 887 08 44</a>
              </p>
            </div>
            <p className="mt-4 text-sm">
              Garrincha Active is the digital loyalty, booking, and activity tracking extension of the
              Garrincha urban sports facilities network, with locations across Antwerp, Charleroi,
              Diegem, Ghent, Kortrijk, Liège, and Dilbeek.
            </p>
          </section>

          <section id="platform-use">
            <h2 className="mb-4 text-2xl font-semibold text-white">3. Platform Use</h2>
            <p className="mb-3">
              Garrincha Active is a sports activity tracking, loyalty rewards, social, court booking,
              and challenge platform. You may use the Platform only for lawful purposes and in
              accordance with these Terms.
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>You must be at least 13 years of age to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate and truthful information when registering and logging activities.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>Kempes BV reserves the right to modify, suspend, or discontinue any feature at any time.</li>
            </ul>
          </section>

          <section id="reservations">
            <h2 className="mb-4 text-2xl font-semibold text-white">4. Reservations &amp; Cancellations</h2>
            <p className="mb-3">
              When booking courts or registering for sessions through the Platform, the following policy applies:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-white">Standard reservations:</strong> May be cancelled free of
                charge up to <strong className="text-white">6 hours</strong> before the start time via
                the Platform.
              </li>
              <li>
                <strong className="text-white">Large bookings (2+ courts):</strong> Must be cancelled at
                least <strong className="text-white">2 business days</strong> in advance. Events
                exceeding 2 courts require 1 week&apos;s notice.
              </li>
              <li>
                <strong className="text-white">Children&apos;s parties:</strong> Cancellation is permitted up
                to 2 days prior; branded merchandise costs remain billable regardless.
              </li>
              <li>
                <strong className="text-white">Credits:</strong> Cancellations generate credits valid for
                <strong className="text-white"> one year</strong> across all Garrincha sports and
                locations, rather than monetary refunds.
              </li>
              <li>
                <strong className="text-white">No-shows:</strong> Kempes BV reserves the right to refuse
                future reservations and may restrict repeat offenders to online-only payment.
              </li>
            </ul>
          </section>

          <section id="equipment">
            <h2 className="mb-4 text-2xl font-semibold text-white">5. Equipment &amp; Facility Use</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>You bear responsibility for any rented equipment during your booking period.</li>
              <li>Normal wear and tear incurs no charges; loss or intentional damage triggers full replacement cost.</li>
              <li>Deliberate damage to Garrincha facilities may result in police involvement and full customer liability.</li>
            </ul>
          </section>

          <section id="points-rewards">
            <h2 className="mb-4 text-2xl font-semibold text-white">6. Points &amp; Rewards</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>Points are earned through verified activities, challenge completions, event attendance, referrals, and check-ins at Garrincha locations.</li>
              <li>Points have <strong className="text-white">no monetary value</strong> and cannot be exchanged for cash.</li>
              <li>Points expire after <strong className="text-white">12 months</strong> of inactivity, consistent with the Kempes BV credit policy.</li>
              <li>Kempes BV reserves the right to adjust, correct, or revoke points in cases of suspected fraud or abuse.</li>
              <li>Reward availability, redemption conditions, and partner offers are subject to change without notice.</li>
              <li>Kempes BV is not responsible for the quality, availability, or fulfillment of rewards provided by third-party sponsors.</li>
            </ul>
          </section>

          <section id="media">
            <h2 className="mb-4 text-2xl font-semibold text-white">7. Photos &amp; Media</h2>
            <p>
              Photos or videos taken at Garrincha facilities or uploaded to the Platform may be used
              by Kempes BV for marketing and promotional purposes. If you do not wish your media to be
              used in this way, email{' '}
              <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                hello@garrincha.be
              </a>{' '}
              to opt out.
            </p>
          </section>

          <section id="prohibited-conduct">
            <h2 className="mb-4 text-2xl font-semibold text-white">8. Prohibited Conduct</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>Submitting false or fabricated activity data to earn points fraudulently.</li>
              <li>Using bots or automated scripts to manipulate leaderboards, challenges, or the points system.</li>
              <li>Harassing, threatening, or abusing other users through social or team features.</li>
              <li>Uploading content that is illegal, defamatory, obscene, or infringes intellectual property rights.</li>
              <li>Attempting to gain unauthorised access to any part of the Platform or its systems.</li>
              <li>Creating multiple accounts to circumvent bans, exploit rewards, or manipulate rankings.</li>
              <li>Selling, transferring, or monetising your account or earned points outside official Platform mechanisms.</li>
            </ul>
            <p className="mt-3">
              Violations may result in immediate account suspension, termination, and forfeiture of all
              accrued points and rewards.
            </p>
          </section>

          <section id="termination">
            <h2 className="mb-4 text-2xl font-semibold text-white">9. Termination</h2>
            <p className="mb-3">
              You may terminate your account at any time via Platform settings or by contacting
              hello@garrincha.be. Upon termination, all accrued points and unredeemed rewards are
              forfeited.
            </p>
            <p>
              Kempes BV reserves the right to suspend or permanently terminate your account without prior
              notice for violations of these Terms or conduct harmful to users, partners, or the
              integrity of the service.
            </p>
          </section>

          <section id="liability">
            <h2 className="mb-4 text-2xl font-semibold text-white">10. Limitation of Liability</h2>
            <p className="mb-3">
              The Platform is provided on an &ldquo;as is&rdquo; basis. Kempes BV does not warrant uninterrupted
              or error-free access. To the extent permitted by Belgian law, Kempes BV&apos;s aggregate
              liability for any claim arising from the use of the Platform shall not exceed the amount
              paid by you (if any) in the three months prior to the claim.
            </p>
            <p>
              Kempes BV is not liable for loss of points due to technical failures, provided reasonable
              efforts are made to restore accurate balances where verifiable records exist.
            </p>
          </section>

          <section id="governing-law">
            <h2 className="mb-4 text-2xl font-semibold text-white">11. Governing Law &amp; Disputes</h2>
            <p className="mb-3">
              These Terms are governed by <strong className="text-white">Belgian law</strong>. Any
              dispute arising from the use of the Platform shall first be submitted to Kempes BV via
              email at{' '}
              <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                hello@garrincha.be
              </a>. We aim to respond within 48 hours and resolve within 5 business days.
            </p>
            <p>
              Unresolved disputes shall be subject to the exclusive jurisdiction of the competent
              courts of Ghent, Belgium.
            </p>
          </section>

          <section id="contact">
            <h2 className="mb-4 text-2xl font-semibold text-white">12. Contact</h2>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-1 text-sm">
              <p className="font-semibold text-white">Kempes BV — Legal</p>
              <p>Kortrijksesteenweg 1166, 9051 Gent, Belgium</p>
              <p>
                <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                  hello@garrincha.be
                </a>
                {' '}·{' '}
                <a href="tel:+3228870844" className="text-green-400 hover:text-green-300">+32 2 887 08 44</a>
              </p>
            </div>
          </section>

        </div>

        <p className="mt-12 text-xs text-slate-600">
          © 2026 Kempes BV. All rights reserved.
        </p>

        <div className="mt-4 flex gap-4 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </main>
  )
}
