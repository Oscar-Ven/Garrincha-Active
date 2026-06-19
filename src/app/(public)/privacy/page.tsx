export const metadata = {
  title: 'Privacy Policy [DRAFT] | Garrincha Active',
  description: 'Privacy Policy for the Garrincha Active platform.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12 border-b border-slate-700 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-600">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Privacy Policy{' '}
            <span className="text-yellow-600">[DRAFT]</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Last updated: June 2026. This document is a working draft and subject to change before
            the official platform launch.
          </p>
        </header>

        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">1. Data We Collect</h2>
            <p className="mb-4 text-slate-300 leading-relaxed">
              Garrincha Active collects information you provide directly when you create an account
              and use the platform, as well as data generated automatically through your activity on
              the service.
            </p>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Account information:</strong> Name, email address,
                  date of birth, profile photo, and preferred language.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Activity records:</strong> Sport type, duration,
                  distance, intensity, and any notes you attach to a logged activity.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Social interactions:</strong> Posts, comments,
                  reactions, team memberships, and challenge participation.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Points and rewards:</strong> Earned points,
                  redeemed rewards, badge history, and redemption codes — all platform-specific and
                  non-transferable outside of Garrincha Active.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Device and usage data:</strong> Browser type, IP
                  address, referring URLs, and pages visited within the platform.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">
              2. Activity Data and GPS
            </h2>
            <p className="mb-4 text-slate-300 leading-relaxed">
              When you log an activity, Garrincha Active may collect location data if you have
              granted GPS permission in your device or browser settings.
            </p>
            <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-5 text-slate-300">
              <p className="font-semibold text-yellow-400">Location data notice</p>
              <p className="mt-2 leading-relaxed">
                Activity data may include precise geographic coordinates when GPS is enabled. This
                data is used solely to calculate route distance, map your session, and validate
                activity submissions. GPS tracking is optional — you may log activities without
                enabling location access, though distance-based metrics will require manual input.
              </p>
            </div>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Location data associated with an activity is stored in our database and subject to
              the visibility settings you choose for that activity. We do not sell GPS route data to
              third parties or use it for advertising profiling.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">3. User Controls</h2>
            <p className="mb-4 text-slate-300 leading-relaxed">
              You retain control over how your data and activities are shared on the platform.
            </p>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Activity visibility:</strong> Each activity can be
                  set to Public, Followers Only, or Private. Public activities may appear in the
                  community feed and challenge leaderboards.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Profile visibility:</strong> Your profile, points
                  total, and badge collection can be shown to all users, followers only, or kept
                  private.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">GPS opt-out:</strong> You can deny or revoke
                  location permissions at any time in your device settings. Previously collected
                  GPS data can be deleted on request.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Account deletion:</strong> You may request full
                  account deletion. This permanently removes your profile, activities, and associated
                  data, subject to any legal retention obligations. Points and rewards are forfeited
                  upon deletion.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  <strong className="text-white">Data export:</strong> You may request a copy of
                  your personal data in a machine-readable format by contacting us at the address
                  below.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">4. Sponsor Data</h2>
            <p className="mb-4 text-slate-300 leading-relaxed">
              Garrincha Active partners with sponsors who provide rewards and vouchers redeemable
              through the platform. The following applies to how your data interacts with sponsor
              relationships.
            </p>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  When you redeem a sponsor reward, the sponsor may receive confirmation of
                  redemption (e.g., that a voucher code was used). They do not receive your full
                  profile, activity history, or GPS data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  Sponsors may receive aggregated, anonymized statistics about platform activity
                  levels and reward redemption rates to evaluate their sponsorship impact. Individual
                  user data is not included in these reports.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  Points and rewards are platform-specific and administered solely by Garrincha
                  Active. Sponsors do not control your points balance or account standing.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
                <span>
                  We do not sell your personal data to sponsors or any other third parties for
                  advertising or marketing purposes.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-green-500">5. Contact</h2>
            <p className="mb-4 text-slate-300 leading-relaxed">
              For questions about this Privacy Policy, to exercise your data rights, or to report a
              privacy concern, please contact us.
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-slate-300">
              <p className="font-semibold text-white">Garrincha Active — Privacy Team</p>
              <p className="mt-2">
                Email:{' '}
                <a
                  href="mailto:privacy@garrincha.app"
                  className="text-green-500 underline underline-offset-4 hover:text-green-400"
                >
                  privacy@garrincha.app
                </a>
              </p>
              <p className="mt-1 text-slate-400 text-sm">
                We aim to respond to all privacy requests within 30 days.
              </p>
            </div>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              This Privacy Policy is a draft and will be reviewed by legal counsel before the
              platform opens to the public. It is subject to revision. By using the platform during
              the early-access or beta period you acknowledge that privacy practices may be updated
              prior to the general launch.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
