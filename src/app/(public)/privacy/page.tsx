import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Garrincha Active',
  description: 'How Kempes BV collects, uses, and protects your personal data on the Garrincha Active platform.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

        <header className="mb-12 border-b border-slate-700 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-500">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
          <p className="mt-4 text-slate-400">Last updated: June 2026</p>
        </header>

        <div className="space-y-12 text-slate-300 leading-relaxed">

          {/* Controller */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">1. Data Controller</h2>
            <p className="mb-4">
              The Garrincha Active platform is operated by <strong className="text-white">Kempes BV</strong>,
              registered in Belgium under VAT number <strong className="text-white">BE0635 670 989</strong>.
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-1 text-sm">
              <p className="font-semibold text-white">Kempes BV</p>
              <p>Kortrijksesteenweg 1166, 9051 Gent, Belgium</p>
              <p>
                <a href="mailto:hello@garrincha.be" className="text-green-400 hover:text-green-300 underline underline-offset-2">
                  hello@garrincha.be
                </a>
                {' '}·{' '}
                <a href="tel:+3228870844" className="text-green-400 hover:text-green-300">
                  +32 2 887 08 44
                </a>
              </p>
            </div>
          </section>

          {/* Data collected */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">2. Data We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly when you create an account and use the platform,
              as well as data generated automatically through your activity on the service.
            </p>
            <ul className="space-y-3">
              {[
                ['Account information', 'Name, email address, date of birth, profile photo, phone number, and preferred language.'],
                ['Activity records', 'Sport type, duration, distance, intensity, GPS route coordinates (when location permission is granted), and any notes you attach to a logged activity.'],
                ['Social interactions', 'Posts, comments, reactions, team memberships, challenge participation, and direct messages.'],
                ['Points and rewards', 'Earned points, redeemed rewards, badge history, and redemption codes — all platform-specific and non-transferable.'],
                ['Booking and payment data', 'Court reservations, session registrations, and payment status (processed via Stripe — we do not store card numbers).'],
                ['Device and usage data', 'Browser type, IP address, referring URLs, and pages visited within the platform.'],
                ['Media', 'Photos or videos you upload to activities. Kempes BV may use these for promotional purposes; you may opt out by emailing hello@garrincha.be.'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-600" />
                  <span><strong className="text-white">{title}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* GPS */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">3. Location Data &amp; GPS</h2>
            <p className="mb-4">
              When you log an activity or use geo check-in, Garrincha Active may collect precise
              location data if you have granted GPS permission in your device or browser settings.
            </p>
            <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-5">
              <p className="font-semibold text-yellow-400">Location data notice</p>
              <p className="mt-2">
                GPS coordinates are used solely to calculate route distance, map your session, validate
                activity submissions, and verify proximity to a Garrincha sports centre for check-in.
                GPS tracking is optional — you may log activities without enabling location access.
                We do not sell GPS route data to third parties or use it for advertising profiling.
              </p>
            </div>
          </section>

          {/* Legal basis */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">4. Legal Basis for Processing</h2>
            <ul className="space-y-3">
              {[
                ['Contract performance', 'Processing your account, activity logs, bookings, and points is necessary to deliver the platform services you signed up for.'],
                ['Legitimate interest', 'Fraud detection, platform security, and aggregated analytics to improve the service.'],
                ['Consent', 'Marketing emails and promotional communications. You may withdraw consent at any time by unsubscribing or emailing hello@garrincha.be.'],
                ['Legal obligation', 'Where Belgian or EU law requires us to retain certain records.'],
              ].map(([basis, desc]) => (
                <li key={basis} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-600" />
                  <span><strong className="text-white">{basis}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Retention */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">5. Retention</h2>
            <p className="mb-4">
              We retain your personal data for as long as your account is active or as needed to provide
              services. Upon account deletion we remove your profile, activities, and associated data,
              subject to legal retention obligations under Belgian law (e.g. financial records may be
              retained for 7 years). Points and rewards are forfeited upon deletion.
            </p>
            <p>
              Loyalty credits earned at Garrincha Active expire after <strong className="text-white">12 months</strong> of inactivity, consistent with the Kempes BV credit policy across all locations.
            </p>
          </section>

          {/* Third parties */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">6. Third-Party Processors</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Processor</th>
                    <th className="px-4 py-3 text-left font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    ['Supabase / PostgreSQL', 'Primary database and file storage (avatars, media)'],
                    ['Stripe', 'Payment processing for court bookings and session fees'],
                    ['Resend', 'Transactional email (booking confirmations, OTP codes)'],
                    ['Twilio', 'SMS one-time passwords for phone login'],
                    ['Strava', 'Activity import (only when you explicitly connect your Strava account)'],
                    ['Google', 'OAuth sign-in (only when you choose "Sign in with Google")'],
                    ['Sentry', 'Error monitoring — anonymised stack traces only'],
                    ['Upstash Redis', 'Rate limiting — IP/user identifier hashing only'],
                  ].map(([p, d]) => (
                    <tr key={p} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white">{p}</td>
                      <td className="px-4 py-3 text-slate-400">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              Sponsors receive only aggregated, anonymised redemption statistics. Individual user data,
              activity records, and GPS data are never shared with sponsors.
            </p>
          </section>

          {/* User rights */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">7. Your Rights (GDPR)</h2>
            <p className="mb-4">
              As a resident of the European Economic Area you have the following rights regarding your personal data:
            </p>
            <ul className="space-y-3">
              {[
                ['Access', 'Request a copy of all personal data we hold about you.'],
                ['Rectification', 'Correct inaccurate or incomplete data.'],
                ['Erasure', 'Request deletion of your account and associated personal data.'],
                ['Portability', 'Receive your data in a machine-readable format (JSON or CSV).'],
                ['Restriction', 'Ask us to limit how we use your data while a dispute is resolved.'],
                ['Objection', 'Object to processing based on legitimate interest, including marketing.'],
                ['Withdraw consent', 'Withdraw marketing consent at any time without affecting prior lawful processing.'],
              ].map(([right, desc]) => (
                <li key={right} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-600" />
                  <span><strong className="text-white">{right}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{' '}
              <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                hello@garrincha.be
              </a>. We aim to respond within 30 days. You also have the right to lodge a complaint with the
              Belgian Data Protection Authority (<a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" className="text-green-400 underline underline-offset-2 hover:text-green-300">dataprotectionauthority.be</a>).
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">8. Contact</h2>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-1">
              <p className="font-semibold text-white">Kempes BV — Privacy</p>
              <p>Kortrijksesteenweg 1166, 9051 Gent, Belgium</p>
              <p>
                <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                  hello@garrincha.be
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 flex gap-4 text-sm text-slate-500">
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </main>
  )
}
