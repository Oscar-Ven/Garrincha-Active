import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis =
  upstashUrl && upstashToken ? new Redis({ url: upstashUrl, token: upstashToken }) : null

// 10 requests per 60 seconds — auth endpoints
export const authRatelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:auth' })
  : null

// 3 OTP sends per 10 minutes — prevent SMS flooding
export const otpRatelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '10 m'), prefix: 'rl:otp' })
  : null

// 5 auction bids per 60 seconds per user — prevent bid-spam
export const auctionBidRatelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s'), prefix: 'rl:bid' })
  : null

// 3 geo check-in attempts per 30 seconds per user — prevent race-condition abuse
export const checkinRatelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '30 s'), prefix: 'rl:checkin' })
  : null

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!limiter) return { allowed: true, remaining: 999 }
  const { success, remaining } = await limiter.limit(identifier)
  return { allowed: success, remaining }
}
