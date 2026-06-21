import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

// Allowlisted checkout types. Must match webhook handler.
const ALLOWED_TYPES = ['session', 'court_booking'] as const
type CheckoutType = (typeof ALLOWED_TYPES)[number]

// POST /api/checkout/session
// Body: { type: CheckoutType, referenceId: string, priceAmount: number (cents), description?: string }
//
// NOTE: priceAmount is currently client-supplied because CourtBooking has no pre-checkout
// price field. When Phase 3 adds server-side pricing, remove priceAmount from the request
// body and derive unit_amount from the stored booking record instead.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey)
      return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 })

    const body = await req.json()
    const { type, referenceId, priceAmount, description } = body

    // Validate type against allowlist
    if (!ALLOWED_TYPES.includes(type as CheckoutType))
      return NextResponse.json({ error: 'Invalid checkout type.' }, { status: 400 })

    // Validate referenceId is present and a non-empty string
    if (typeof referenceId !== 'string' || !referenceId.trim())
      return NextResponse.json({ error: 'Invalid reference.' }, { status: 400 })

    // Validate price is a safe integer and meets Stripe's minimum
    if (typeof priceAmount !== 'number' || !Number.isInteger(priceAmount) || priceAmount < 50)
      return NextResponse.json({ error: 'Invalid price.' }, { status: 400 })

    // Server-side ownership check: verify the referenced entity belongs to the current user
    if (type === 'court_booking') {
      const booking = await prisma.courtBooking.findFirst({
        where: { id: referenceId, userId: user.id },
        select: { id: true },
      })
      if (!booking)
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    // Use server-configured base URL only — never trust the Origin header for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: typeof description === 'string' ? description : 'Garrincha Active' },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      metadata: { userId: user.id, type: type as string, referenceId },
      success_url: `${appUrl}/app/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/sessions`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return catchApiError(err)
  }
}
