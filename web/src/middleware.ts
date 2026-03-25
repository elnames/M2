import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= limit) return false
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'

  const isApi = pathname.startsWith('/api/')
  const allowed = rateLimit(ip, isApi ? 30 : 200, 60_000)
  if (!allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  // Protect dashboard & admin routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const user = session.user as any

    // Redirect admin
    if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Onboarding gate for EXPLORADOR users
    if (
      user.plan === 'EXPLORADOR' &&
      !user.onboardingDone &&
      !pathname.startsWith('/onboarding')
    ) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Protect onboarding — must be logged in
  if (pathname.startsWith('/onboarding')) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
