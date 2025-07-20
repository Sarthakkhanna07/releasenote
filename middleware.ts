import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

import { 
  addSecurityHeaders, 
  apiRateLimit, 
  authRateLimit, 
  publicRateLimit,
  getClientIP,
  logSecurityEvent 
} from './lib/security'

// Protected routes that require authentication
const protectedRoutes = [
  '/releases',
  '/settings',
  '/integrations',
  '/configuration',
  '/ai-context',
  '/templates'
]

// API routes that need rate limiting
const apiRoutes = [
  '/api/ai',
  '/api/github',
  '/api/integrations',
  '/api/release-notes'
]

// Auth routes with stricter rate limiting
const authRoutes = [
  '/api/auth',
  '/login',
  '/signup'
]

// Public routes with basic rate limiting
const publicRoutes = [
  '/notes'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Add security headers to all responses
  addSecurityHeaders(response)

  // Apply rate limiting based on route type
  let rateLimitResult: { success: boolean; error?: string } = { success: true }

  if (authRoutes.some(route => pathname.startsWith(route))) {
    rateLimitResult = await authRateLimit(request)
  } else if (apiRoutes.some(route => pathname.startsWith(route))) {
    rateLimitResult = await apiRateLimit(request)
  } else if (publicRoutes.some(route => pathname.startsWith(route))) {
    rateLimitResult = await publicRateLimit(request)
  }

  // Handle rate limit exceeded
  if (!rateLimitResult.success) {
    logSecurityEvent({
      type: 'rate_limit',
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      details: { path: pathname }
    })

    return new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded', 
        message: 'Too many requests. Please try again later.' 
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900' // 15 minutes
        }
      }
    )
  }

  // Check for protected routes (including root dashboard)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    try {
      const supabase = createMiddlewareClient({ req: request, res: response })
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Add user context to response headers (for logging)
      response.headers.set('X-User-ID', session.user.id)
      
    } catch (error) {
      console.error('Middleware auth error:', error)
      
      // Log security event
      logSecurityEvent({
        type: 'suspicious_activity',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: { 
          path: pathname,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Add API-specific headers
    response.headers.set('X-API-Version', '1.0')
    response.headers.set('X-Request-ID', crypto.randomUUID())
    
    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Invalid Content-Type', 
            message: 'Content-Type must be application/json' 
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }

  // Handle public release notes pages
  if (pathname.startsWith('/notes/')) {
    // Add caching headers for public pages
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    response.headers.set('Vary', 'Accept-Encoding')
  }

  // Block suspicious requests
  const userAgent = request.headers.get('user-agent') || ''
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scraper/i,
    /spider/i,
    /curl/i,
    /wget/i
  ]

  // Allow legitimate bots but block suspicious ones
  const isLegitimateBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(userAgent)
  const isSuspiciousBot = suspiciousPatterns.some(pattern => pattern.test(userAgent)) && !isLegitimateBot

  if (isSuspiciousBot && !pathname.startsWith('/notes/')) {
    logSecurityEvent({
      type: 'suspicious_activity',
      ip: getClientIP(request),
      userAgent,
      details: { 
        path: pathname,
        reason: 'Suspicious user agent'
      }
    })

    return new NextResponse('Forbidden', { status: 403 })
  }

  // Log access for monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(`${request.method} ${pathname} - ${getClientIP(request)} - ${userAgent}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 