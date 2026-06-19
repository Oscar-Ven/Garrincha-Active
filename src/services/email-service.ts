import { resend, FROM_EMAIL } from '@/lib/email'

// ── HTML template helper ──────────────────────────────────────────────────────
function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color: #e2e8f0; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg,#16a34a,#15803d); padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #fff; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #bbf7d0; }
    .body { padding: 32px; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5e1; }
    .btn { display: inline-block; padding: 13px 28px; background: #16a34a; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 20px; }
    .code { display: inline-block; letter-spacing: 6px; font-size: 32px; font-weight: 700; color: #4ade80; background: #0f172a; border: 1px solid #16a34a; border-radius: 8px; padding: 12px 24px; margin: 12px 0 20px; }
    .divider { border: none; border-top: 1px solid #334155; margin: 24px 0; }
    .footer { padding: 20px 32px; background: #0f172a; font-size: 12px; color: #475569; text-align: center; }
    .footer a { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>⚽ Garrincha Active</h1>
        <p>Your Sport Community</p>
      </div>
      <div class="body">${bodyHtml}</div>
      <div class="footer">
        <p>© 2025 Garrincha Active. All rights reserved.</p>
        <p><a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ── Verification email ────────────────────────────────────────────────────────
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  const html = baseTemplate('Verify your email', `
    <p>Hi ${name},</p>
    <p>Welcome to Garrincha Active! Please verify your email address to start tracking your activities and competing with your community.</p>
    <a class="btn" href="${verifyUrl}">Verify Email Address</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b">If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.</p>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: 'Verify your Garrincha Active account', html })
}

// ── Password reset email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  const html = baseTemplate('Reset your password', `
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your Garrincha Active account.</p>
    <a class="btn" href="${resetUrl}">Reset Password</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b">If you didn't request a password reset, no action is needed. This link expires in 1 hour.</p>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: 'Reset your Garrincha Active password', html })
}

// ── Welcome email (after verification) ───────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const html = baseTemplate('Welcome to the community!', `
    <p>Hi ${name},</p>
    <p>Your account is verified! You're now part of the Garrincha Active community — a movement where sport meets community.</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/app">Open Garrincha Active</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b">Log your first activity, join a team, and start earning points. See you on the leaderboard!</p>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: 'Welcome to Garrincha Active! 🎉', html })
}

// ── Badge earned notification ─────────────────────────────────────────────────
export async function sendBadgeEarnedEmail(
  to: string,
  name: string,
  badgeName: string,
  badgeDescription: string,
): Promise<void> {
  const html = baseTemplate(`You earned: ${badgeName}`, `
    <p>Hi ${name},</p>
    <p>Congratulations! You've just earned a new badge:</p>
    <p><strong style="color:#4ade80;font-size:17px">🏆 ${badgeName}</strong></p>
    <p style="color:#94a3b8;font-style:italic">${badgeDescription}</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/app/profile">View Your Profile</a>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: `You earned a badge: ${badgeName}`, html })
}

// ── Activity approved notification ───────────────────────────────────────────
export async function sendActivityApprovedEmail(
  to: string,
  name: string,
  activityTitle: string,
  pointsEarned: number,
): Promise<void> {
  const html = baseTemplate('Activity approved!', `
    <p>Hi ${name},</p>
    <p>Your activity has been reviewed and approved:</p>
    <p><strong style="color:#e2e8f0">${activityTitle}</strong></p>
    <p>You've earned <strong style="color:#4ade80">+${pointsEarned} points</strong> for this activity.</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/app/activities">View Activities</a>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: 'Activity approved — points added!', html })
}

// ── Activity rejected notification ───────────────────────────────────────────
export async function sendActivityRejectedEmail(
  to: string,
  name: string,
  activityTitle: string,
  reason: string,
): Promise<void> {
  const html = baseTemplate('Activity update', `
    <p>Hi ${name},</p>
    <p>Unfortunately your activity could not be approved:</p>
    <p><strong style="color:#e2e8f0">${activityTitle}</strong></p>
    <p style="color:#f87171">Reason: ${reason}</p>
    <p>If you believe this is a mistake, please contact your center admin or log a new activity.</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/app/activities">Go to Activities</a>
  `)

  await resend?.emails.send({ from: FROM_EMAIL, to, subject: 'Activity review update', html })
}
