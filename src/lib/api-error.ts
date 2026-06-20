import { NextResponse } from 'next/server'

/**
 * Throw this inside route handlers to send a specific message to the client.
 * All other errors are treated as opaque 500s — their message is never forwarded.
 */
export class ApiError extends Error {
  constructor(public readonly message: string, public readonly status: number = 400) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function catchApiError(err: unknown): NextResponse {
  // ApiError is intentional — safe to forward to the client
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  // Everything else: log server-side, return generic message to client
  console.error('[API]', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
