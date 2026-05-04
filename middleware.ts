import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

const publicRoutes = ['/login']
const protectedRoutes = ['/dashboard']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route))
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))

  const cookie = request.cookies.get('session')?.value
  const session = cookie ? await decrypt(cookie) : null

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  if (isPublicRoute && session && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
  }

  if (path === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
  }

  if (path === '/' && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
