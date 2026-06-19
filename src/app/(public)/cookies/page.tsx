export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-white">Cookie Policy</h1>
        <span className="inline-block mb-10 rounded bg-yellow-600/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-yellow-500">
          Draft
        </span>

        <p className="mb-10 text-slate-400">
          This Cookie Policy explains how Garrincha Active uses cookies and
          similar tracking technologies when you visit or use our platform. By
          continuing to use our services you agree to the use of cookies as
          described below.
        </p>

        {/* Essential Cookies */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-green-500">
            Essential Cookies
          </h2>
          <p className="mb-3 text-slate-300">
            Essential cookies are strictly necessary for the platform to
            function. Without these cookies, core features such as
            authentication and security cannot operate. These cookies cannot be
            disabled.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-green-400">
                    garrincha_token
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    JWT authentication token stored as an HTTP-only cookie to
                    keep you signed in securely.
                  </td>
                  <td className="px-4 py-3 text-slate-400">7 days</td>
                </tr>
                <tr className="bg-slate-800/20">
                  <td className="px-4 py-3 font-mono text-green-400">
                    csrf_token
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    Protects forms and state-changing requests against
                    Cross-Site Request Forgery attacks.
                  </td>
                  <td className="px-4 py-3 text-slate-400">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Session Cookies */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-green-500">
            Session Cookies
          </h2>
          <p className="mb-3 text-slate-300">
            Session cookies are temporary cookies that exist only for the
            duration of your browser session. They are deleted automatically
            when you close your browser and are used to maintain state as you
            navigate between pages.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-green-400">
                    gg_session
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    Stores transient UI state (e.g. active tab, filter
                    selections) across page navigations within a single visit.
                  </td>
                  <td className="px-4 py-3 text-slate-400">Session</td>
                </tr>
                <tr className="bg-slate-800/20">
                  <td className="px-4 py-3 font-mono text-green-400">
                    gg_locale
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    Remembers your language or region preference for the current
                    session.
                  </td>
                  <td className="px-4 py-3 text-slate-400">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How to Manage Cookies */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-green-500">
            How to Manage Cookies
          </h2>
          <p className="mb-4 text-slate-300">
            You can control and manage cookies in several ways. Please note that
            removing or blocking essential cookies will prevent parts of the
            platform from working correctly.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="mb-2 font-semibold text-white">Browser Settings</h3>
              <p className="text-sm text-slate-400">
                Most browsers allow you to view, delete, and block cookies
                through their settings or preferences panel. Consult your
                browser&apos;s help documentation for instructions specific to
                your browser (Chrome, Firefox, Safari, Edge).
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="mb-2 font-semibold text-white">
                Signing Out
              </h3>
              <p className="text-sm text-slate-400">
                Signing out of Garrincha Active will clear your authentication
                cookie. You can sign out at any time from your account menu.
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="mb-2 font-semibold text-white">Do Not Track</h3>
              <p className="text-sm text-slate-400">
                Some browsers transmit a Do Not Track (DNT) signal. Garrincha
                Active currently honours DNT signals for non-essential cookies
                where technically feasible.
              </p>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-5">
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">Note:</span> This policy is a draft
            and subject to change before the platform&apos;s public launch. For
            questions, contact us at{" "}
            <a
              href="mailto:privacy@garrincha.app"
              className="underline hover:text-yellow-300"
            >
              privacy@garrincha.app
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
