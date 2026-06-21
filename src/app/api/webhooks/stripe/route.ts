import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!secret || !sig || !stripeKey) return NextResponse.json({ error: 'Misconfigured' }, { status: 400 })

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, type, referenceId } = session.metadata ?? {}

    if (type === 'court_booking' && referenceId) {
      await prisma.courtBooking.updateMany({
        where: { id: referenceId, userId },
        data: { status: 'CONFIRMED', pricePaid: session.amount_total ? String(session.amount_total / 100) as unknown as never : undefined },
      })
    }

    if (type === 'session' && referenceId) {
      // Session already registered — just confirm payment recorded
      // Could store paymentId on SessionParticipant in the future
    }
  }

  return NextResponse.json({ received: true })
}
