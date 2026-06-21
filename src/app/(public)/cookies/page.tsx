import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy | Garrincha Active',
  description: 'How Kempes BV uses cookies on the Garrincha Active platform.',
}

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

        <header className="mb-12 border-b border-slate-700 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-500">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">Cookie Policy</h1>
          <p className="mt-4 text-slate-400">
            Last updated: June 2026 · <strong className="text-slate-300">Kempes BV</strong>, VAT BE0635 670 989
          </p>
        </header>

        <div className="space-y-12 text-slate-300 leading-relaxed">

          <section>
            <p>
              This Cookie Policy explains how Garrincha Active (operated by{' '}
              <strong className="text-white">Kempes BV</strong>) uses cookies and similar tracking
              technologies when you visit or use our platform. Non-essential cookies will only be placed
              after we have received your consent.
            </p>
          </section>

          {/* Essential */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">1. Essential Cookies</h2>
            <p className="mb-4">
              Essential cookies are strictly necessary for the platform to function. They cannot be
              disabled.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Provider</th>
                    <th className="px-4 py-3 text-left font-medium">Purpose</th>
                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    ['ga_session', 'garrincha.be', 'HMAC-signed authentication session. Keeps you securely signed in to Garrincha Active.', '7 days'],
                    ['*_session', 'garrincha.be', 'Server-side session state used across the platform.', 'Session'],
                    ['XSRF-TOKEN', 'garrincha.be', 'Protects forms and state-changing requests against Cross-Site Request Forgery (CSRF) attacks.', 'Session'],
                    ['cookie_preferences', 'garrincha.be', 'Stores your cookie consent choices so we do not ask again.', '2 years'],
                    ['locale', 'garrincha.be', 'Remembers your language and region preference.', '5 years'],
                  ].map(([name, provider, purpose, duration], i) => (
                    <tr key={name} className={i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'}>
                      <td className="px-4 py-3 font-mono text-green-400 whitespace-nowrap">{name}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{provider}</td>
                      <td className="px-4 py-3">{purpose}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Analytics */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">2. Analytics Cookies</h2>
            <p className="mb-4">
              Analytics cookies help us understand how visitors use the platform so we can improve it.
              These are only placed with your consent.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Provider</th>
                    <th className="px-4 py-3 text-left font-medium">Purpose</th>
                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    ['_ga', 'google.com', 'Google Analytics — distinguishes unique users by assigning a randomly generated number as a client identifier.', '2 years'],
                    ['_ga_*', 'google.com', 'Google Analytics 4 — stores and counts page views.', '2 years'],
                    ['_gid', 'google.com', 'Google Analytics — stores and updates a unique value for each page visited.', '24 hours'],
                    ['_GRECAPTCHA', 'google.com', 'Google reCAPTCHA — bot detection to protect forms.', '6 months'],
                  ].map(([name, provider, purpose, duration], i) => (
                    <tr key={name} className={i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'}>
                      <td className="px-4 py-3 font-mono text-blue-400 whitespace-nowrap">{name}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{provider}</td>
                      <td className="px-4 py-3">{purpose}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Managing */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">3. Managing Cookies</h2>
            <p className="mb-4">
              You can control and manage cookies in several ways. Removing or blocking essential cookies
              will prevent parts of the platform from working correctly.
            </p>
            <div className="space-y-4">
              {[
                ['Browser settings', 'Most browsers let you view, delete, and block cookies through their settings panel. Consult your browser\'s help documentation for Chrome, Firefox, Safari, or Edge.'],
                ['Sign out', 'Signing out of Garrincha Active clears your authentication session cookie immediately.'],
                ['Do Not Track', 'Garrincha Active honours DNT signals by not placing non-essential cookies when a DNT header is detected.'],
                ['Opt out of Google Analytics', 'Install the Google Analytics Opt-out Browser Add-on (tools.google.com/dlpage/gaoptout) to prevent Google Analytics from collecting data about your visits.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
                  <h3 className="mb-2 font-semibold text-white">{title}</h3>
                  <p className="text-sm text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">4. Contact</h2>
            <p className="mb-4">
              For questions about this Cookie Policy or to withdraw consent, contact us:
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-1 text-sm">
              <p className="font-semibold text-white">Kempes BV</p>
              <p>Kortrijksesteenweg 1166, 9051 Gent, Belgium</p>
              <p>
                <a href="mailto:hello@garrincha.be" className="text-green-400 underline underline-offset-2 hover:text-green-300">
                  hello@garrincha.be
                </a>
              </p>
            </div>
          </section>

        </div>

        <p className="mt-12 text-xs text-slate-600">© 2026 Kempes BV. All rights reserved.</p>

        <div className="mt-4 flex gap-4 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </main>
  )
}
